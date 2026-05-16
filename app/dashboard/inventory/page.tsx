import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InventoryPanel } from "@/components/dashboard/inventory-panel";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          products: {
            include: { supplier: { select: { id: true, name: true } } },
            orderBy: { name: "asc" },
          },
          suppliers: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        },
      },
    },
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  const products = salon.products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    sku: p.sku,
    quantity: p.quantity,
    minStock: p.minStock,
    unitPrice: p.unitPrice,
    supplierName: p.supplier?.name || null,
    supplierId: p.supplier?.id || null,
  }));

  const suppliers = salon.suppliers.map(s => ({ id: s.id, name: s.name }));

  return <InventoryPanel salonId={salon.id} products={products} suppliers={suppliers} />;
}
