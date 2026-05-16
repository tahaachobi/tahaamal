import { BookingStatus } from "@/app/generated/prisma/enums";
import {
  normalizeWorkingHours,
  type SalonDayKey,
  type SalonWorkingHours,
} from "@/lib/salon";

type BookingLike = {
  endTime: string;
  startTime: string;
  status?: BookingStatus;
};

export type AvailableSlot = {
  endTime: string;
  startTime: string;
};

const dayKeysByIndex: Record<number, SalonDayKey> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

function isValidTimeString(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeBookingDateInput(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return null;
  }

  const parsedDate = new Date(`${trimmedValue}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  if (parsedDate.toISOString().slice(0, 10) !== trimmedValue) {
    return null;
  }

  return trimmedValue;
}

export function bookingDateFromString(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function serializeBookingDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getSalonDayKeyFromDate(date: Date): SalonDayKey {
  return dayKeysByIndex[date.getUTCDay()];
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function computeEndTime(startTime: string, durationMinutes: number) {
  if (!isValidTimeString(startTime) || durationMinutes <= 0) {
    return null;
  }

  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

export function hasOverlappingBooking(
  bookings: BookingLike[],
  startTime: string,
  endTime: string,
) {
  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = timeToMinutes(endTime);

  return bookings.some((booking) => {
    if (booking.status === BookingStatus.CANCELLED) {
      return false;
    }

    const existingStart = timeToMinutes(booking.startTime);
    const existingEnd = timeToMinutes(booking.endTime);

    return requestedStart < existingEnd && requestedEnd > existingStart;
  });
}

export function generateAvailableSlots({
  bookings,
  date,
  durationMinutes,
  workingHours,
}: {
  bookings: BookingLike[];
  date: Date;
  durationMinutes: number;
  workingHours: unknown;
}) {
  const normalizedHours = normalizeWorkingHours(workingHours as SalonWorkingHours);
  const dayKey = getSalonDayKeyFromDate(date);
  const currentDay = normalizedHours[dayKey];

  if (
    currentDay.closed ||
    !currentDay.open ||
    !currentDay.close ||
    durationMinutes <= 0
  ) {
    return [] satisfies AvailableSlot[];
  }

  const dayOpenMinutes = timeToMinutes(currentDay.open);
  const dayCloseMinutes = timeToMinutes(currentDay.close);
  const slots: AvailableSlot[] = [];

  for (
    let currentStartMinutes = dayOpenMinutes;
    currentStartMinutes + durationMinutes <= dayCloseMinutes;
    currentStartMinutes += durationMinutes
  ) {
    const startTime = minutesToTime(currentStartMinutes);
    const endTime = minutesToTime(currentStartMinutes + durationMinutes);

    if (!hasOverlappingBooking(bookings, startTime, endTime)) {
      slots.push({
        startTime,
        endTime,
      });
    }
  }

  return slots;
}

export function hashAdvisoryLockPart(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(index)) | 0;
  }

  return hash;
}
