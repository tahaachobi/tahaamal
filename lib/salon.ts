export const salonWeekDays = [
  {
    key: "mon",
    label: "Monday",
    shortLabel: "Mon",
    suggestedOpen: "09:00",
    suggestedClose: "18:00",
  },
  {
    key: "tue",
    label: "Tuesday",
    shortLabel: "Tue",
    suggestedOpen: "09:00",
    suggestedClose: "18:00",
  },
  {
    key: "wed",
    label: "Wednesday",
    shortLabel: "Wed",
    suggestedOpen: "09:00",
    suggestedClose: "18:00",
  },
  {
    key: "thu",
    label: "Thursday",
    shortLabel: "Thu",
    suggestedOpen: "09:00",
    suggestedClose: "19:00",
  },
  {
    key: "fri",
    label: "Friday",
    shortLabel: "Fri",
    suggestedOpen: "09:00",
    suggestedClose: "19:00",
  },
  {
    key: "sat",
    label: "Saturday",
    shortLabel: "Sat",
    suggestedOpen: "10:00",
    suggestedClose: "16:00",
  },
  {
    key: "sun",
    label: "Sunday",
    shortLabel: "Sun",
    suggestedOpen: "10:00",
    suggestedClose: "16:00",
  },
] as const;

export type SalonDayKey = (typeof salonWeekDays)[number]["key"];

export type SalonWorkingDay = {
  closed: boolean;
  close: null | string;
  open: null | string;
};

export type SalonWorkingHours = Record<SalonDayKey, SalonWorkingDay>;

type WorkingHoursValidationResult = {
  data: SalonWorkingHours;
  errors: string[];
};

function buildDefaultWorkingHours(): SalonWorkingHours {
  return {
    mon: { open: "09:00", close: "18:00", closed: false },
    tue: { open: "09:00", close: "18:00", closed: false },
    wed: { open: "09:00", close: "18:00", closed: false },
    thu: { open: "09:00", close: "19:00", closed: false },
    fri: { open: "09:00", close: "19:00", closed: false },
    sat: { open: "10:00", close: "16:00", closed: false },
    sun: { open: null, close: null, closed: true },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTimeString(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function getDefaultWorkingHours() {
  return buildDefaultWorkingHours();
}

export function normalizeWorkingHours(input: unknown): SalonWorkingHours {
  const defaults = buildDefaultWorkingHours();

  if (!isRecord(input)) {
    return defaults;
  }

  const nextHours = buildDefaultWorkingHours();

  for (const day of salonWeekDays) {
    const entry = input[day.key];

    if (!isRecord(entry)) {
      nextHours[day.key] = defaults[day.key];
      continue;
    }

    const open =
      typeof entry.open === "string" && isTimeString(entry.open.trim())
        ? entry.open.trim()
        : defaults[day.key].open;
    const close =
      typeof entry.close === "string" && isTimeString(entry.close.trim())
        ? entry.close.trim()
        : defaults[day.key].close;
    const closed =
      typeof entry.closed === "boolean"
        ? entry.closed
        : !(typeof open === "string" && typeof close === "string");

    nextHours[day.key] = {
      closed,
      open: closed ? null : open,
      close: closed ? null : close,
    };
  }

  return nextHours;
}

export function validateWorkingHours(input: unknown): WorkingHoursValidationResult {
  const normalized = normalizeWorkingHours(input);
  const errors: string[] = [];

  for (const day of salonWeekDays) {
    const entry = normalized[day.key];

    if (entry.closed) {
      continue;
    }

    if (!entry.open || !entry.close) {
      errors.push(`${day.label} needs both opening and closing times.`);
      continue;
    }

    if (entry.open >= entry.close) {
      errors.push(`${day.label} closing time must be after opening time.`);
    }
  }

  return {
    data: normalized,
    errors,
  };
}

export function formatWorkingHoursEntry(entry: SalonWorkingDay) {
  if (entry.closed || !entry.open || !entry.close) {
    return "Closed";
  }

  return `${entry.open} - ${entry.close}`;
}

export function sanitizeSalonName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function slugifySalonName(value: string) {
  const normalized = sanitizeSalonName(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "salon";
}
