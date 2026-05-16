import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SuppliersPanel } from "@/components/dashboard/suppliers-panel";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          suppliers: {
            include: {
              _count: { select: { products: true, orders: true } },
            },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  const suppliers = salon.suppliers.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    address: s.address,
    notes: s.notes,
    productCount: s._count.products,
    orderCount: s._count.orders,
    createdAt: s.createdAt.toISOString(),
  }));

  return <SuppliersPanel salonId={salon.id} suppliers={suppliers} />;
}
