import { auth } from "@/auth";
import { NotificationType, Role } from "@/app/generated/prisma/enums";
import { NextResponse } from "next/server";
import { createNotifications } from "@/lib/booking-communication";
import prisma from "@/lib/prisma";

type CartItemPayload = {
  id?: string;
  price?: number | string;
};

type CheckoutPayload = {
  cart?: CartItemPayload[];
  clientId?: string;
  discountAmount?: number | string;
  paymentMethod?: string;
  salonId?: string;
  staffId?: string;
};

function parseMoney(value: unknown) {
  const parsedValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return Number(parsedValue.toFixed(2));
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== Role.SALON_OWNER &&
      session.user.role !== Role.CASHIER
    ) {
      return NextResponse.json(
        { error: "Only owners and cashiers can process checkout." },
        { status: 403 },
      );
    }

    const body = (await req.json()) as CheckoutPayload;
    const salonId = typeof body.salonId === "string" ? body.salonId.trim() : "";
    const clientId =
      typeof body.clientId === "string" && body.clientId.trim()
        ? body.clientId.trim()
        : null;
    const paymentMethod = body.paymentMethod === "CARD" ? "CARD" : "CASH";
    const cart = Array.isArray(body.cart)
      ? body.cart.filter(
          (item): item is Required<CartItemPayload> =>
            typeof item?.id === "string" &&
            item.id.trim().length > 0 &&
            parseMoney(item.price) !== null,
        )
      : [];

    if (!salonId || cart.length === 0) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    }

    const discountAmount = parseMoney(body.discountAmount) ?? 0;
    const subtotal = Number(
      cart
        .reduce(
          (accumulator, item) =>
            accumulator + (parseMoney(item.price) ?? 0),
          0,
        )
        .toFixed(2),
    );
    const totalAmount = Math.max(
      0,
      Number((subtotal - discountAmount).toFixed(2)),
    );

    const cartQuantities = cart.reduce<Record<string, number>>((map, item) => {
      const serviceId = item.id.trim();
      map[serviceId] = (map[serviceId] ?? 0) + 1;
      return map;
    }, {});

    const result = await prisma.$transaction(async (transactionClient) => {
      const salon = await transactionClient.salon.findUnique({
        where: { id: salonId },
        select: { id: true, name: true },
      });

      if (!salon) {
        throw new Error("Salon not found");
      }

      const cashSession = await transactionClient.cashSession.findFirst({
        where: { salonId, status: "OPEN" },
        orderBy: { openedAt: "desc" },
        select: { id: true },
      });

      if (!cashSession) {
        throw new Error("No open cash register session found");
      }

      const services = await transactionClient.service.findMany({
        where: {
          salonId,
          id: {
            in: Object.keys(cartQuantities),
          },
        },
        include: {
          consumptions: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      if (services.length !== Object.keys(cartQuantities).length) {
        throw new Error("One or more services in the cart are no longer available");
      }

      const transactionRecord = await transactionClient.transaction.create({
        data: {
          sessionId: cashSession.id,
          method: paymentMethod,
          amount: totalAmount,
          invoice: {
            create: {
              number: `INV-${Date.now().toString().slice(-6)}`,
              totalAmount,
            },
          },
        },
      });

      const earnedPoints = services.reduce((sum, service) => {
        return sum + service.loyaltyPoints * (cartQuantities[service.id] ?? 0);
      }, 0);

      if (clientId) {
        const client = await transactionClient.user.findFirst({
          where: {
            id: clientId,
            role: Role.CLIENT,
          },
          select: {
            id: true,
            name: true,
            loyaltyPoints: true,
          },
        });

        if (!client) {
          throw new Error("Selected client was not found");
        }

        if (earnedPoints > 0) {
          await transactionClient.user.update({
            where: { id: client.id },
            data: { loyaltyPoints: { increment: earnedPoints } },
          });

          await createNotifications(transactionClient, [
            {
              message: `You earned ${earnedPoints} loyalty points from your latest visit at ${salon.name}. Your wallet was updated instantly.`,
              title: "Loyalty points added",
              type: NotificationType.LOYALTY_UPDATE,
              userId: client.id,
            },
          ]);

          await transactionClient.auditLog.create({
            data: {
              action: "LOYALTY_POINTS_AWARDED",
              details: JSON.stringify({
                balanceAfter: client.loyaltyPoints + earnedPoints,
                clientId: client.id,
                earnedPoints,
                nextBalance: client.loyaltyPoints + earnedPoints,
                paymentMethod,
                previousBalance: client.loyaltyPoints,
                source: "SYSTEM_POS",
                serviceIds: Object.keys(cartQuantities),
                serviceNames: services.map((service) => service.name),
                totalAmount,
              }),
              entity: "User",
              entityId: client.id,
              salonId,
              userId: session.user.id,
            },
          });
        }
      }

      for (const service of services) {
        const quantityMultiplier = cartQuantities[service.id] ?? 0;

        if (quantityMultiplier <= 0) {
          continue;
        }

        for (const consumption of service.consumptions) {
          await transactionClient.product.update({
            where: { id: consumption.productId },
            data: {
              quantity: {
                decrement: consumption.quantity * quantityMultiplier,
              },
            },
          });
        }
      }

      if (paymentMethod === "CASH") {
        await transactionClient.cashSession.update({
          where: { id: cashSession.id },
          data: { totalCash: { increment: totalAmount } },
        });
      } else {
        await transactionClient.cashSession.update({
          where: { id: cashSession.id },
          data: { totalCard: { increment: totalAmount } },
        });
      }

      return {
        earnedPoints,
        transactionId: transactionRecord.id,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "Internal Server Error" ? 500 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
