import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { processDueBookingReminders } from "@/lib/booking-communication";
import prisma from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fdashboard");

  await processDueBookingReminders();

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      staffSessions: {
        where: { clockOut: null },
        take: 1
      },
      ownedSalon: {
        include: {
          _count: { select: { bookings: true, services: true, staff: true, resources: true } },
          staff: {
            include: {
              staffSessions: {
                where: { clockOut: null },
                take: 1
              }
            }
          },
          resources: true,
          bookings: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999))
              }
            },
            include: { service: true, user: true, staff: true, resource: true },
            orderBy: { startTime: "asc" }
          },
        },
      },
    },
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  // Combine staff and owner for "On Duty" logic
  const allStaffMembers = [...salon.staff];
  if (!salon.staff.some(s => s.id === owner.id)) {
    allStaffMembers.push(owner as any);
  }

  // Calculations for KPIs
  const todayBookingsCount = salon.bookings.length;
  const activeStaffCount = allStaffMembers.filter(s => s.staffSessions.length > 0).length;
  
  const completedToday = salon.bookings.filter(b => b.status === "COMPLETED");
  const todayRevenue = completedToday.reduce((sum, b) => sum + b.finalPrice, 0);
  const cashBalance = todayRevenue; 

  // Format data for DashboardOverview
  const staffOnDuty = allStaffMembers
    .filter(s => s.staffSessions.length > 0)
    .map(s => ({
      name: s.name,
      role: s.role,
      clients: salon.bookings.filter(b => b.staffId === s.id).length,
      revenue: `MAD ${salon.bookings.filter(b => b.staffId === s.id && b.status === "COMPLETED").reduce((sum, b) => sum + b.finalPrice, 0).toLocaleString()}`,
      status: "on" as const
    }));

  const recentBookings = salon.bookings.map(b => ({
    name: b.user.name,
    service: b.service.name,
    time: b.startTime,
    status: b.status
  }));

  const resourceStatus = salon.resources.map(r => ({
    name: r.name,
    type: r.type,
    status: r.status.toLowerCase() as any,
    staff: salon.bookings.find(b => b.resourceId === r.id && b.status === "IN_SERVICE")?.staff?.name || "—"
  }));

  return (
    <DashboardOverview 
      salonName={salon.name}
      kpis={{
        revenue: todayRevenue,
        bookings: todayBookingsCount,
        activeStaff: `${activeStaffCount} / ${allStaffMembers.length}`,
        cashBalance: cashBalance
      }}
      staffOnDuty={staffOnDuty}
      recentBookings={recentBookings}
      resourceStatus={resourceStatus}
    />
  );
}
