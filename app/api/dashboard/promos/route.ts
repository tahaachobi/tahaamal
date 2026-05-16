import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { PromoType, Role } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import {
  normalizePromoCode,
  parsePromoBoundary,
} from "@/lib/promo";
import prisma from "@/lib/prisma";

type PromoPayload = {
  code?: string;
  endsAt?: string;
  isActive?: boolean;
  oneTimePerClient?: boolean;
  startsAt?: string;
  type?: PromoType | string;
  usageLimit?: null | number | string;
  value?: number | string;
};

function parsePromoType(value: unknown) {
  return value === PromoType.FIXED || value === PromoType.PERCENTAGE
    ? value
    : null;
}

function parsePromoValue(value: unknown, type: PromoType) {
  const parsedValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  if (type === PromoType.PERCENTAGE && parsedValue > 100) {
    return null;
  }

  return Number(parsedValue.toFixed(2));
}

function parseUsageLimit(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (session.user.role !== Role.SALON_OWNER) {
    return NextResponse.json(
      { error: "Only salon owners can manage promo codes." },
      { status: 403 },
    );
  }

  const salon = await prisma.salon.findUnique({
    where: {
      ownerId: session.user.id,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!salon) {
    return NextResponse.json(
      { error: "Create your salon profile before adding promo codes." },
      { status: 400 },
    );
  }

  const payload = (await request.json()) as PromoPayload;
  const code = normalizePromoCode(payload.code);
  const type = parsePromoType(payload.type);
  const startsAt = parsePromoBoundary(payload.startsAt, "start");
  const endsAt = parsePromoBoundary(payload.endsAt, "end");

  if (code.length < 3) {
    return NextResponse.json(
      { error: "Promo code must be at least 3 characters long." },
      { status: 400 },
    );
  }

  if (!type) {
    return NextResponse.json(
      { error: "Choose either percentage or fixed discount." },
      { status: 400 },
    );
  }

  const value = parsePromoValue(payload.value, type);

  if (value === null) {
    return NextResponse.json(
      {
        error:
          type === PromoType.PERCENTAGE
            ? "Percentage promos must be between 0.01 and 100."
            : "Fixed promos must be greater than 0.",
      },
      { status: 400 },
    );
  }

  const usageLimit = parseUsageLimit(payload.usageLimit);

  if (
    payload.usageLimit !== null &&
    payload.usageLimit !== undefined &&
    payload.usageLimit !== "" &&
    usageLimit === null
  ) {
    return NextResponse.json(
      { error: "Usage limit must be a positive whole number." },
      { status: 400 },
    );
  }

  if (startsAt && endsAt && endsAt < startsAt) {
    return NextResponse.json(
      { error: "Promo end date must be after the start date." },
      { status: 400 },
    );
  }

  try {
    const promo = await prisma.promoCode.create({
      data: {
        code,
        endsAt,
        isActive: payload.isActive ?? true,
        oneTimePerClient: payload.oneTimePerClient ?? false,
        salonId: salon.id,
        startsAt,
        type,
        usageLimit,
        value,
      },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/salon/${salon.slug}`);

    return NextResponse.json(
      {
        ok: true,
        promo: {
          code: promo.code,
          createdAt: promo.createdAt.toISOString(),
          endsAt: promo.endsAt?.toISOString() ?? null,
          id: promo.id,
          isActive: promo.isActive,
          oneTimePerClient: promo.oneTimePerClient,
          startsAt: promo.startsAt?.toISOString() ?? null,
          type: promo.type,
          usageCount: promo._count.bookings,
          usageLimit: promo.usageLimit,
          value: promo.value,
          recentBookings: [],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A promo code with this name already exists for your salon." },
        { status: 409 },
      );
    }

    console.error("Failed to create promo code", error);

    return NextResponse.json(
      { error: "We could not create that promo code right now." },
      { status: 500 },
    );
  }
}
