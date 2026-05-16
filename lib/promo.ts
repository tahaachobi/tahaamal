import { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { BookingStatus, PromoType } from "@/app/generated/prisma/enums";

export type PromoPricingSummary = {
  appliedPromoCode: null | string;
  discountAmount: number;
  finalPrice: number;
  originalPrice: number;
  promoCodeId: null | string;
  promoLabel: null | string;
};

type PromoRecord = {
  code: string;
  endsAt: Date | null;
  id: string;
  isActive: boolean;
  oneTimePerClient: boolean;
  startsAt: Date | null;
  type: PromoType;
  usageLimit: number | null;
  value: number;
};

type PromoDbClient = PrismaClient | Prisma.TransactionClient;

export function normalizePromoCode(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

export function parsePromoBoundary(
  value: unknown,
  boundary: "end" | "start",
): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return null;
  }

  const timePart =
    boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  const parsedDate = new Date(`${trimmedValue}${timePart}`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

export function buildPromoLabel(type: PromoType, value: number) {
  if (type === PromoType.PERCENTAGE) {
    return `${value}% off`;
  }

  return `$${value.toFixed(2)} off`;
}

export function buildPricingSummary({
  basePrice,
  promo,
}: {
  basePrice: number;
  promo?: PromoRecord | null;
}): PromoPricingSummary {
  const originalPrice = roundCurrency(basePrice);

  if (!promo) {
    return {
      appliedPromoCode: null,
      discountAmount: 0,
      finalPrice: originalPrice,
      originalPrice,
      promoCodeId: null,
      promoLabel: null,
    };
  }

  const rawDiscount =
    promo.type === PromoType.PERCENTAGE
      ? (originalPrice * promo.value) / 100
      : promo.value;
  const discountAmount = roundCurrency(
    Math.min(originalPrice, Math.max(0, rawDiscount)),
  );
  const finalPrice = roundCurrency(Math.max(0, originalPrice - discountAmount));

  return {
    appliedPromoCode: promo.code,
    discountAmount,
    finalPrice,
    originalPrice,
    promoCodeId: promo.id,
    promoLabel: buildPromoLabel(promo.type, promo.value),
  };
}

export async function resolveApplicablePromoCode({
  client,
  code,
  now = new Date(),
  salonId,
  userId,
}: {
  client: PromoDbClient;
  code: string;
  now?: Date;
  salonId: string;
  userId: string;
}): Promise<
  | {
      error: string;
      promo: null;
    }
  | {
      error: null;
      promo: PromoRecord | null;
    }
> {
  const normalizedCode = normalizePromoCode(code);

  if (!normalizedCode) {
    return {
      error: null,
      promo: null,
    };
  }

  const promo = await client.promoCode.findUnique({
    where: {
      salonId_code: {
        code: normalizedCode,
        salonId,
      },
    },
    select: {
      code: true,
      endsAt: true,
      id: true,
      isActive: true,
      oneTimePerClient: true,
      startsAt: true,
      type: true,
      usageLimit: true,
      value: true,
    },
  });

  if (!promo) {
    return {
      error: "Promo code not found for this salon.",
      promo: null,
    };
  }

  if (!promo.isActive) {
    return {
      error: "This promo code is currently inactive.",
      promo: null,
    };
  }

  if (promo.startsAt && now < promo.startsAt) {
    return {
      error: "This promo code is not active yet.",
      promo: null,
    };
  }

  if (promo.endsAt && now > promo.endsAt) {
    return {
      error: "This promo code has expired.",
      promo: null,
    };
  }

  if (promo.usageLimit !== null) {
    const usageCount = await client.booking.count({
      where: {
        promoCodeId: promo.id,
        status: {
          not: BookingStatus.CANCELLED,
        },
      },
    });

    if (usageCount >= promo.usageLimit) {
      return {
        error: "This promo code reached its usage limit.",
        promo: null,
      };
    }
  }

  if (promo.oneTimePerClient) {
    const existingRedemption = await client.booking.count({
      where: {
        promoCodeId: promo.id,
        status: {
          not: BookingStatus.CANCELLED,
        },
        userId,
      },
    });

    if (existingRedemption > 0) {
      return {
        error: "This promo code can only be used once per client.",
        promo: null,
      };
    }
  }

  return {
    error: null,
    promo,
  };
}
