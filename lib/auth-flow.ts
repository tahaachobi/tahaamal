import { createHash, randomInt } from "node:crypto";
import { normalizeEmail, normalizePhone } from "@/lib/contact";

export const EMAIL_CODE_TTL_MINUTES = 10;
export const VERIFICATION_CODE_TTL_MINUTES = EMAIL_CODE_TTL_MINUTES;
export const LOGIN_VERIFICATION_IDENTIFIER_PREFIX = "login-email";

export type VerificationChannel = "EMAIL" | "PHONE";

export function isGoogleAuthEnabled() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function generateVerificationCode() {
  return randomInt(100000, 1000000).toString();
}

export function getVerificationCodeExpiryDate() {
  return new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);
}

export function buildVerificationIdentifier(
  channel: VerificationChannel,
  value: string,
) {
  if (channel === "PHONE") {
    return `phone:${normalizePhone(value)}`;
  }

  return `email:${normalizeEmail(value)}`;
}

export function getVerificationIdentifierCandidates(
  channel: VerificationChannel,
  value: string,
) {
  if (channel === "PHONE") {
    const normalizedPhone = normalizePhone(value);

    return normalizedPhone
      ? [buildVerificationIdentifier(channel, normalizedPhone), normalizedPhone]
      : [];
  }

  const normalizedEmail = normalizeEmail(value);

  return normalizedEmail
    ? [buildVerificationIdentifier(channel, normalizedEmail), normalizedEmail]
    : [];
}

export function buildLoginVerificationIdentifier(email: string) {
  return `${LOGIN_VERIFICATION_IDENTIFIER_PREFIX}:${normalizeEmail(email)}`;
}

function normalizeVerificationIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

export function hashVerificationCode(identifier: string, code: string) {
  const secret = process.env.NEXTAUTH_SECRET?.trim() || "development-secret";

  return createHash("sha256")
    .update(`${normalizeVerificationIdentifier(identifier)}:${code}:${secret}`)
    .digest("hex");
}

export function isProfileCompleted(profileCompletedAt: Date | null | undefined) {
  return Boolean(profileCompletedAt);
}
