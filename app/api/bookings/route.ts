import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import {
  BookingStatus,
  ClientConfirmationStage,
  NotificationType,
  ChairState,
  Role,
} from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dispatchLunaEvent, LunaEvent } from "@/lib/events/event-dispatcher";
import {
  createNotifications,
} from "@/lib/booking-communication";
import { formatConfirmationStage } from "@/lib/booking-confirmation";
import prisma from "@/lib/prisma";
import {
  buildPricingSummary,
  resolveApplicablePromoCode,
} from "@/lib/promo";
import {
  bookingDateFromString,
  generateAvailableSlots,
  hashAdvisoryLockPart,
  normalizeBookingDateInput,
} from "@/lib/booking";
import { sendBookingReceiptEmail, sendOwnerBookingAlertEmail } from "@/lib/mail";
import {
  sendBookingReceiptWhatsApp,
  sendOwnerBookingAlertWhatsApp,
} from "@/lib/whatsapp";

type BookingPayload = {
  date?: string;
  promoCode?: string;
  salonSlug?: string;
  serviceId?: string;
  startTime?: string;
};

class BookingConflictError extends Error {}
class BookingValidationError extends Error {}

function normalizeStartTime(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please sign in before creating a booking." },
      { status: 401 },
    );
  }

  try {
    const payload = (await request.json()) as BookingPayload;
    const salonSlug =
      typeof payload.salonSlug === "string" ? payload.salonSlug.trim() : "";
    const serviceId =
      typeof payload.serviceId === "string" ? payload.serviceId.trim() : "";
    const dateInput = normalizeBookingDateInput(payload.date);
    const startTime = normalizeStartTime(payload.startTime);
    const promoCode =
      typeof payload.promoCode === "string" ? payload.promoCode : "";

    if (!salonSlug || !serviceId || !dateInput || !startTime) {
      return NextResponse.json(
        {
          error:
            "Booking requests need a salon slug, service, booking date, and start time.",
        },
        { status: 400 },
      );
    }

    const salon = await prisma.salon.findUnique({
      where: { slug: salonSlug },
      select: {
        contactPhone: true,
        id: true,
        name: true,
        owner: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
        whatsappPhone: true,
        slug: true,
        workingHours: true,
      },
    });

    if (!salon) {
      return NextResponse.json({ error: "Salon not found." }, { status: 404 });
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        salonId: salon.id,
      },
      select: {
        duration: true,
        id: true,
        name: true,
        price: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found for this salon." },
        { status: 404 },
      );
    }

    const bookingDate = bookingDateFromString(dateInput);
    const lockPartA = hashAdvisoryLockPart(salon.id);
    const lockPartB = hashAdvisoryLockPart(dateInput);

    const booking = await prisma.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${lockPartA}, ${lockPartB})`;

        const existingBookings = await transaction.booking.findMany({
          where: {
            salonId: salon.id,
            date: bookingDate,
            status: {
              not: BookingStatus.CANCELLED,
            },
          },
          select: {
            endTime: true,
            startTime: true,
            status: true,
          },
        });

        const slots = generateAvailableSlots({
          bookings: existingBookings,
          date: bookingDate,
          durationMinutes: service.duration,
          workingHours: salon.workingHours,
        });

        const selectedSlot = slots.find((slot) => slot.startTime === startTime);

        if (!selectedSlot) {
          throw new BookingConflictError(
            "This time slot is no longer available. Please choose another one.",
          );
        }

        // ─── BOOKING CONCURRENCY ENGINE & ALLOCATION ───
        // 1. Fetch styling stations (chairs)
        const resources = await transaction.resource.findMany({
          where: {
            salonId: salon.id,
            type: "CHAIR",
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (resources.length === 0) {
          throw new BookingValidationError(
            "No active styling chairs or stations are configured in this salon yet."
          );
        }

        // 2. Fetch salon stylists
        const stylists = await transaction.user.findMany({
          where: {
            salonId: salon.id,
            role: Role.STAFF,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (stylists.length === 0) {
          throw new BookingValidationError(
            "No stylists are registered or active in this salon yet."
          );
        }

        // 3. Query overlapping active bookings
        const activeOverlappingBookings = await transaction.booking.findMany({
          where: {
            salonId: salon.id,
            date: bookingDate,
            status: {
              not: BookingStatus.CANCELLED,
            },
            OR: [
              {
                startTime: { lt: selectedSlot.endTime },
                endTime: { gt: selectedSlot.startTime },
              },
            ],
          },
          select: {
            resourceId: true,
            staffId: true,
          },
        });

        // 4. Determine busy entities and exclude them
        const occupiedResourceIds = new Set(
          activeOverlappingBookings.map((b) => b.resourceId).filter(Boolean)
        );
        const busyStaffIds = new Set(
          activeOverlappingBookings.map((b) => b.staffId).filter(Boolean)
        );

        const availableResource = resources.find((r) => !occupiedResourceIds.has(r.id));
        const availableStaff = stylists.find((s) => !busyStaffIds.has(s.id));

        if (!availableResource) {
          throw new BookingConflictError(
            "All styling chairs and stations are fully occupied during this slot. Please choose another time."
          );
        }

        if (!availableStaff) {
          throw new BookingConflictError(
            "All salon stylists are fully booked during this slot. Please choose another time."
          );
        }

        const promoResult = await resolveApplicablePromoCode({
          client: transaction,
          code: promoCode,
          salonId: salon.id,
          userId: session.user.id,
        });

        if (promoResult.error) {
          throw new BookingValidationError(promoResult.error);
        }

        const pricingSummary = buildPricingSummary({
          basePrice: service.price,
          promo: promoResult.promo,
        });

        const createdBooking = await transaction.booking.create({
          data: {
            appliedPromoCode: pricingSummary.appliedPromoCode,
            clientConfirmationStage:
              ClientConfirmationStage.AWAITING_FIRST_CONFIRMATION,
            date: bookingDate,
            discountAmount: pricingSummary.discountAmount,
            endTime: selectedSlot.endTime,
            finalPrice: pricingSummary.finalPrice,
            firstConfirmationSentAt: new Date(),
            originalPrice: pricingSummary.originalPrice,
            promoCodeId: pricingSummary.promoCodeId,
            salonId: salon.id,
            serviceId: service.id,
            startTime: selectedSlot.startTime,
            status: BookingStatus.PENDING,
            userId: session.user.id,
            resourceId: availableResource.id,
            staffId: availableStaff.id,
          },
          include: {
            service: {
              select: {
                name: true,
              },
            },
            promoCode: {
              select: {
                code: true,
              },
            },
          },
        });

        // 5. Automatically record ChairTimeline reservation
        await transaction.chairTimeline.create({
          data: {
            salonId: salon.id,
            resourceId: availableResource.id,
            bookingId: createdBooking.id,
            staffId: availableStaff.id,
            state: ChairState.RESERVED,
          },
        });

        await createNotifications(transaction, [
          {
            bookingId: createdBooking.id,
            message: `Your booking at ${salon.name} is saved. Open your account to send the first confirmation.`,
            title: "Booking request created",
            type: NotificationType.BOOKING_CREATED,
            userId: session.user.id,
          },
          {
            bookingId: createdBooking.id,
            message: `${session.user.name ?? "A client"} created a booking request for ${dateInput} at ${selectedSlot.startTime}.`,
            title: "New booking request",
            type: NotificationType.BOOKING_CREATED,
            userId: salon.owner.id,
          },
        ]);

        return createdBooking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    dispatchLunaEvent(LunaEvent.BookingCreated, {
      bookingId: booking.id,
      salonId: salon.id,
      userId: session.user.id,
      serviceName: booking.service.name,
      price: booking.finalPrice,
      dateTime: dateInput + " " + booking.startTime,
    });

    revalidatePath("/dashboard");
    revalidatePath(`/salon/${salon.slug}`);

    if (session.user.email && session.user.name) {
      void sendBookingReceiptEmail({
        clientEmail: session.user.email,
        clientName: session.user.name,
        date: dateInput,
        endTime: booking.endTime,
        salonName: salon.name,
        salonSlug: salon.slug,
        serviceName: booking.service.name,
        startTime: booking.startTime,
        status: booking.status,
      }).catch((mailError) => {
        console.error("Failed to send booking receipt email", mailError);
      });
    }

    void sendBookingReceiptWhatsApp({
      clientName: session.user.name ?? "Client",
      clientPhone: session.user.phone ?? null,
      date: dateInput,
      endTime: booking.endTime,
      salonName: salon.name,
      salonSlug: salon.slug,
      serviceName: booking.service.name,
      startTime: booking.startTime,
    }).catch((whatsAppError) => {
      console.error("Failed to send booking receipt WhatsApp", whatsAppError);
    });

    if (salon.owner.email && salon.owner.name) {
      void sendOwnerBookingAlertEmail({
        clientEmail: session.user.email ?? "unknown@client.local",
        clientName: session.user.name ?? "Client",
        date: dateInput,
        endTime: booking.endTime,
        ownerEmail: salon.owner.email,
        ownerName: salon.owner.name,
        salonName: salon.name,
        salonSlug: salon.slug,
        serviceName: booking.service.name,
        startTime: booking.startTime,
      }).catch((mailError) => {
        console.error("Failed to send owner booking alert email", mailError);
      });
    }

    void sendOwnerBookingAlertWhatsApp({
      clientEmail: session.user.email ?? "unknown@client.local",
      clientName: session.user.name ?? "Client",
      clientPhone: session.user.phone ?? null,
      date: dateInput,
      endTime: booking.endTime,
      ownerName: salon.owner.name ?? "Owner",
      ownerPhone: salon.whatsappPhone ?? salon.contactPhone ?? null,
      salonName: salon.name,
      salonSlug: salon.slug,
      serviceName: booking.service.name,
      startTime: booking.startTime,
    }).catch((whatsAppError) => {
      console.error("Failed to send owner booking alert WhatsApp", whatsAppError);
    });

    return NextResponse.json(
      {
        ok: true,
        booking: {
          clientConfirmationStage: booking.clientConfirmationStage,
          date: dateInput,
          discountAmount: booking.discountAmount,
          endTime: booking.endTime,
          finalPrice: booking.finalPrice,
          id: booking.id,
          originalPrice: booking.originalPrice,
          appliedPromoCode: booking.appliedPromoCode,
          confirmationLabel: formatConfirmationStage(
            booking.clientConfirmationStage,
          ),
          serviceName: booking.service.name,
          startTime: booking.startTime,
          status: booking.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to create booking", error);

    return NextResponse.json(
      {
        error: "We could not create the booking. Please try again.",
      },
      { status: 500 },
    );
  }
}
