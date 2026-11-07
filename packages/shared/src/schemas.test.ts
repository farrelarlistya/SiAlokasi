import { describe, expect, it } from "vitest";
import {
  emailSchema,
  incidentFactorsSchema,
  incidentFormSchema,
  trackingCodeSchema,
} from "./schemas";

const validFactors = {
  affectedPeople: 420,
  damageLevel: "SEDANG" as const,
  vulnerableBabies: 12,
  vulnerableElderly: 30,
  vulnerablePregnant: 4,
  vulnerableDisabled: 6,
  handlingDays: 5,
  roadAccess: "TERBATAS" as const,
  weather: "HUJAN" as const,
  density: "TINGGI" as const,
};

describe("incidentFactorsSchema", () => {
  it("menerima 8 faktor yang lengkap", () => {
    expect(incidentFactorsSchema.safeParse(validFactors).success).toBe(true);
  });

  it("menolak jumlah jiwa nol", () => {
    const result = incidentFactorsSchema.safeParse({ ...validFactors, affectedPeople: 0 });
    expect(result.success).toBe(false);
  });

  it("menolak kelompok rentan yang melebihi jiwa terdampak", () => {
    const result = incidentFactorsSchema.safeParse({
      ...validFactors,
      affectedPeople: 10,
      vulnerableBabies: 8,
      vulnerableElderly: 5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["vulnerableBabies"]);
    }
  });

  it("menolak lama penanganan di luar 1-30 hari", () => {
    expect(incidentFactorsSchema.safeParse({ ...validFactors, handlingDays: 0 }).success).toBe(
      false,
    );
    expect(incidentFactorsSchema.safeParse({ ...validFactors, handlingDays: 31 }).success).toBe(
      false,
    );
  });

  it("mengubah angka dari input formulir (teks) menjadi bilangan", () => {
    const result = incidentFactorsSchema.safeParse({
      ...validFactors,
      affectedPeople: "120",
      handlingDays: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.affectedPeople).toBe(120);
      expect(result.data.handlingDays).toBe(3);
    }
  });
});

describe("incidentFormSchema", () => {
  it("menerima laporan lengkap dengan radius dan titik", () => {
    const result = incidentFormSchema.safeParse({
      ...validFactors,
      title: "Banjir di Rungkut Industri",
      disasterType: "BANJIR",
      occurredAt: "2026-11-08T04:30:00.000Z",
      lat: -7.33,
      lng: 112.78,
      radiusM: 1_200,
    });
    expect(result.success).toBe(true);
  });

  it("menolak radius di bawah 100 meter", () => {
    const result = incidentFormSchema.safeParse({
      ...validFactors,
      title: "Banjir di Rungkut Industri",
      disasterType: "BANJIR",
      occurredAt: "2026-11-08T04:30:00.000Z",
      lat: -7.33,
      lng: 112.78,
      radiusM: 50,
    });
    expect(result.success).toBe(false);
  });

  it("menolak judul yang terlalu pendek", () => {
    const result = incidentFormSchema.safeParse({
      ...validFactors,
      title: "Banj",
      disasterType: "BANJIR",
      occurredAt: "2026-11-08T04:30:00.000Z",
      lat: -7.33,
      lng: 112.78,
      radiusM: 1_200,
    });
    expect(result.success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("menormalkan huruf besar menjadi kecil", () => {
    const result = emailSchema.safeParse("  Rina@BPBD.Surabaya.go.id ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("rina@bpbd.surabaya.go.id");
    }
  });

  it("memberi pesan yang mudah dipahami saat format salah", () => {
    const result = emailSchema.safeParse("rina");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("contoh");
    }
  });
});

describe("trackingCodeSchema", () => {
  it("menerima kode lacak huruf kecil", () => {
    const result = trackingCodeSchema.safeParse("sia-7k2q9");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("SIA-7K2Q9");
    }
  });

  it("menolak kode yang tidak sesuai pola", () => {
    expect(trackingCodeSchema.safeParse("SIA-123").success).toBe(false);
    expect(trackingCodeSchema.safeParse("7K2Q9").success).toBe(false);
  });
});
