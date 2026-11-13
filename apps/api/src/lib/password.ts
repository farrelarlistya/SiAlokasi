import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Penyimpanan kata sandi. Memakai scrypt bawaan Node (tanpa pustaka tambahan):
 * hasilnya `scrypt:<salt>:<hash>` sehingga satu kata sandi tidak pernah disimpan
 * sebagai teks biasa dan dua akun dengan kata sandi sama tetap berbeda hash.
 */

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;

  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  if (expected.length === 0) return false;

  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
