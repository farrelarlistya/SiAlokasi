import { TRACKING_CODE_PATTERN } from "./domain";

/**
 * Huruf dan angka yang dipakai kode lacak. Karakter yang mudah tertukar
 * (I, O, 0, 1) sengaja dihilangkan agar mudah dibacakan lewat telepon.
 */
export const TRACKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const TRACKING_CODE_LENGTH = 5;

/**
 * Membuat kode lacak `SIA-XXXXX`. Sumber acak disuntikkan agar pemanggil di
 * server memakai sumber kriptografis, sementara unit test bisa deterministik.
 */
export function createTrackingCode(randomIndex: (max: number) => number): string {
  let suffix = "";

  for (let index = 0; index < TRACKING_CODE_LENGTH; index += 1) {
    const position = Math.abs(Math.trunc(randomIndex(TRACKING_CODE_ALPHABET.length)));
    suffix += TRACKING_CODE_ALPHABET.charAt(position % TRACKING_CODE_ALPHABET.length);
  }

  return `SIA-${suffix}`;
}

export function isValidTrackingCode(value: string): boolean {
  return TRACKING_CODE_PATTERN.test(value.trim().toUpperCase());
}
