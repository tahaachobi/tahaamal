import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { salonId, staffId, action } = body;

    if (!salonId || !staffId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (action === "CLOCK_IN") {
      const newSession = await prisma.staffSession.create({
        data: { salonId, staffId }
      });
      return NextResponse.json({ success: true, session: newSession });
    } else if (action === "CLOCK_OUT") {
      const activeSession = await prisma.staffSession.findFirst({
        where: { staffId, salonId, clockOut: null },
      });
      if (activeSession) {
        await prisma.staffSession.update({
          where: { id: activeSession.id },
          data: { clockOut: new Date(), status: "OFF_DUTY" }
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
