import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildPricingSummary, resolveApplicablePromoCode } from "@/lib/promo";
import prisma from "@/lib/prisma";

type PricingRouteProps = {
  params: {
    slug: string;
  };
};

export async function GET(request: Request, { params }: PricingRouteProps) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId")?.trim() ?? "";
  const promoCode = searchParams.get("code") ?? "";
  const session = await auth();

  if (!serviceId) {
    return NextResponse.json(
      { error: "Please provide a serviceId query parameter." },
      { status: 400 },
    );
  }

  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
    },
  });

  if (!salon) {
    return NextResponse.json({ error: "Salon not found." }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      salonId: salon.id,
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  if (!service) {
    return NextResponse.json(
      { error: "Service not found for this salon." },
      { status: 404 },
    );
  }

  if (!promoCode.trim()) {
    return NextResponse.json({
      ok: true,
      pricing: buildPricingSummary({
        basePrice: service.price,
      }),
      service: {
        id: service.id,
        name: service.name,
      },
    });
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in first to apply a promo code." },
      { status: 401 },
    );
  }

  const promoResult = await resolveApplicablePromoCode({
    client: prisma,
    code: promoCode,
    salonId: salon.id,
    userId: session.user.id,
  });

  if (promoResult.error) {
    return NextResponse.json({ error: promoResult.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    pricing: buildPricingSummary({
      basePrice: service.price,
      promo: promoResult.promo,
    }),
    service: {
      id: service.id,
      name: service.name,
    },
  });
}
