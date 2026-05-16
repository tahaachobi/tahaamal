import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { Role } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type ServicePayload = {
  description?: string;
  duration?: number | string;
  loyaltyPoints?: number | string;
  name?: string;
  price?: number | string;
};

type RouteProps = {
  params: {
    serviceId: string;
  };
};

function normalizeServiceName(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeServiceDescription(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function parsePositiveDuration(value: unknown) {
  const parsedValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parseNonNegativePrice(value: unknown) {
  const parsedValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return Number(parsedValue.toFixed(2));
}

function parseNonNegativeInteger(value: unknown) {
  const parsedValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

async function getOwnerService(serviceId: string, ownerId: string) {
  return prisma.service.findFirst({
    where: {
      id: serviceId,
      salon: {
        ownerId,
      },
    },
    include: {
      _count: {
        select: {
          bookings: true,
        },
      },
      salon: {
        select: {
          slug: true,
        },
      },
    },
  });
}

export async function PUT(request: Request, { params }: RouteProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (session.user.role !== Role.SALON_OWNER) {
    return NextResponse.json(
      { error: "Only salon owners can manage services." },
      { status: 403 },
    );
  }

  const existingService = await getOwnerService(params.serviceId, session.user.id);

  if (!existingService) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  const payload = (await request.json()) as ServicePayload;
  const name = normalizeServiceName(payload.name);
  const description = normalizeServiceDescription(payload.description);
  const duration = parsePositiveDuration(payload.duration);
  const loyaltyPoints = parseNonNegativeInteger(payload.loyaltyPoints);
  const price = parseNonNegativePrice(payload.price);

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Service name must be at least 2 characters long." },
      { status: 400 },
    );
  }

  if (duration === null) {
    return NextResponse.json(
      { error: "Service duration must be a positive whole number." },
      { status: 400 },
    );
  }

  if (price === null) {
    return NextResponse.json(
      { error: "Service price must be a valid non-negative number." },
      { status: 400 },
    );
  }

  if (loyaltyPoints === null) {
    return NextResponse.json(
      { error: "Loyalty points must be a whole number equal to or above 0." },
      { status: 400 },
    );
  }

  try {
    const service = await prisma.service.update({
      where: {
        id: existingService.id,
      },
      data: {
        description,
        duration,
        loyaltyPoints,
        name,
        price,
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
    revalidatePath(`/salon/${existingService.salon.slug}`);

    return NextResponse.json({
      ok: true,
      service: {
        bookingsCount: service._count.bookings,
        description: service.description,
        duration: service.duration,
        id: service.id,
        loyaltyPoints: service.loyaltyPoints,
        name: service.name,
        price: service.price,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A service with that name already exists for this salon." },
        { status: 409 },
      );
    }

    console.error("Failed to update service", error);

    return NextResponse.json(
      { error: "We could not update that service right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (session.user.role !== Role.SALON_OWNER) {
    return NextResponse.json(
      { error: "Only salon owners can manage services." },
      { status: 403 },
    );
  }

  const existingService = await getOwnerService(params.serviceId, session.user.id);

  if (!existingService) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  if (existingService._count.bookings > 0) {
    return NextResponse.json(
      {
        error:
          "This service already has bookings linked to it, so it cannot be deleted safely.",
      },
      { status: 409 },
    );
  }

  await prisma.service.delete({
    where: {
      id: existingService.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/salon/${existingService.salon.slug}`);

  return NextResponse.json({ ok: true });
}
