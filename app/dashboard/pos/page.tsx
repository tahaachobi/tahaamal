import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PosTerminal } from "@/components/dashboard/pos-terminal";
import prisma from "@/lib/prisma";

export default async function PosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          services: {
            orderBy: { name: "asc" },
          },
          staff: {
            where: { role: { not: "SALON_OWNER" } },
            select: { id: true, name: true, role: true },
          },
          cashSessions: {
            where: { status: "OPEN" },
            take: 1,
            orderBy: { openedAt: "desc" }
          }
        },
      },
    },
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  const services = salon.services.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    duration: s.duration,
    description: s.description ?? "",
    loyaltyPoints: s.loyaltyPoints,
  }));

  const staff = salon.staff.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
  }));

  const openSession = salon.cashSessions[0] || null;

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: { id: true, name: true, email: true, loyaltyPoints: true }
  });

  return (
    <PosTerminal
      salonId={salon.id}
      salonName={salon.name}
      services={services}
      staff={staff}
      clients={clients}
      initialSession={openSession}
    />
  );
}
