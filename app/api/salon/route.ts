import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Role } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import {
  isValidPhone,
  normalizePhone,
  parseOptionalCoordinate,
  sanitizeOptionalText,
} from "@/lib/contact";
import prisma from "@/lib/prisma";
import {
  sanitizeSalonName,
  validateWorkingHours,
  type SalonWorkingHours,
} from "@/lib/salon";
import { buildUniqueSalonSlug } from "@/lib/salon-server";

type SalonPayload = {
  address?: string;
  city?: string;
  contactPhone?: string;
  latitude?: number | string;
  logo?: string;
  longitude?: number | string;
  name?: string;
  whatsappPhone?: string;
  workingHours?: SalonWorkingHours;
};

function sanitizeLogoUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

async function saveSalon(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (session.user.role !== Role.SALON_OWNER) {
    return NextResponse.json(
      { error: "Only salon owners can manage a salon profile." },
      { status: 403 },
    );
  }

  try {
    const payload = (await request.json()) as SalonPayload;
    const name = sanitizeSalonName(typeof payload.name === "string" ? payload.name : "");
    const logo = sanitizeLogoUrl(payload.logo);
    const address = sanitizeOptionalText(payload.address);
    const city = sanitizeOptionalText(payload.city);
    const contactPhone = normalizePhone(payload.contactPhone);
    const whatsappPhone = normalizePhone(payload.whatsappPhone);
    const latitudeResult = parseOptionalCoordinate(payload.latitude, "latitude");
    const longitudeResult = parseOptionalCoordinate(
      payload.longitude,
      "longitude",
    );
    const workingHoursResult = validateWorkingHours(payload.workingHours);

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Salon name must be at least 2 characters long." },
        { status: 400 },
      );
    }

    if (payload.logo && !logo) {
      return NextResponse.json(
        { error: "Logo must be a valid http or https URL." },
        { status: 400 },
      );
    }

    if (payload.contactPhone && !contactPhone) {
      return NextResponse.json(
        { error: "Contact phone must be a valid phone number." },
        { status: 400 },
      );
    }

    if (payload.whatsappPhone && !whatsappPhone) {
      return NextResponse.json(
        { error: "WhatsApp phone must be a valid phone number." },
        { status: 400 },
      );
    }

    if (contactPhone && !isValidPhone(contactPhone)) {
      return NextResponse.json(
        { error: "Contact phone must be a valid phone number." },
        { status: 400 },
      );
    }

    if (whatsappPhone && !isValidPhone(whatsappPhone)) {
      return NextResponse.json(
        { error: "WhatsApp phone must be a valid phone number." },
        { status: 400 },
      );
    }

    if (latitudeResult.error) {
      return NextResponse.json({ error: latitudeResult.error }, { status: 400 });
    }

    if (longitudeResult.error) {
      return NextResponse.json(
        { error: longitudeResult.error },
        { status: 400 },
      );
    }

    if (
      (latitudeResult.value === null) !== (longitudeResult.value === null)
    ) {
      return NextResponse.json(
        {
          error:
            "Latitude and longitude must both be filled together if you want map coordinates.",
        },
        { status: 400 },
      );
    }

    if (workingHoursResult.errors.length) {
      return NextResponse.json(
        { error: workingHoursResult.errors[0] },
        { status: 400 },
      );
    }

    const currentSalon = await prisma.salon.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true, slug: true },
    });

    const slug = await buildUniqueSalonSlug(name, currentSalon?.id);

    const salon = await prisma.salon.upsert({
      where: { ownerId: session.user.id },
      update: {
        address,
        city,
        contactPhone: contactPhone || null,
        latitude: latitudeResult.value,
        longitude: longitudeResult.value,
        name,
        slug,
        logo,
        whatsappPhone: whatsappPhone || null,
        workingHours: workingHoursResult.data,
      },
      create: {
        address,
        city,
        contactPhone: contactPhone || null,
        latitude: latitudeResult.value,
        longitude: longitudeResult.value,
        name,
        slug,
        logo,
        ownerId: session.user.id,
        whatsappPhone: whatsappPhone || null,
        workingHours: workingHoursResult.data,
      },
      include: {
        _count: {
          select: {
            bookings: true,
            services: true,
          },
        },
      },
    });

    if (salon._count.services === 0) {
      await prisma.service.create({
        data: {
          name: "Starter Consultation",
          description:
            "Default service created automatically so you can test availability and booking flows.",
          duration: 60,
          price: 30,
          salonId: salon.id,
        },
      });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        salonId: salon.id,
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath(`/salon/${slug}`);

    if (currentSalon?.slug && currentSalon.slug !== slug) {
      revalidatePath(`/salon/${currentSalon.slug}`);
    }

    return NextResponse.json({
      ok: true,
      salon: {
        address: salon.address,
        bookingsCount: salon._count.bookings,
        city: salon.city,
        contactPhone: salon.contactPhone,
        latitude: salon.latitude,
        logo: salon.logo,
        longitude: salon.longitude,
        name: salon.name,
        publicPath: `/salon/${salon.slug}`,
        servicesCount:
          salon._count.services === 0 ? 1 : salon._count.services,
        slug: salon.slug,
        whatsappPhone: salon.whatsappPhone,
        workingHours: workingHoursResult.data,
      },
    });
  } catch (error) {
    console.error("Failed to save salon profile", error);

    return NextResponse.json(
      { error: "We could not save the salon profile. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return saveSalon(request);
}

export async function PUT(request: Request) {
  return saveSalon(request);
}
