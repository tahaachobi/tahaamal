import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ClientsCRM } from "@/components/dashboard/clients-crm";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          suppliers: true,
          bookings: {
            include: {
              user: true,
              service: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  // Aggregate unique clients from bookings
  const clientMap = new Map<string, {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    loyaltyPoints: number;
    trustStars: number;
    totalBookings: number;
    completedBookings: number;
    totalSpent: number;
    lastVisit: string | null;
  }>();

  for (const b of salon.bookings) {
    const existing = clientMap.get(b.user.id);
    const spent = b.finalPrice || b.originalPrice;
    if (existing) {
      existing.totalBookings += 1;
      if (b.status === "COMPLETED") existing.completedBookings += 1;
      existing.totalSpent += spent;
      if (!existing.lastVisit || b.date.toISOString() > existing.lastVisit) {
        existing.lastVisit = b.date.toISOString();
      }
    } else {
      clientMap.set(b.user.id, {
        id: b.user.id,
        name: b.user.name,
        email: b.user.email,
        phone: b.user.phone,
        loyaltyPoints: b.user.loyaltyPoints,
        trustStars: b.user.trustStars,
        totalBookings: 1,
        completedBookings: b.status === "COMPLETED" ? 1 : 0,
        totalSpent: spent,
        lastVisit: b.date.toISOString(),
      });
    }
  }

  const clients = Array.from(clientMap.values()).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );

  const suppliers = salon.suppliers.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email ?? "",
    phone: s.phone ?? "",
    category: "Fournisseur",
    createdAt: s.createdAt.toISOString()
  }));

  return <ClientsCRM salonId={salon.id} clients={clients} suppliers={suppliers} />;
}
