import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, status, staffId, resourceId } = body;

    if (!id || !status) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    const updateData: Record<string, string | null> = { status };
    if (staffId !== undefined) updateData.staffId = staffId || null;
    if (resourceId !== undefined) updateData.resourceId = resourceId || null;

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
