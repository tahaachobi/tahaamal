import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  BookingStatus,
  ClientConfirmationStage,
  Role,
} from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import {
  notifyClientAction,
} from "@/lib/booking-communication";
import { canClientInteractWithBooking } from "@/lib/booking-confirmation";
import { serializeBookingDate } from "@/lib/booking";
import prisma from "@/lib/prisma";

type ClientBookingAction =
  | "CANCEL_BOOKING"
  | "CONFIRM_ATTENDING"
  | "REQUEST_RESCHEDULE";

type BookingActionPayload = {
  action?: ClientBookingAction;
};

type RouteProps = {
  params: {
    bookingId: string;
  };
};

function serializeBooking(booking: {
  appliedPromoCode: null | string;
  bookingDate: string;
  clientConfirmationStage: ClientConfirmationStage;
  createdAt: Date;
  discountAmount: number;
  endTime: string;
  finalConfirmedAt: Date | null;
  finalPrice: number;
  firstConfirmedAt: Date | null;
  id: string;
  originalPrice: number;
  reminderSentAt: Date | null;
  service: {
    duration: number;
    name: string;
    price: number;
  };
  salon: {
    address: null | string;
    city: null | string;
    contactPhone: null | string;
    latitude: null | number;
    logo: null | string;
    name: string;
    slug: string;
    longitude: null | number;
    whatsappPhone: null | string;
  };
  startTime: string;
  status: BookingStatus;
}) {
  return {
    appliedPromoCode: booking.appliedPromoCode,
    bookingDate: booking.bookingDate,
    clientConfirmationStage: booking.clientConfirmationStage,
    createdAt: booking.createdAt.toISOString(),
    discountAmount: booking.discountAmount,
    endTime: booking.endTime,
    finalConfirmedAt: booking.finalConfirmedAt?.toISOString() ?? null,
    finalPrice: booking.finalPrice,
    firstConfirmedAt: booking.firstConfirmedAt?.toISOString() ?? null,
    id: booking.id,
    originalPrice: booking.originalPrice,
    reminderSentAt: booking.reminderSentAt?.toISOString() ?? null,
    salon: booking.salon,
    service: booking.service,
    startTime: booking.startTime,
    status: booking.status,
  };
}

type UpdatedBookingRecord = {
  appliedPromoCode: null | string;
  clientConfirmationStage: ClientConfirmationStage;
  createdAt: Date;
  date: Date;
  discountAmount: number;
  endTime: string;
  finalConfirmedAt: Date | null;
  finalPrice: number;
  firstConfirmedAt: Date | null;
  id: string;
  originalPrice: number;
  reminderSentAt: Date | null;
  service: {
    duration: number;
    name: string;
    price: number;
  };
  salon: {
    address: null | string;
    city: null | string;
    contactPhone: null | string;
    latitude: null | number;
    logo: null | string;
    longitude: null | number;
    name: string;
    slug: string;
    whatsappPhone: null | string;
  };
  startTime: string;
  status: BookingStatus;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (session.user.role !== Role.CLIENT) {
    return NextResponse.json(
      { error: "Only clients can update their own booking confirmations." },
      { status: 403 },
    );
  }

  const payload = (await request.json()) as BookingActionPayload;

  if (!payload.action) {
    return NextResponse.json(
      { error: "Choose a booking action first." },
      { status: 400 },
    );
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: params.bookingId,
      userId: session.user.id,
    },
    include: {
      salon: {
        select: {
          logo: true,
          name: true,
          address: true,
          city: true,
          contactPhone: true,
          latitude: true,
          owner: {
            select: {
              email: true,
              id: true,
              name: true,
            },
          },
          slug: true,
          longitude: true,
          whatsappPhone: true,
        },
      },
      service: {
        select: {
          duration: true,
          name: true,
          price: true,
        },
      },
      user: {
        select: {
          email: true,
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const bookingDate = serializeBookingDate(booking.date);

  if (!canClientInteractWithBooking(booking.status, bookingDate, booking.endTime)) {
    return NextResponse.json(
      {
        error:
          "This booking is already closed or its service window has passed, so the confirmation flow can no longer change it.",
      },
      { status: 400 },
    );
  }

  let updatedBooking: UpdatedBookingRecord | undefined;
  let actionLabel = "";

  if (payload.action === "CONFIRM_ATTENDING") {
    const isFinalWindow =
      booking.clientConfirmationStage ===
        ClientConfirmationStage.AWAITING_FINAL_CONFIRMATION ||
      booking.reminderSentAt !== null;

    if (booking.clientConfirmationStage === ClientConfirmationStage.FINAL_CONFIRMED) {
      return NextResponse.json(
        { error: "This booking is already fully confirmed from your side." },
        { status: 400 },
      );
    }

    updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        clientConfirmationStage: isFinalWindow
          ? ClientConfirmationStage.FINAL_CONFIRMED
          : ClientConfirmationStage.FIRST_CONFIRMED,
        finalConfirmedAt: isFinalWindow ? new Date() : booking.finalConfirmedAt,
        firstConfirmedAt: booking.firstConfirmedAt ?? new Date(),
      },
      include: {
        salon: {
          select: {
            address: true,
            city: true,
            contactPhone: true,
            latitude: true,
            logo: true,
            name: true,
            slug: true,
            longitude: true,
            whatsappPhone: true,
          },
        },
        service: {
          select: {
            duration: true,
            name: true,
            price: true,
          },
        },
      },
    });
    actionLabel = isFinalWindow ? "Final confirmation" : "I am coming";
  }

  if (payload.action === "REQUEST_RESCHEDULE") {
    updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        clientConfirmationStage: ClientConfirmationStage.RESCHEDULE_REQUESTED,
      },
      include: {
        salon: {
          select: {
            address: true,
            city: true,
            contactPhone: true,
            latitude: true,
            logo: true,
            name: true,
            slug: true,
            longitude: true,
            whatsappPhone: true,
          },
        },
        service: {
          select: {
            duration: true,
            name: true,
            price: true,
          },
        },
      },
    });
    actionLabel = "Need reschedule";
  }

  if (payload.action === "CANCEL_BOOKING") {
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      return NextResponse.json(
        { error: "Only pending or confirmed bookings can be cancelled." },
        { status: 400 },
      );
    }

    updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
      },
      include: {
        salon: {
          select: {
            address: true,
            city: true,
            contactPhone: true,
            latitude: true,
            logo: true,
            name: true,
            slug: true,
            longitude: true,
            whatsappPhone: true,
          },
        },
        service: {
          select: {
            duration: true,
            name: true,
            price: true,
          },
        },
      },
    });
    actionLabel = "Cancel booking";
  }

  if (!updatedBooking) {
    return NextResponse.json(
      { error: "This action could not be applied right now." },
      { status: 400 },
    );
  }

  await notifyClientAction({
    actionLabel,
    bookingDate,
    bookingId: booking.id,
    clientEmail: booking.user.email,
    clientId: booking.user.id,
    clientName: booking.user.name,
    clientPhone: booking.user.phone,
    endTime: booking.endTime,
    ownerEmail: booking.salon.owner.email,
    ownerId: booking.salon.owner.id,
    ownerName: booking.salon.owner.name,
    ownerWhatsAppPhone: booking.salon.whatsappPhone ?? booking.salon.contactPhone,
    salonName: booking.salon.name,
    salonSlug: booking.salon.slug,
    serviceName: booking.service.name,
    startTime: booking.startTime,
  });

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath(`/salon/${booking.salon.slug}`);

  return NextResponse.json({
    ok: true,
    booking: serializeBooking({
      ...updatedBooking,
      bookingDate,
    }),
  });
}
