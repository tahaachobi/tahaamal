export type SalonContactLocation = {
  address: null | string;
  city: null | string;
  contactPhone: null | string;
  latitude: null | number;
  longitude: null | number;
  whatsappPhone: null | string;
};

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = collapseWhitespace(value);

  return normalized || null;
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizePhone(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const withNormalizedPrefix = trimmedValue.startsWith("00")
    ? `+${trimmedValue.slice(2)}`
    : trimmedValue;
  const hasPlus = withNormalizedPrefix.startsWith("+");
  const digits = withNormalizedPrefix.replace(/\D/g, "");

  if (digits.length < 8 || digits.length > 15) {
    return "";
  }

  return hasPlus ? `+${digits}` : digits;
}

export function isValidPhone(value: string) {
  return /^\+?\d{8,15}$/.test(value);
}

export function buildCallUrl(phone: null | string | undefined) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return null;
  }

  return `tel:${normalized}`;
}

export function buildWhatsAppUrl(
  phone: null | string | undefined,
  message?: null | string,
) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/^\+/, "");

  if (!digits) {
    return null;
  }

  const baseUrl = `https://wa.me/${digits}`;

  if (!message) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

export function parseOptionalCoordinate(
  value: unknown,
  axis: "latitude" | "longitude",
) {
  if (value === null || value === undefined) {
    return {
      error: null,
      value: null,
    };
  }

  const stringValue =
    typeof value === "number"
      ? value.toString()
      : typeof value === "string"
        ? value.trim()
        : "";

  if (!stringValue) {
    return {
      error: null,
      value: null,
    };
  }

  const parsedValue = Number.parseFloat(stringValue);

  if (Number.isNaN(parsedValue)) {
    return {
      error: `${axis === "latitude" ? "Latitude" : "Longitude"} must be a valid number.`,
      value: null,
    };
  }

  if (axis === "latitude" && (parsedValue < -90 || parsedValue > 90)) {
    return {
      error: "Latitude must be between -90 and 90.",
      value: null,
    };
  }

  if (axis === "longitude" && (parsedValue < -180 || parsedValue > 180)) {
    return {
      error: "Longitude must be between -180 and 180.",
      value: null,
    };
  }

  return {
    error: null,
    value: parsedValue,
  };
}

export function hasCoordinates(
  latitude: null | number | undefined,
  longitude: null | number | undefined,
) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

export function getLocationLabel(location: {
  address?: null | string;
  city?: null | string;
}) {
  const parts = [location.address?.trim(), location.city?.trim()].filter(
    (part): part is string => !!part,
  );

  return parts.length ? parts.join(", ") : null;
}

export function buildGoogleMapsUrl(location: {
  address?: null | string;
  city?: null | string;
  latitude?: null | number;
  longitude?: null | number;
}) {
  if (hasCoordinates(location.latitude, location.longitude)) {
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
  }

  const label = getLocationLabel(location);

  if (!label) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

export function buildAppleMapsUrl(location: {
  address?: null | string;
  city?: null | string;
  latitude?: null | number;
  longitude?: null | number;
}) {
  const label = getLocationLabel(location);

  if (hasCoordinates(location.latitude, location.longitude)) {
    const query = label
      ? `ll=${location.latitude},${location.longitude}&q=${encodeURIComponent(label)}`
      : `ll=${location.latitude},${location.longitude}`;

    return `https://maps.apple.com/?${query}`;
  }

  if (!label) {
    return null;
  }

  return `https://maps.apple.com/?q=${encodeURIComponent(label)}`;
}
