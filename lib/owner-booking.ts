import { BookingStatus } from "@/app/generated/prisma/enums";

export const LATE_THRESHOLD_MINUTES = 10;
export const NO_SHOW_THRESHOLD_MINUTES = 20;

type OwnerBookingTimingState = {
  canMarkNoShow: boolean;
  hasEnded: boolean;
  hasStarted: boolean;
  isToday: boolean;
  lateMinutes: number;
  minutesUntilStart: number;
  tone: "danger" | "good" | "muted" | "neutral" | "warn";
  windowLabel: string;
};

function normalizeDateInput(value: Date | string) {
  if (typeof value === "string") {
    return value;
  }

  return value.toISOString().slice(0, 10);
}

export function getAppointmentDateTime(date: Date | string, time: string) {
  return new Date(`${normalizeDateInput(date)}T${time}:00`);
}

export function isSameCalendarDate(date: Date | string, now = new Date()) {
  const currentDate = normalizeDateInput(date);
  const localDate = [
    now.getFullYear(),
    (now.getMonth() + 1).toString().padStart(2, "0"),
    now.getDate().toString().padStart(2, "0"),
  ].join("-");

  return currentDate === localDate;
}

export function canOwnerMarkNoShow(date: Date | string, startTime: string, now = new Date()) {
  const appointmentStart = getAppointmentDateTime(date, startTime).getTime();
  const noShowWindowStartsAt =
    appointmentStart + NO_SHOW_THRESHOLD_MINUTES * 60 * 1000;

  return now.getTime() >= noShowWindowStartsAt;
}

export function getOwnerBookingTimingState({
  date,
  endTime,
  now = new Date(),
  startTime,
  status,
}: {
  date: Date | string;
  endTime: string;
  now?: Date;
  startTime: string;
  status: BookingStatus;
}): OwnerBookingTimingState {
  const appointmentStart = getAppointmentDateTime(date, startTime).getTime();
  const appointmentEnd = getAppointmentDateTime(date, endTime).getTime();
  const currentTime = now.getTime();
  const minutesUntilStart = Math.floor((appointmentStart - currentTime) / 60000);
  const lateMinutes = Math.max(
    0,
    Math.floor((currentTime - appointmentStart) / 60000),
  );
  const hasStarted = currentTime >= appointmentStart;
  const hasEnded = currentTime > appointmentEnd;
  const isToday = isSameCalendarDate(date, now);
  const noShowWindowReached = canOwnerMarkNoShow(date, startTime, now);

  if (status === BookingStatus.CANCELLED) {
    return {
      canMarkNoShow: false,
      hasEnded,
      hasStarted,
      isToday,
      lateMinutes,
      minutesUntilStart,
      tone: "muted",
      windowLabel: "Cancelled",
    };
  }

  if (status === BookingStatus.NO_SHOW) {
    return {
      canMarkNoShow: false,
      hasEnded,
      hasStarted,
      isToday,
      lateMinutes,
      minutesUntilStart,
      tone: "danger",
      windowLabel: "Marked no-show",
    };
  }

  if (status === BookingStatus.COMPLETED) {
    return {
      canMarkNoShow: false,
      hasEnded,
      hasStarted,
      isToday,
      lateMinutes,
      minutesUntilStart,
      tone: "good",
      windowLabel: "Completed",
    };
  }

  if (minutesUntilStart > 0) {
    return {
      canMarkNoShow: false,
      hasEnded,
      hasStarted,
      isToday,
      lateMinutes,
      minutesUntilStart,
      tone: minutesUntilStart <= 60 ? "warn" : "neutral",
      windowLabel:
        minutesUntilStart <= 60
          ? `Starts in ${minutesUntilStart}m`
          : `Upcoming in ${Math.floor(minutesUntilStart / 60)}h ${minutesUntilStart % 60}m`,
    };
  }

  if (noShowWindowReached) {
    return {
      canMarkNoShow: true,
      hasEnded,
      hasStarted,
      isToday,
      lateMinutes,
      minutesUntilStart,
      tone: "danger",
      windowLabel: `No-show window (${lateMinutes}m late)`,
    };
  }

  if (lateMinutes >= LATE_THRESHOLD_MINUTES) {
    return {
      canMarkNoShow: false,
      hasEnded,
      hasStarted,
      isToday,
      lateMinutes,
      minutesUntilStart,
      tone: "warn",
      windowLabel: `Late by ${lateMinutes}m`,
    };
  }

  return {
    canMarkNoShow: false,
    hasEnded,
    hasStarted,
    isToday,
    lateMinutes,
    minutesUntilStart,
    tone: status === BookingStatus.CONFIRMED ? "good" : "warn",
    windowLabel:
      status === BookingStatus.CONFIRMED
        ? "Client should be arriving"
        : "Needs owner confirmation",
  };
}
