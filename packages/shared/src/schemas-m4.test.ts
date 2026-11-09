import { describe, expect, it } from "vitest";
import {
  cancelIncidentSchema,
  correctionInputSchema,
  devClockSchema,
  pimpinanCancelSchema,
  recapFilterSchema,
} from "./schemas";

describe("cancelIncidentSchema", () => {
  it("mengizinkan pembatalan tanpa alasan", () => {
    expect(cancelIncidentSchema.safeParse({}).success).toBe(true);
  });

  it("menolak alasan yang terlalu panjang", () => {
    expect(cancelIncidentSchema.safeParse({ reason: "x".repeat(301) }).success).toBe(false);
  });
});

describe("pimpinanCancelSchema", () => {
  it("mewajibkan alasan yang bisa dipahami", () => {
    expect(pimpinanCancelSchema.safeParse({ reason: "ok" }).success).toBe(false);
    expect(
      pimpinanCancelSchema.safeParse({ reason: "Lokasi laporan masih perlu diperiksa ulang." })
        .success,
    ).toBe(true);
  });
});

describe("correctionInputSchema", () => {
  const valid = {
    reason: "Jumlah air bersih perlu ditambah setelah pendataan ulang.",
    poskoId: "posko_balai_kota",
    items: [{ aidItemId: "aid_air_bersih", qty: 4200 }],
  };

  it("menerima koreksi lengkap", () => {
    expect(correctionInputSchema.safeParse(valid).success).toBe(true);
  });

  it("mewajibkan alasan koreksi", () => {
    expect(correctionInputSchema.safeParse({ ...valid, reason: "slh" }).success).toBe(false);
  });

  it("menolak jumlah negatif atau desimal", () => {
    expect(
      correctionInputSchema.safeParse({
        ...valid,
        items: [{ aidItemId: "aid_air_bersih", qty: -1 }],
      }).success,
    ).toBe(false);
    expect(
      correctionInputSchema.safeParse({
        ...valid,
        items: [{ aidItemId: "aid_air_bersih", qty: 1.5 }],
      }).success,
    ).toBe(false);
  });

  it("menolak jenis bantuan yang sama dua kali", () => {
    expect(
      correctionInputSchema.safeParse({
        ...valid,
        items: [
          { aidItemId: "aid_air_bersih", qty: 100 },
          { aidItemId: "aid_air_bersih", qty: 200 },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("recapFilterSchema", () => {
  it("memakai pengelompokan kecamatan bila kosong", () => {
    const result = recapFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.groupBy).toBe("region");
    }
  });

  it("menolak tanggal awal setelah tanggal akhir", () => {
    expect(
      recapFilterSchema.safeParse({
        from: "2026-11-10",
        to: "2026-11-01",
      }).success,
    ).toBe(false);
  });
});

describe("devClockSchema", () => {
  it("menerima offset menit yang wajar", () => {
    expect(devClockSchema.safeParse({ offsetMinutes: 180 }).success).toBe(true);
  });

  it("menolak waktu yang terlalu jauh", () => {
    expect(devClockSchema.safeParse({ offsetMinutes: 60 * 24 * 60 }).success).toBe(false);
  });
});
