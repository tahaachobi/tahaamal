import { NextResponse } from "next/server";
import { processDueBookingReminders } from "@/lib/booking-communication";

function isAuthorized(request: Request) {
  const configuredSecret = process.env.BOOKING_AUTOMATION_SECRET?.trim();

  if (!configuredSecret) {
    return false;
  }

  const bearerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const headerSecret = request.headers
    .get("x-booking-automation-secret")
    ?.trim();

  return bearerToken === configuredSecret || headerSecret === configuredSecret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized automation request." },
      { status: 401 },
    );
  }

  await processDueBookingReminders();

  return NextResponse.json({
    ok: true,
    processedAt: new Date().toISOString(),
  });
}
