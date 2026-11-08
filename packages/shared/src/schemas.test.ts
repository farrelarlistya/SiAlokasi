import { describe, expect, it } from "vitest";
import {
  adjustRecommendationItemSchema,
  aidItemInputSchema,
  decisionInputSchema,
  emailSchema,
  incidentDraftSchema,
  incidentFactorsSchema,
  incidentFormSchema,
  incidentPatchSchema,
  poskoInputSchema,
  publicIncidentFilterSchema,
  registerPetugasSchema,
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
      regionId: "region_rungkut",
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
      regionId: "region_rungkut",
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
      regionId: "region_rungkut",
    });
    expect(result.success).toBe(false);
  });
});

describe("incidentDraftSchema", () => {
  const draft = {
    title: "Banjir di Wonokromo",
    disasterType: "BANJIR" as const,
    occurredAt: "2026-11-08T04:30:00.000Z",
    lat: -7.3,
    lng: 112.74,
    radiusM: 1_200,
    regionId: "region_wonokromo",
  };

  it("mewajibkan kecamatan terdampak", () => {
    expect(incidentDraftSchema.safeParse({ ...draft, regionId: "" }).success).toBe(false);
  });

  it("menolak titik di luar Kota Surabaya", () => {
    const result = incidentDraftSchema.safeParse({ ...draft, lat: -6.2, lng: 106.8 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Kota Surabaya");
    }
  });

  it("mengizinkan penyuntingan sebagian selama draf masih baru", () => {
    expect(incidentPatchSchema.safeParse({ title: "Judul baru yang jelas" }).success).toBe(true);
    expect(incidentPatchSchema.safeParse({ radiusM: 50 }).success).toBe(false);
  });
});

describe("adjustRecommendationItemSchema", () => {
  it("mewajibkan alasan yang bisa dipahami", () => {
    expect(
      adjustRecommendationItemSchema.safeParse({ finalQty: 120, reason: "ok" }).success,
    ).toBe(false);
    expect(
      adjustRecommendationItemSchema.safeParse({
        finalQty: 120,
        reason: "Stok posko lain lebih dekat",
      }).success,
    ).toBe(true);
  });

  it("menolak jumlah negatif atau desimal", () => {
    expect(
      adjustRecommendationItemSchema.safeParse({
        finalQty: -1,
        reason: "Koreksi jumlah bantuan",
      }).success,
    ).toBe(false);
    expect(
      adjustRecommendationItemSchema.safeParse({
        finalQty: 1.5,
        reason: "Koreksi jumlah bantuan",
      }).success,
    ).toBe(false);
  });
});

describe("decisionInputSchema", () => {
  it("mewajibkan posko saat menyetujui", () => {
    expect(decisionInputSchema.safeParse({ decision: "APPROVE" }).success).toBe(false);
    expect(
      decisionInputSchema.safeParse({ decision: "APPROVE", poskoId: "posko_balai_kota" }).success,
    ).toBe(true);
  });

  it("mewajibkan alasan saat menolak", () => {
    expect(decisionInputSchema.safeParse({ decision: "REJECT" }).success).toBe(false);
    expect(
      decisionInputSchema.safeParse({
        decision: "REJECT",
        reason: "Lokasi belum bisa dipastikan",
      }).success,
    ).toBe(true);
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

describe("registerPetugasSchema", () => {
  it("menerima pendaftaran petugas lengkap", () => {
    expect(
      registerPetugasSchema.safeParse({
        name: "Rina Kusuma",
        email: "  Rina@BPBD.Surabaya.go.id ",
        regionId: "region_gubeng",
      }).success,
    ).toBe(true);
  });

  it("mewajibkan nama dan kecamatan", () => {
    expect(
      registerPetugasSchema.safeParse({
        name: "Ri",
        email: "rina@bpbd.surabaya.go.id",
        regionId: "",
      }).success,
    ).toBe(false);
  });
});

describe("aidItemInputSchema", () => {
  it("hanya menerima ikon yang tersedia di antarmuka", () => {
    expect(
      aidItemInputSchema.safeParse({
        name: "Air minum kemasan",
        unit: "dus",
        icon: "droplets",
        standardPerPerson: 2,
      }).success,
    ).toBe(true);

    expect(
      aidItemInputSchema.safeParse({
        name: "Air minum kemasan",
        unit: "dus",
        icon: "ikon-tidak-dikenal",
        standardPerPerson: 2,
      }).success,
    ).toBe(false);
  });

  it("menolak standar per jiwa negatif", () => {
    expect(
      aidItemInputSchema.safeParse({
        name: "Selimut",
        unit: "lembar",
        icon: "bed-double",
        standardPerPerson: -1,
      }).success,
    ).toBe(false);
  });
});

describe("poskoInputSchema", () => {
  it("menerima posko di area Surabaya", () => {
    expect(
      poskoInputSchema.safeParse({
        name: "Posko Tambaksari",
        regionId: "region_tambaksari",
        lat: -7.243,
        lng: 112.771,
      }).success,
    ).toBe(true);
  });

  it("menolak posko di luar area Surabaya dengan pesan yang mudah dipahami", () => {
    const result = poskoInputSchema.safeParse({
      name: "Posko Luar Kota",
      regionId: "region_gubeng",
      lat: -6.2,
      lng: 106.8,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Kota Surabaya");
    }
  });
});

describe("publicIncidentFilterSchema", () => {
  it("menganggap pilihan kosong sebagai tanpa filter", () => {
    const result = publicIncidentFilterSchema.safeParse({ disasterType: "", regionId: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.disasterType).toBeUndefined();
      expect(result.data.regionId).toBeUndefined();
    }
  });

  it("menolak jenis bencana yang tidak dikenal", () => {
    expect(
      publicIncidentFilterSchema.safeParse({ disasterType: "TSUNAMI", regionId: "" }).success,
    ).toBe(false);
  });
});
