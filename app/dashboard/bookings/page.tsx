import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BookingPipeline } from "@/components/dashboard/booking-pipeline";

export default async function BookingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          bookings: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setDate(new Date().getDate() + 7))
              }
            },
            include: {
              user: true,
              service: true,
              staff: true,
              resource: true
            },
            orderBy: { date: "asc" }
          },
          staff: { where: { role: { not: "CLIENT" } } },
          resources: true
        }
      }
    }
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  const formattedBookings = salon.bookings.map(b => ({
    id: b.id,
    clientName: b.user.name,
    serviceName: b.service.name,
    date: b.date.toISOString(),
    startTime: b.startTime,
    status: b.status,
    staffName: b.staff?.name || "Unassigned",
    resourceName: b.resource?.name || "Unassigned",
    price: b.finalPrice || b.originalPrice
  }));

  return (
    <BookingPipeline 
      salonId={salon.id} 
      bookings={formattedBookings} 
      staff={salon.staff.map(s => ({ id: s.id, name: s.name }))}
      resources={salon.resources.map(r => ({ id: r.id, name: r.name }))}
    />
  );
}
