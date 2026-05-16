import {
  BookingStatus,
  ClientConfirmationStage,
} from "@/app/generated/prisma/enums";
import { serializeBookingDate } from "@/lib/booking";

export const BOOKING_REMINDER_WINDOW_HOURS = 3;

export function getBookingStartDateTime(date: Date | string, startTime: string) {
  const normalizedDate =
    typeof date === "string" ? date : serializeBookingDate(date);

  return new Date(`${normalizedDate}T${startTime}:00`);
}

export function getBookingEndDateTime(date: Date | string, endTime: string) {
  const normalizedDate =
    typeof date === "string" ? date : serializeBookingDate(date);

  return new Date(`${normalizedDate}T${endTime}:00`);
}

export function formatConfirmationStage(stage: ClientConfirmationStage) {
  switch (stage) {
    case ClientConfirmationStage.FIRST_CONFIRMED:
      return "First confirmation done";
    case ClientConfirmationStage.AWAITING_FINAL_CONFIRMATION:
      return "Awaiting 3h confirmation";
    case ClientConfirmationStage.FINAL_CONFIRMED:
      return "Final confirmation done";
    case ClientConfirmationStage.RESCHEDULE_REQUESTED:
      return "Reschedule requested";
    default:
      return "Awaiting first confirmation";
  }
}

export function confirmationStageClasses(stage: ClientConfirmationStage) {
  switch (stage) {
    case ClientConfirmationStage.FIRST_CONFIRMED:
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case ClientConfirmationStage.AWAITING_FINAL_CONFIRMATION:
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case ClientConfirmationStage.FINAL_CONFIRMED:
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case ClientConfirmationStage.RESCHEDULE_REQUESTED:
      return "border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
    default:
      return "border border-stone-200 bg-stone-100 text-stone-700";
  }
}

export function canClientInteractWithBooking(
  status: BookingStatus,
  bookingDate: string,
  endTime: string,
) {
  if (
    status === BookingStatus.CANCELLED ||
    status === BookingStatus.COMPLETED ||
    status === BookingStatus.NO_SHOW
  ) {
    return false;
  }

  return getBookingEndDateTime(bookingDate, endTime).getTime() >= Date.now();
}
