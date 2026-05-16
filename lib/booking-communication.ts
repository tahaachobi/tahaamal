import { Prisma } from "@/app/generated/prisma/client";
import {
  BookingStatus,
  ClientConfirmationStage,
  NotificationType,
} from "@/app/generated/prisma/enums";
import { serializeBookingDate } from "@/lib/booking";
import {
  BOOKING_REMINDER_WINDOW_HOURS,
  getBookingStartDateTime,
} from "@/lib/booking-confirmation";
import {
  sendClientActionEmail,
  sendClientReminderEmail,
  sendOwnerReminderEmail,
} from "@/lib/mail";
import prisma from "@/lib/prisma";
import {
  sendClientActionWhatsApp,
  sendReminderWhatsApp,
} from "@/lib/whatsapp";

type NotificationDraft = {
  bookingId?: null | string;
  message: string;
  title: string;
  type: NotificationType;
  userId: string;
};

type ReminderBooking = {
  bookingDate: string;
  clientEmail: string;
  clientName: string;
  clientPhone: null | string;
  confirmationStage: ClientConfirmationStage;
  endTime: string;
  id: string;
  ownerEmail: string;
  ownerName: string;
  ownerWhatsAppPhone: null | string;
  reminderSentAt: Date | null;
  salonName: string;
  salonSlug: string;
  serviceName: string;
  startTime: string;
  status: BookingStatus;
};

function toLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    (date.getMonth() + 1).toString().padStart(2, "0"),
    date.getDate().toString().padStart(2, "0"),
  ].join("-");
}

export async function createNotifications(
  client: Prisma.TransactionClient,
  drafts: NotificationDraft[],
) {
  if (!drafts.length) {
    return;
  }

  await client.notification.createMany({
    data: drafts.map((draft) => ({
      bookingId: draft.bookingId ?? null,
      message: draft.message,
      title: draft.title,
      type: draft.type,
      userId: draft.userId,
    })),
  });
}

function shouldSendReminder(booking: ReminderBooking, now: Date) {
  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.COMPLETED ||
    booking.status === BookingStatus.NO_SHOW
  ) {
    return false;
  }

  if (
    booking.confirmationStage === ClientConfirmationStage.FINAL_CONFIRMED ||
    booking.confirmationStage === ClientConfirmationStage.RESCHEDULE_REQUESTED
  ) {
    return false;
  }

  if (booking.reminderSentAt) {
    return false;
  }

  const appointmentStart = getBookingStartDateTime(
    booking.bookingDate,
    booking.startTime,
  ).getTime();
  const nowMs = now.getTime();
  const reminderThresholdMs = BOOKING_REMINDER_WINDOW_HOURS * 60 * 60 * 1000;

  return appointmentStart > nowMs && appointmentStart - nowMs <= reminderThresholdMs;
}

export async function processDueBookingReminders() {
  const now = new Date();
  const todayKey = toLocalDateKey(now);

  const dueBookings = await prisma.booking.findMany({
    where: {
      date: {
        gte: new Date(`${todayKey}T00:00:00.000Z`),
      },
      reminderSentAt: null,
      status: {
        in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      },
    },
    include: {
      salon: {
        select: {
          contactPhone: true,
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
        },
      },
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

  for (const booking of dueBookings) {
    const reminderBooking: ReminderBooking = {
      bookingDate: serializeBookingDate(booking.date),
      clientEmail: booking.user.email,
      clientName: booking.user.name,
      clientPhone: booking.user.phone,
      confirmationStage: booking.clientConfirmationStage,
      endTime: booking.endTime,
      id: booking.id,
      ownerEmail: booking.salon.owner.email,
      ownerName: booking.salon.owner.name,
      ownerWhatsAppPhone: booking.salon.whatsappPhone ?? booking.salon.contactPhone,
      reminderSentAt: booking.reminderSentAt,
      salonName: booking.salon.name,
      salonSlug: booking.salon.slug,
      serviceName: booking.service.name,
      startTime: booking.startTime,
      status: booking.status,
    };

    if (!shouldSendReminder(reminderBooking, now)) {
      continue;
    }

    const updateResult = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        reminderSentAt: null,
      },
      data: {
        clientConfirmationStage:
          booking.clientConfirmationStage === ClientConfirmationStage.FINAL_CONFIRMED
            ? ClientConfirmationStage.FINAL_CONFIRMED
            : ClientConfirmationStage.AWAITING_FINAL_CONFIRMATION,
        reminderSentAt: now,
      },
    });

    if (!updateResult.count) {
      continue;
    }

    await prisma.$transaction(async (transaction) => {
      await createNotifications(transaction, [
        {
          bookingId: booking.id,
          message: `Your appointment at ${booking.salon.name} is less than ${BOOKING_REMINDER_WINDOW_HOURS} hours away. Confirm that you are still coming from your account page.`,
          title: "3h booking reminder",
          type: NotificationType.BOOKING_REMINDER,
          userId: booking.user.id,
        },
        {
          bookingId: booking.id,
          message: `${booking.user.name} just entered the final confirmation window for ${serializeBookingDate(booking.date)} at ${booking.startTime}.`,
          title: "Client reminder sent",
          type: NotificationType.BOOKING_REMINDER,
          userId: booking.salon.owner.id,
        },
      ]);
    });

    if (booking.user.email && booking.user.name) {
      await sendClientReminderEmail({
        clientEmail: booking.user.email,
        clientName: booking.user.name,
        date: serializeBookingDate(booking.date),
        endTime: booking.endTime,
        salonName: booking.salon.name,
        salonSlug: booking.salon.slug,
        serviceName: booking.service.name,
        startTime: booking.startTime,
      }).catch((mailError) => {
        console.error("Failed to send client reminder email", mailError);
      });
    }

    if (booking.salon.owner.email && booking.salon.owner.name) {
      await sendOwnerReminderEmail({
        clientName: booking.user.name,
        date: serializeBookingDate(booking.date),
        endTime: booking.endTime,
        ownerEmail: booking.salon.owner.email,
        ownerName: booking.salon.owner.name,
        salonName: booking.salon.name,
        salonSlug: booking.salon.slug,
        serviceName: booking.service.name,
        startTime: booking.startTime,
      }).catch((mailError) => {
        console.error("Failed to send owner reminder email", mailError);
      });
    }

    await sendReminderWhatsApp({
      clientName: booking.user.name,
      date: serializeBookingDate(booking.date),
      endTime: booking.endTime,
      recipientPhone: booking.user.phone,
      role: "client",
      salonName: booking.salon.name,
      salonSlug: booking.salon.slug,
      serviceName: booking.service.name,
      startTime: booking.startTime,
    }).catch((whatsAppError) => {
      console.error("Failed to send client reminder WhatsApp", whatsAppError);
    });

    await sendReminderWhatsApp({
      clientName: booking.user.name,
      date: serializeBookingDate(booking.date),
      endTime: booking.endTime,
      recipientPhone: booking.salon.whatsappPhone ?? booking.salon.contactPhone,
      role: "owner",
      salonName: booking.salon.name,
      salonSlug: booking.salon.slug,
      serviceName: booking.service.name,
      startTime: booking.startTime,
    }).catch((whatsAppError) => {
      console.error("Failed to send owner reminder WhatsApp", whatsAppError);
    });
  }
}

export async function notifyClientAction({
  actionLabel,
  bookingDate,
  bookingId,
  clientEmail,
  clientId,
  clientName,
  clientPhone,
  endTime,
  ownerEmail,
  ownerId,
  ownerName,
  ownerWhatsAppPhone,
  salonName,
  salonSlug,
  serviceName,
  startTime,
}: {
  actionLabel: string;
  bookingDate: string;
  bookingId: string;
  clientEmail: string;
  clientId: string;
  clientName: string;
  clientPhone: null | string;
  endTime: string;
  ownerEmail: string;
  ownerId: string;
  ownerName: string;
  ownerWhatsAppPhone: null | string;
  salonName: string;
  salonSlug: string;
  serviceName: string;
  startTime: string;
}) {
  const notificationType =
    actionLabel === "Need reschedule"
      ? NotificationType.RESCHEDULE_REQUEST
      : actionLabel === "Cancel booking"
        ? NotificationType.BOOKING_STATUS
        : NotificationType.CLIENT_CONFIRMATION;

  await prisma.$transaction(async (transaction) => {
    await createNotifications(transaction, [
      {
        bookingId,
        message: `You updated your booking at ${salonName}: ${actionLabel}.`,
        title: "Booking action saved",
        type: notificationType,
        userId: clientId,
      },
      {
        bookingId,
        message: `${clientName} selected "${actionLabel}" for ${bookingDate} at ${startTime}.`,
        title:
          actionLabel === "Need reschedule"
            ? "Client requested a reschedule"
            : actionLabel === "Cancel booking"
              ? "Client cancelled a booking"
            : "Client updated confirmation",
        type: notificationType,
        userId: ownerId,
      },
    ]);
  });

  await sendClientActionEmail({
    actionLabel,
    bookingRole: "client",
    clientEmail,
    clientName,
    date: bookingDate,
    endTime,
    recipientEmail: clientEmail,
    recipientName: clientName,
    salonName,
    salonSlug,
    serviceName,
    startTime,
  }).catch((mailError) => {
    console.error("Failed to send client action email to client", mailError);
  });

  await sendClientActionEmail({
    actionLabel,
    bookingRole: "owner",
    clientEmail,
    clientName,
    date: bookingDate,
    endTime,
    recipientEmail: ownerEmail,
    recipientName: ownerName,
    salonName,
    salonSlug,
    serviceName,
    startTime,
  }).catch((mailError) => {
    console.error("Failed to send client action email to owner", mailError);
  });

  await sendClientActionWhatsApp({
    actionLabel,
    clientName,
    date: bookingDate,
    endTime,
    recipientPhone: clientPhone,
    role: "client",
    salonName,
    salonSlug,
    serviceName,
    startTime,
  }).catch((whatsAppError) => {
    console.error("Failed to send client action WhatsApp to client", whatsAppError);
  });

  await sendClientActionWhatsApp({
    actionLabel,
    clientName,
    date: bookingDate,
    endTime,
    recipientPhone: ownerWhatsAppPhone,
    role: "owner",
    salonName,
    salonSlug,
    serviceName,
    startTime,
  }).catch((whatsAppError) => {
    console.error("Failed to send client action WhatsApp to owner", whatsAppError);
  });
}
