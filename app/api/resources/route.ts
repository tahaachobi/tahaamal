import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, type, salonId } = await req.json();

    if (!name || !type || !salonId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const resource = await prisma.resource.create({
      data: { name, type, salonId }
    });

    return NextResponse.json({ success: true, resource });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, status } = await req.json();

    if (!id || !status) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const resource = await prisma.resource.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, resource });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
