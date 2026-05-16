import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const salonId = url.searchParams.get("salonId");

    if (!salonId) return NextResponse.json({ error: "Missing salonId" }, { status: 400 });

    const cashSession = await prisma.cashSession.findFirst({
      where: { salonId, status: "OPEN" },
      include: {
        movements: { orderBy: { createdAt: "desc" } }
      },
      orderBy: { openedAt: "desc" },
    });

    return NextResponse.json({ session: cashSession });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, salonId, amount, note } = body; // action: "OPEN", "CLOSE", "CASH_IN", "CASH_OUT"

    if (!salonId) return NextResponse.json({ error: "Missing salonId" }, { status: 400 });

    if (action === "OPEN") {
      const existing = await prisma.cashSession.findFirst({
        where: { salonId, status: "OPEN" },
      });
      if (existing) return NextResponse.json({ error: "Register is already open" }, { status: 400 });

      const newSession = await prisma.cashSession.create({
        data: {
          salonId,
          openingFloat: Number(amount) || 0,
        }
      });
      return NextResponse.json({ success: true, session: newSession });
    }

    // Require an open session for other actions
    const currentSession = await prisma.cashSession.findFirst({
      where: { salonId, status: "OPEN" },
    });

    if (!currentSession) return NextResponse.json({ error: "No open register found" }, { status: 400 });

    if (action === "CLOSE") {
      const closed = await prisma.cashSession.update({
        where: { id: currentSession.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        }
      });
      return NextResponse.json({ success: true, session: closed });
    }

    if (action === "CASH_IN" || action === "CASH_OUT") {
      const movement = await prisma.cashMovement.create({
        data: {
          sessionId: currentSession.id,
          type: action === "CASH_IN" ? "IN" : "OUT",
          amount: Number(amount),
          note,
        }
      });
      return NextResponse.json({ success: true, movement });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
