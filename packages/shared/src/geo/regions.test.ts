import { describe, expect, it } from "vitest";
import {
  findRegionAt,
  findSurabayaRegionById,
  findSurabayaRegionByName,
  nearestRegionTo,
  resolveRegionForPoint,
  SURABAYA_REGION_COUNT,
  SURABAYA_REGIONS,
} from "./regions";

describe("batas kecamatan Surabaya", () => {
  it("memuat 31 kecamatan tanpa duplikat", () => {
    expect(SURABAYA_REGION_COUNT).toBe(31);
    expect(new Set(SURABAYA_REGIONS.map((region) => region.id)).size).toBe(31);
  });

  it("memuat kecamatan Mulyorejo", () => {
    const names = SURABAYA_REGIONS.map((region) => region.name);
    expect(names).toContain("Mulyorejo");
    expect(names).toContain("Gubeng");
    expect(findSurabayaRegionByName("mulyorejo")?.id).toBe("region_mulyorejo");
  });

  it("mengenali titik di pusat kota", () => {
    const region = findRegionAt(-7.2575, 112.7521);
    expect(region).not.toBeNull();
    expect(region?.name).toBe("Genteng");
  });

  it("mengenali titik di Mulyorejo dan Rungkut", () => {
    expect(findRegionAt(-7.2669497, 112.7995587)?.name).toBe("Mulyorejo");
    expect(findRegionAt(-7.3168803, 112.8014326)?.name).toBe("Rungkut");
  });

  it("memakai kecamatan terdekat untuk titik di tepi batas", () => {
    const region = resolveRegionForPoint(-7.2669, 112.7996);
    expect(region?.name).toBe("Mulyorejo");
    expect(nearestRegionTo(-7.2669, 112.7996)?.name).toBe("Mulyorejo");
  });

  it("mengembalikan null untuk titik di luar kota", () => {
    expect(findRegionAt(-7.6, 112.4)).toBeNull();
    expect(resolveRegionForPoint(-7.9, 112.4)).toBeNull();
  });

  it("mengembalikan null untuk koordinat tidak valid", () => {
    expect(findRegionAt(Number.NaN, 112.75)).toBeNull();
    expect(findRegionAt(-7.25, 200)).toBeNull();
  });

  it("mencari kecamatan berdasarkan id", () => {
    expect(findSurabayaRegionById("region_gubeng")?.name).toBe("Gubeng");
    expect(findSurabayaRegionById("region_tidak_ada")).toBeNull();
    expect(findSurabayaRegionById(null)).toBeNull();
  });
});