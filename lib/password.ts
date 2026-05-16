import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export function generateTemporaryPassword(length = 24) {
  return randomBytes(length).toString("base64url");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedPassword: string) {
  const [salt, hashedPassword] = storedPassword.split(":");

  if (!salt || !hashedPassword) {
    return false;
  }

  const hashedPasswordBuffer = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuffer = (await scryptAsync(
    password,
    salt,
    hashedPasswordBuffer.length,
  )) as Buffer;

  return timingSafeEqual(hashedPasswordBuffer, suppliedPasswordBuffer);
}
