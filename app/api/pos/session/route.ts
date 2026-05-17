import { NextResponse } from "next/server";
import { Role } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { validateTenantContext } from "@/lib/modules/auth/tenant-guard";
import { logAuditAction } from "@/lib/modules/audit/audit-logger";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const querySalonId = url.searchParams.get("salonId");

    // Owners, Cashiers, and Admins can query cash sessions
    const authResult = await validateTenantContext(
      [Role.SALON_OWNER, Role.CASHIER, Role.ADMIN],
      querySalonId // Strict guard: enforces that session salonId matches query salonId
    );

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 400 });
    }

    const context = authResult.context!;
    const targetSalonId = context.salonId;

    if (!targetSalonId) {
      return NextResponse.json({ error: "Missing salon identifier." }, { status: 400 });
    }

    const cashSession = await prisma.cashSession.findFirst({
      where: { salonId: targetSalonId, status: "OPEN" },
      include: {
        movements: { orderBy: { createdAt: "desc" } }
      },
      orderBy: { openedAt: "desc" },
    });

    return NextResponse.json({ session: cashSession });
  } catch (error) {
    console.error("Cash session GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, amount, note, salonId: requestSalonId } = body; // action: "OPEN", "CLOSE", "CASH_IN", "CASH_OUT"

    // Validate that user is allowed and resides in the targeted salon
    const authResult = await validateTenantContext(
      [Role.SALON_OWNER, Role.CASHIER, Role.ADMIN],
      requestSalonId
    );

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 400 });
    }

    const context = authResult.context!;
    const targetSalonId = context.salonId;

    if (!targetSalonId) {
      return NextResponse.json({ error: "Missing salon identifier." }, { status: 400 });
    }

    if (action === "OPEN") {
      const existing = await prisma.cashSession.findFirst({
        where: { salonId: targetSalonId, status: "OPEN" },
      });
      if (existing) {
        return NextResponse.json({ error: "Register is already open." }, { status: 400 });
      }

      const openingFloat = Number(amount) || 0;
      const newSession = await prisma.cashSession.create({
        data: {
          salonId: targetSalonId,
          openingFloat,
        }
      });

      await logAuditAction({
        action: "CASH_REGISTER_OPENED",
        entity: "CashSession",
        entityId: newSession.id,
        details: { openingFloat },
        userId: context.userId,
        salonId: targetSalonId,
      });

      return NextResponse.json({ success: true, session: newSession }, { status: 201 });
    }

    // Require an open session for other actions
    const currentSession = await prisma.cashSession.findFirst({
      where: { salonId: targetSalonId, status: "OPEN" },
    });

    if (!currentSession) {
      return NextResponse.json({ error: "No open register found." }, { status: 400 });
    }

    if (action === "CLOSE") {
      const closed = await prisma.cashSession.update({
        where: { id: currentSession.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        }
      });

      await logAuditAction({
        action: "CASH_REGISTER_CLOSED",
        entity: "CashSession",
        entityId: closed.id,
        details: {
          openingFloat: closed.openingFloat,
          totalCash: closed.totalCash,
          totalCard: closed.totalCard,
          netRevenue: closed.totalCash + closed.totalCard,
        },
        userId: context.userId,
        salonId: targetSalonId,
      });

      return NextResponse.json({ success: true, session: closed });
    }

    if (action === "CASH_IN" || action === "CASH_OUT") {
      const parsedAmount = Math.max(0, Number(amount) || 0);

      if (parsedAmount <= 0) {
        return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
      }

      const movement = await prisma.cashMovement.create({
        data: {
          sessionId: currentSession.id,
          type: action === "CASH_IN" ? "IN" : "OUT",
          amount: parsedAmount,
          note: note ? String(note).trim() : null,
        }
      });

      await logAuditAction({
        action: action === "CASH_IN" ? "CASH_MOVEMENT_IN" : "CASH_MOVEMENT_OUT",
        entity: "CashMovement",
        entityId: movement.id,
        details: {
          amount: parsedAmount,
          note,
          sessionId: currentSession.id,
        },
        userId: context.userId,
        salonId: targetSalonId,
      });

      return NextResponse.json({ success: true, movement }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Cash session POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
