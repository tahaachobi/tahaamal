import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  BookingStatus,
  ClientConfirmationStage,
  NotificationType,
  Role,
} from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { createNotifications } from "@/lib/booking-communication";
import { canOwnerMarkNoShow } from "@/lib/owner-booking";
import prisma from "@/lib/prisma";
import { serializeBookingDate } from "@/lib/booking";
import { sendBookingStatusEmail } from "@/lib/mail";
import { sendBookingStatusWhatsApp } from "@/lib/whatsapp";

type BookingUpdatePayload = {
  status?: BookingStatus;
};

const allowedOwnerStatuses = new Set<BookingStatus>([
  BookingStatus.CONFIRMED,
  BookingStatus.CANCELLED,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
]);

type RouteProps = {
  params: {
    bookingId: string;
  };
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (session.user.role !== Role.SALON_OWNER) {
    return NextResponse.json(
      { error: "Only salon owners can manage booking statuses." },
      { status: 403 },
    );
  }

  const payload = (await request.json()) as BookingUpdatePayload;

  if (!payload.status || !allowedOwnerStatuses.has(payload.status)) {
    return NextResponse.json(
      {
        error:
          "Bookings can only be updated to confirmed, cancelled, completed, or no-show.",
      },
      { status: 400 },
    );
  }

  const nextStatus = payload.status;

  const booking = await prisma.booking.findFirst({
    where: {
      id: params.bookingId,
      salon: {
        ownerId: session.user.id,
      },
    },
    include: {
      salon: {
        select: {
          name: true,
          slug: true,
        },
      },
      service: {
        select: {
          name: true,
          loyaltyPoints: true,
        },
      },
      user: {
        select: {
          email: true,
          loyaltyPoints: true,
          name: true,
          phone: true,
          trustStars: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.COMPLETED ||
    booking.status === BookingStatus.NO_SHOW
  ) {
    return NextResponse.json(
      {
        error:
          "This booking is already closed and cannot be changed again from the dashboard.",
      },
      { status: 400 },
    );
  }

  if (
    nextStatus === BookingStatus.CONFIRMED &&
    booking.status !== BookingStatus.PENDING
  ) {
    return NextResponse.json(
      {
        error: "Only pending bookings can be confirmed.",
      },
      { status: 400 },
    );
  }

  if (
    nextStatus === BookingStatus.CANCELLED &&
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.CONFIRMED
  ) {
    return NextResponse.json(
      {
        error: "Only pending or confirmed bookings can be cancelled.",
      },
      { status: 400 },
    );
  }

  if (
    nextStatus === BookingStatus.NO_SHOW &&
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.CONFIRMED
  ) {
    return NextResponse.json(
      {
        error: "Only pending or confirmed bookings can be marked as no-show.",
      },
      { status: 400 },
    );
  }

  if (
    nextStatus === BookingStatus.NO_SHOW &&
    !canOwnerMarkNoShow(booking.date, booking.startTime)
  ) {
    return NextResponse.json(
      {
        error:
          "No-show can only be marked after the booking has been late for at least 20 minutes.",
      },
      { status: 400 },
    );
  }

  if (
    nextStatus === BookingStatus.COMPLETED &&
    booking.status !== BookingStatus.CONFIRMED
  ) {
    return NextResponse.json(
      {
        error: "Only confirmed bookings can be marked as completed.",
      },
      { status: 400 },
    );
  }

  const updatedBooking = await prisma.$transaction(async (transaction) => {
    const noShowPenalty =
      nextStatus === BookingStatus.NO_SHOW
        ? Math.min(
            booking.user.loyaltyPoints,
            Math.max(booking.service.loyaltyPoints, 0),
          )
        : 0;

    const nextBooking = await transaction.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        clientConfirmationStage:
          nextStatus === BookingStatus.COMPLETED ||
          nextStatus === BookingStatus.NO_SHOW
            ? ClientConfirmationStage.FINAL_CONFIRMED
            : booking.clientConfirmationStage,
        finalConfirmedAt:
          nextStatus === BookingStatus.COMPLETED ||
          nextStatus === BookingStatus.NO_SHOW
            ? booking.finalConfirmedAt ?? new Date()
            : booking.finalConfirmedAt,
        status: nextStatus,
      },
      include: {
        service: {
          select: {
            name: true,
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

    await createNotifications(transaction, [
      {
        bookingId: booking.id,
        message: `Your booking at ${booking.salon.name} is now ${nextStatus.toLowerCase()}.`,
        title: "Owner updated your booking",
        type: NotificationType.BOOKING_STATUS,
        userId: nextBooking.user.id,
      },
    ]);

    if (noShowPenalty > 0) {
      await transaction.user.update({
        where: {
          id: nextBooking.user.id,
        },
        data: {
          loyaltyPoints: {
            decrement: noShowPenalty,
          },
        },
      });

      await createNotifications(transaction, [
        {
          bookingId: booking.id,
          message: `${noShowPenalty} loyalty points were removed because the booking was marked as no-show for ${booking.service.name}.`,
          title: "No-show loyalty penalty",
          type: NotificationType.LOYALTY_UPDATE,
          userId: nextBooking.user.id,
        },
      ]);

      await transaction.auditLog.create({
        data: {
          action: "LOYALTY_POINTS_NO_SHOW_PENALTY",
          details: JSON.stringify({
            balanceAfter: booking.user.loyaltyPoints - noShowPenalty,
            bookingDate: serializeBookingDate(booking.date),
            bookingId: booking.id,
            nextBalance: booking.user.loyaltyPoints - noShowPenalty,
            penaltyPoints: noShowPenalty,
            previousBalance: booking.user.loyaltyPoints,
            serviceName: booking.service.name,
            source: "SYSTEM_NO_SHOW",
          }),
          entity: "User",
          entityId: nextBooking.user.id,
          salonId: booking.salonId,
          userId: session.user.id,
        },
      });
    }

    const noShowCount = await transaction.booking.count({
      where: {
        status: BookingStatus.NO_SHOW,
        userId: nextBooking.user.id,
      },
    });

    const syncedUser = await transaction.user.update({
      where: {
        id: nextBooking.user.id,
      },
      data: {
        trustStars: Math.max(1, Math.min(5, 5 - noShowCount)),
      },
      select: {
        loyaltyPoints: true,
        trustStars: true,
      },
    });

    return {
      ...nextBooking,
      user: {
        ...nextBooking.user,
        loyaltyPoints: syncedUser.loyaltyPoints,
        trustStars: syncedUser.trustStars,
      },
    };
  });

  revalidatePath("/dashboard");
  revalidatePath("/account");
  revalidatePath(`/salon/${booking.salon.slug}`);

  void sendBookingStatusEmail({
    clientEmail: updatedBooking.user.email,
    clientName: updatedBooking.user.name,
    date: serializeBookingDate(updatedBooking.date),
    endTime: updatedBooking.endTime,
    nextStatus: updatedBooking.status,
    salonName: booking.salon.name,
    salonSlug: booking.salon.slug,
    serviceName: updatedBooking.service.name,
    startTime: updatedBooking.startTime,
    status: updatedBooking.status,
  }).catch((mailError) => {
    console.error("Failed to send booking status email", mailError);
  });

  void sendBookingStatusWhatsApp({
    clientName: updatedBooking.user.name,
    clientPhone: updatedBooking.user.phone,
    date: serializeBookingDate(updatedBooking.date),
    endTime: updatedBooking.endTime,
    nextStatus: updatedBooking.status,
    salonName: booking.salon.name,
    salonSlug: booking.salon.slug,
    serviceName: updatedBooking.service.name,
    startTime: updatedBooking.startTime,
  }).catch((whatsAppError) => {
    console.error("Failed to send booking status WhatsApp", whatsAppError);
  });

  return NextResponse.json({
    ok: true,
    booking: {
      appliedPromoCode: updatedBooking.appliedPromoCode,
      clientEmail: updatedBooking.user.email,
      clientName: updatedBooking.user.name,
      clientPhone: updatedBooking.user.phone,
      clientConfirmationStage: updatedBooking.clientConfirmationStage,
      createdAt: updatedBooking.createdAt.toISOString(),
      clientLoyaltyPoints: updatedBooking.user.loyaltyPoints,
      clientTrustStars: updatedBooking.user.trustStars,
      date: serializeBookingDate(updatedBooking.date),
      discountAmount: updatedBooking.discountAmount,
      endTime: updatedBooking.endTime,
      finalConfirmedAt: updatedBooking.finalConfirmedAt?.toISOString() ?? null,
      finalPrice: updatedBooking.finalPrice,
      firstConfirmedAt: updatedBooking.firstConfirmedAt?.toISOString() ?? null,
      id: updatedBooking.id,
      originalPrice: updatedBooking.originalPrice,
      reminderSentAt: updatedBooking.reminderSentAt?.toISOString() ?? null,
      serviceName: updatedBooking.service.name,
      startTime: updatedBooking.startTime,
      status: updatedBooking.status,
    },
  });
}
