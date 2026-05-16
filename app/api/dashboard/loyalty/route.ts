import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { NotificationType, Role } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { createNotifications } from "@/lib/booking-communication";
import prisma from "@/lib/prisma";

type LoyaltyAdjustmentPayload = {
  amount?: number | string;
  clientId?: string;
  mode?: string;
  reason?: string;
};

type LoyaltyHistoryEntry = {
  balanceAfter: number;
  clientId: string;
  createdAt: string;
  delta: number;
  id: string;
  note: string;
  source: "ADMIN";
};

function parseNonNegativeInteger(value: unknown) {
  const parsedValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (session.user.role !== Role.SALON_OWNER) {
    return NextResponse.json(
      { error: "Only salon owners can edit loyalty balances." },
      { status: 403 },
    );
  }

  const salon = await prisma.salon.findUnique({
    where: {
      ownerId: session.user.id,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!salon) {
    return NextResponse.json(
      { error: "Create your salon profile before editing loyalty." },
      { status: 400 },
    );
  }

  const payload = (await request.json()) as LoyaltyAdjustmentPayload;
  const clientId =
    typeof payload.clientId === "string" ? payload.clientId.trim() : "";
  const amount = parseNonNegativeInteger(payload.amount);
  const mode =
    typeof payload.mode === "string" ? payload.mode.trim().toUpperCase() : "";
  const reason =
    typeof payload.reason === "string" ? payload.reason.trim() : "";

  if (!clientId) {
    return NextResponse.json(
      { error: "Client selection is required." },
      { status: 400 },
    );
  }

  if (!["INCREMENT", "DECREMENT", "SET"].includes(mode)) {
    return NextResponse.json(
      { error: "Choose a valid loyalty action." },
      { status: 400 },
    );
  }

  if (amount === null) {
    return NextResponse.json(
      { error: "Loyalty amount must be a whole number equal to or above 0." },
      { status: 400 },
    );
  }

  const client = await prisma.user.findFirst({
    where: {
      id: clientId,
      role: Role.CLIENT,
      bookings: {
        some: {
          salonId: salon.id,
        },
      },
    },
    select: {
      email: true,
      id: true,
      loyaltyPoints: true,
      name: true,
      phone: true,
    },
  });

  if (!client) {
    return NextResponse.json(
      { error: "Client not found for this salon." },
      { status: 404 },
    );
  }

  const nextBalance =
    mode === "SET"
      ? amount
      : mode === "INCREMENT"
        ? client.loyaltyPoints + amount
        : Math.max(0, client.loyaltyPoints - amount);
  const appliedDelta = nextBalance - client.loyaltyPoints;

  const result = await prisma.$transaction(async (transactionClient) => {
    const updatedUser = await transactionClient.user.update({
      where: { id: client.id },
      data: {
        loyaltyPoints: nextBalance,
      },
      select: {
        email: true,
        id: true,
        loyaltyPoints: true,
        name: true,
        phone: true,
      },
    });

    if (appliedDelta !== 0) {
      await createNotifications(transactionClient, [
        {
          message:
            appliedDelta > 0
              ? `${appliedDelta} loyalty points were added to your wallet at ${salon.name}. Your new balance is ${nextBalance} points.`
              : `${Math.abs(appliedDelta)} loyalty points were removed from your wallet at ${salon.name}. Your new balance is ${nextBalance} points.`,
          title: "Loyalty balance updated",
          type: NotificationType.LOYALTY_UPDATE,
          userId: client.id,
        },
      ]);
    }

    const auditLog = await transactionClient.auditLog.create({
      data: {
        action: "LOYALTY_POINTS_ADJUSTED",
        details: JSON.stringify({
          amount,
          appliedDelta,
          balanceAfter: nextBalance,
          mode,
          nextBalance,
          previousBalance: client.loyaltyPoints,
          reason: reason || null,
          source: "ADMIN",
        }),
        entity: "User",
        entityId: client.id,
        salonId: salon.id,
        userId: session.user.id,
      },
    });

    const historyEntry: LoyaltyHistoryEntry = {
      balanceAfter: nextBalance,
      clientId: client.id,
      createdAt: auditLog.createdAt.toISOString(),
      delta: appliedDelta,
      id: auditLog.id,
      note:
        reason ||
        (appliedDelta > 0
          ? "Manual loyalty increase by owner"
          : appliedDelta < 0
            ? "Manual loyalty decrease by owner"
            : "Manual loyalty balance review"),
      source: "ADMIN",
    };

    return {
      historyEntry,
      updatedUser,
    };
  });

  revalidatePath("/dashboard/promotions");
  revalidatePath("/account");

  return NextResponse.json({
    client: result.updatedUser,
    historyEntry: result.historyEntry,
    message:
      appliedDelta === 0
        ? "Loyalty balance stayed the same."
        : `Loyalty balance updated successfully. New balance: ${result.updatedUser.loyaltyPoints} pts.`,
    ok: true,
  });
}
