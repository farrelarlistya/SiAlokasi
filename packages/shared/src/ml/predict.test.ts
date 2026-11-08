import { describe, expect, it } from "vitest";
import { predictAidNeeds, type AidItemForEstimate, type EstimationFactors } from "./predict";

const AID_ITEMS: AidItemForEstimate[] = [
  { id: "aid_tenda_keluarga", name: "Tenda keluarga", unit: "unit", standardPerPerson: 0.03 },
  { id: "aid_air_bersih", name: "Air bersih", unit: "liter", standardPerPerson: 15 },
  { id: "aid_makanan_siap_saji", name: "Makanan siap saji", unit: "paket", standardPerPerson: 3 },
  { id: "aid_obat_p3k", name: "Obat & P3K", unit: "kit", standardPerPerson: 0.02 },
  { id: "aid_selimut", name: "Selimut", unit: "lembar", standardPerPerson: 0.5 },
  { id: "aid_sanitasi", name: "Sanitasi (toilet portabel)", unit: "unit", standardPerPerson: 0.005 },
  { id: "aid_susu_bayi", name: "Susu bayi", unit: "kaleng", standardPerPerson: 0.05 },
  { id: "aid_pembalut", name: "Pembalut", unit: "paket", standardPerPerson: 0.1 },
  { id: "aid_genset", name: "Genset", unit: "unit", standardPerPerson: 0.002 },
  { id: "aid_tenda_pleton", name: "Tenda pleton", unit: "unit", standardPerPerson: 0.004 },
];

const FACTORS: EstimationFactors = {
  affectedPeople: 420,
  damageLevel: "BERAT",
  vulnerableBabies: 12,
  vulnerableElderly: 30,
  vulnerablePregnant: 4,
  vulnerableDisabled: 6,
  handlingDays: 3,
  roadAccess: "TERBATAS",
  weather: "HUJAN",
  density: "TINGGI",
};

describe("perhitungan otomatis kebutuhan bantuan", () => {
  it("menghasilkan satu baris untuk setiap jenis bantuan", () => {
    const result = predictAidNeeds(FACTORS, AID_ITEMS);
    expect(result.items).toHaveLength(10);
    expect(result.modelVersion).toMatch(/^sialokasi-ridge-/);
    expect(result.totalPeople).toBe(420);
  });

  it("selalu menghasilkan bilangan bulat tidak negatif", () => {
    const result = predictAidNeeds(FACTORS, AID_ITEMS);
    for (const item of result.items) {
      expect(Number.isInteger(item.baseQty)).toBe(true);
      expect(item.baseQty).toBeGreaterThanOrEqual(0);
      expect(item.reason.length).toBeGreaterThan(10);
    }
  });

  it("deterministik untuk input yang sama", () => {
    const first = predictAidNeeds(FACTORS, AID_ITEMS);
    const second = predictAidNeeds({ ...FACTORS }, AID_ITEMS);
    expect(second).toEqual(first);
  });

  it("menaikkan kebutuhan air saat jiwa terdampak bertambah", () => {
    const small = predictAidNeeds({ ...FACTORS, affectedPeople: 100 }, AID_ITEMS);
    const large = predictAidNeeds({ ...FACTORS, affectedPeople: 1_000 }, AID_ITEMS);
    const smallWater = small.items.find((item) => item.aidItemId === "aid_air_bersih");
    const largeWater = large.items.find((item) => item.aidItemId === "aid_air_bersih");
    expect(largeWater?.baseQty ?? 0).toBeGreaterThan(smallWater?.baseQty ?? 0);
  });

  it("memakai rumus cadangan untuk jenis bantuan baru", () => {
    const result = predictAidNeeds(FACTORS, [
      ...AID_ITEMS,
      { id: "aid_masker_baru", name: "Masker medis", unit: "kotak", standardPerPerson: 2 },
    ]);
    const masker = result.items.find((item) => item.aidItemId === "aid_masker_baru");
    expect(masker?.baseQty).toBeGreaterThan(0);
    expect(masker?.reason).toContain("Masker");
  });

  it("menjepit angka pada batas wajar untuk kejadian sangat besar", () => {
    const result = predictAidNeeds(
      {
        ...FACTORS,
        affectedPeople: 50_000,
        handlingDays: 30,
        vulnerableBabies: 2_000,
        vulnerableElderly: 5_000,
        vulnerablePregnant: 500,
        vulnerableDisabled: 500,
      },
      AID_ITEMS,
    );
    const water = result.items.find((item) => item.aidItemId === "aid_air_bersih");
    expect(water?.baseQty).toBeLessThanOrEqual(25_000_000);
  });

  it("tidak memakai istilah teknis di alasan yang tampil", () => {
    const result = predictAidNeeds(FACTORS, AID_ITEMS);
    for (const item of result.items) {
      const reason = item.reason.toLowerCase();
      expect(reason).not.toContain("model");
      expect(reason).not.toContain("regresi");
      expect(reason).not.toContain("koefisien");
      expect(reason).not.toContain("prediksi");
    }
  });
});
