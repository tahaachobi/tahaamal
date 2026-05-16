import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountHistoryPanel } from "@/components/account/account-history-panel";
import { NotificationPanel } from "@/components/shared/notification-panel";
import { processDueBookingReminders } from "@/lib/booking-communication";
import prisma from "@/lib/prisma";
import { serializeBookingDate } from "@/lib/booking";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Faccount");
  }

  await processDueBookingReminders();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      createdAt: true,
      email: true,
      loyaltyPoints: true,
      name: true,
      phone: true,
      notifications: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      },
      trustStars: true,
      bookings: {
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
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!user) {
    redirect("/login?callbackUrl=%2Faccount");
  }

  const bookings = user.bookings.map((booking) => ({
    id: booking.id,
    bookingDate: serializeBookingDate(booking.date),
    createdAt: booking.createdAt.toISOString(),
    clientConfirmationStage: booking.clientConfirmationStage,
    discountAmount: booking.discountAmount,
    endTime: booking.endTime,
    finalConfirmedAt: booking.finalConfirmedAt?.toISOString() ?? null,
    finalPrice: booking.finalPrice,
    firstConfirmedAt: booking.firstConfirmedAt?.toISOString() ?? null,
    startTime: booking.startTime,
    appliedPromoCode: booking.appliedPromoCode,
    originalPrice: booking.originalPrice,
    reminderSentAt: booking.reminderSentAt?.toISOString() ?? null,
    status: booking.status,
    salon: booking.salon,
    service: booking.service,
  }));

  return (
    <div className="space-y-6">
      <NotificationPanel
        description="Booking updates, reminder windows, and owner responses are all collected here for the client side."
        emptyMessage="No client notifications yet. Once bookings start moving, reminders and owner updates will appear here."
        notifications={
          user.notifications.map((notification) => ({
            createdAt: notification.createdAt.toISOString(),
            id: notification.id,
            message: notification.message,
            title: notification.title,
            type: notification.type,
          })) ?? []
        }
        title="Client notifications"
      />

      <AccountHistoryPanel
        bookings={bookings}
        memberSince={user.createdAt.toISOString()}
        user={{
          email: user.email,
          loyaltyPoints: user.loyaltyPoints,
          name: user.name,
          phone: user.phone,
          trustStars: user.trustStars,
        }}
      />
    </div>
  );
}
