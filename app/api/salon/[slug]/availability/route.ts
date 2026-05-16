import { NextResponse } from "next/server";
import { BookingStatus } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import {
  bookingDateFromString,
  generateAvailableSlots,
  normalizeBookingDateInput,
} from "@/lib/booking";

type AvailabilityRouteProps = {
  params: {
    slug: string;
  };
};

export async function GET(request: Request, { params }: AvailabilityRouteProps) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const dateInput = normalizeBookingDateInput(searchParams.get("date"));

  if (!serviceId) {
    return NextResponse.json(
      { error: "Please provide a serviceId query parameter." },
      { status: 400 },
    );
  }

  if (!dateInput) {
    return NextResponse.json(
      { error: "Please provide a valid booking date in YYYY-MM-DD format." },
      { status: 400 },
    );
  }

  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
    include: {
      services: {
        where: {
          id: serviceId,
        },
        take: 1,
      },
    },
  });

  if (!salon) {
    return NextResponse.json({ error: "Salon not found." }, { status: 404 });
  }

  const service = salon.services[0];

  if (!service) {
    return NextResponse.json(
      { error: "Service not found for this salon." },
      { status: 404 },
    );
  }

  const bookingDate = bookingDateFromString(dateInput);
  const bookings = await prisma.booking.findMany({
    where: {
      salonId: salon.id,
      date: bookingDate,
      status: {
        not: BookingStatus.CANCELLED,
      },
    },
    select: {
      endTime: true,
      startTime: true,
      status: true,
    },
  });

  const slots = generateAvailableSlots({
    bookings,
    date: bookingDate,
    durationMinutes: service.duration,
    workingHours: salon.workingHours,
  });

  return NextResponse.json({
    date: dateInput,
    salon: {
      name: salon.name,
      slug: salon.slug,
    },
    service: {
      duration: service.duration,
      id: service.id,
      name: service.name,
      price: service.price,
    },
    slots,
  });
}
