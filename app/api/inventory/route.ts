import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// CREATE product
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { salonId, name, description, category, sku, quantity, minStock, unitPrice, supplierId } = body;

  if (!salonId || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Verify ownership
  const salon = await prisma.salon.findFirst({ where: { id: salonId, ownerId: session.user.id } });
  if (!salon) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const product = await prisma.product.create({
    data: {
      name,
      description: description || null,
      category: category || "General",
      sku: sku || null,
      quantity: quantity || 0,
      minStock: minStock || 5,
      unitPrice: unitPrice || 0,
      salonId,
      supplierId: supplierId || null,
    },
  });

  return NextResponse.json({ success: true, product });
}

// UPDATE product quantity
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, quantityDelta } = body;

  if (!id || quantityDelta === undefined) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id },
    include: { salon: true },
  });

  if (!product || product.salon.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newQuantity = Math.max(0, product.quantity + quantityDelta);

  const updated = await prisma.product.update({
    where: { id },
    data: { quantity: newQuantity },
  });

  return NextResponse.json({ success: true, product: updated });
}
