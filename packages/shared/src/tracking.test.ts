import { describe, expect, it } from "vitest";
import {
  createTrackingCode,
  isValidTrackingCode,
  TRACKING_CODE_ALPHABET,
} from "./tracking";

describe("kode lacak", () => {
  it("memakai pola SIA- diikuti lima karakter", () => {
    const code = createTrackingCode(() => 0);
    expect(code).toBe("SIA-AAAAA");
    expect(isValidTrackingCode(code)).toBe(true);
  });

  it("tidak memakai huruf dan angka yang mudah tertukar", () => {
    expect(TRACKING_CODE_ALPHABET).not.toMatch(/[IO01]/);
  });

  it("menghasilkan kode yang berbeda-beda", () => {
    let state = 123456789;
    const randomIndex = (max: number) => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) % max;
    };

    const codes = new Set(Array.from({ length: 100 }, () => createTrackingCode(randomIndex)));
    expect(codes.size).toBeGreaterThan(90);
  });

  it("menolak kode yang tidak sesuai pola", () => {
    expect(isValidTrackingCode("SIA-123")).toBe(false);
    expect(isValidTrackingCode("7K2Q9")).toBe(false);
    expect(isValidTrackingCode("SIA-7K2Q9")).toBe(true);
  });
});
