import { describe, expect, it } from "vitest";
import { boundingBox, clampRadiusMeters, haversineMeters, isWithinRadius } from "./geo";

const BALAI_KOTA = { lat: -7.2575, lng: 112.7521 };
const TUGU_PAHLAWAN = { lat: -7.2459, lng: 112.7378 };

describe("haversineMeters", () => {
  it("memberi jarak nol untuk titik yang sama", () => {
    expect(haversineMeters(BALAI_KOTA, BALAI_KOTA)).toBe(0);
  });

  it("menghitung jarak Balai Kota ke Tugu Pahlawan sekitar 2 km", () => {
    const distance = haversineMeters(BALAI_KOTA, TUGU_PAHLAWAN);
    expect(distance).toBeGreaterThan(1_900);
    expect(distance).toBeLessThan(2_200);
  });

  it("simetris untuk kedua arah", () => {
    const a = haversineMeters(BALAI_KOTA, TUGU_PAHLAWAN);
    const b = haversineMeters(TUGU_PAHLAWAN, BALAI_KOTA);
    expect(a).toBeCloseTo(b, 6);
  });

  it("menolak koordinat di luar rentang", () => {
    expect(() => haversineMeters({ lat: 100, lng: 112 }, BALAI_KOTA)).toThrow(RangeError);
  });
});

describe("isWithinRadius", () => {
  it("menganggap titik berjarak 2 km berada di dalam radius 3 km", () => {
    expect(isWithinRadius(BALAI_KOTA, TUGU_PAHLAWAN, 3_000)).toBe(true);
  });

  it("menolak titik di luar radius kecil", () => {
    expect(isWithinRadius(BALAI_KOTA, TUGU_PAHLAWAN, 1_000)).toBe(false);
  });
});

describe("clampRadiusMeters", () => {
  it("menahan radius di bawah batas minimum", () => {
    expect(clampRadiusMeters(20)).toBe(100);
  });

  it("menahan radius di atas batas maksimum", () => {
    expect(clampRadiusMeters(9_000)).toBe(5_000);
  });

  it("membulatkan ke langkah 100 meter", () => {
    expect(clampRadiusMeters(1_234)).toBe(1_200);
    expect(clampRadiusMeters(1_268)).toBe(1_300);
  });

  it("memakai batas minimum saat nilai bukan angka", () => {
    expect(clampRadiusMeters(Number.NaN)).toBe(100);
  });
});

describe("boundingBox", () => {
  it("melingkupi titik di dalam radius", () => {
    const box = boundingBox(BALAI_KOTA, 5_000);
    expect(box.minLat).toBeLessThan(BALAI_KOTA.lat);
    expect(box.maxLat).toBeGreaterThan(BALAI_KOTA.lat);
    expect(box.minLng).toBeLessThan(BALAI_KOTA.lng);
    expect(box.maxLng).toBeGreaterThan(BALAI_KOTA.lng);
  });
});
