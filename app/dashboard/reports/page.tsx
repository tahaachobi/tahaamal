import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          bookings: {
            include: { user: true, service: true, staff: true, resource: true },
            orderBy: { date: "desc" },
            take: 200,
          },
          staff: { where: { role: { not: "CLIENT" } } },
          services: true,
          resources: true,
          cashSessions: {
            include: {
              transactions: true,
              movements: true,
            },
            orderBy: { openedAt: "desc" },
            take: 30,
          },
        },
      },
    },
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  // Aggregate data
  const bookingsData = salon.bookings.map(b => ({
    id: b.id,
    date: b.date.toISOString(),
    status: b.status,
    serviceName: b.service.name,
    staffName: b.staff?.name || "Unassigned",
    resourceName: b.resource?.name || "—",
    clientName: b.user.name,
    originalPrice: b.originalPrice,
    finalPrice: b.finalPrice,
    discountAmount: b.discountAmount,
  }));

  const staffData = salon.staff.map(s => ({ id: s.id, name: s.name, role: s.role }));


  const cashData = salon.cashSessions.map(cs => ({
    id: cs.id,
    openedAt: cs.openedAt.toISOString(),
    closedAt: cs.closedAt?.toISOString() || null,
    status: cs.status,
    openingFloat: cs.openingFloat,
    totalCash: cs.totalCash,
    totalCard: cs.totalCard,
    transactions: cs.transactions.map(t => ({
      id: t.id,
      method: t.method,
      amount: t.amount,
      createdAt: t.createdAt.toISOString(),
    })),
    movements: cs.movements.map(m => ({
      id: m.id,
      type: m.type,
      amount: m.amount,
      note: m.note,
      createdAt: m.createdAt.toISOString(),
    })),
  }));

  return (
    <AnalyticsDashboard
      salonName={salon.name}
      bookings={bookingsData}
      staff={staffData}
      cashSessions={cashData}
    />
  );
}
