import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StaffBoard } from "@/components/dashboard/staff-board";

export default async function StaffPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          staff: {
            where: { role: { not: "CLIENT" } },
            include: {
              staffSessions: {
                where: { clockOut: null },
                take: 1
              },
              staffBookings: {
                where: {
                  status: { in: ["PENDING", "ACCEPTED", "CONFIRMED", "ARRIVING", "IN_SERVICE"] },
                  date: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lt: new Date(new Date().setHours(23, 59, 59, 999))
                  }
                },
                include: { service: true }
              }
            }
          }
        }
      }
    }
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  const staffData = salon.staff.map(s => ({
    id: s.id,
    name: s.name,
    role: s.role,
    isClockedIn: s.staffSessions.length > 0,
    activeSessionId: s.staffSessions[0]?.id || null,
    todayBookings: s.staffBookings.length,
    activeBookings: s.staffBookings.filter(b => b.status === "IN_SERVICE").length,
    queue: s.staffBookings.map(b => ({
      id: b.id,
      serviceName: b.service.name,
      time: b.startTime,
      status: b.status,
    }))
  }));

  return <StaffBoard salonId={salon.id} staff={staffData} />;
}
