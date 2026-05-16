import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { salonId, name, email, phone, address, notes } = body;

  if (!salonId || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const salon = await prisma.salon.findFirst({ where: { id: salonId, ownerId: session.user.id } });
  if (!salon) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supplier = await prisma.supplier.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
      salonId,
    },
  });

  return NextResponse.json({ success: true, supplier });
}
