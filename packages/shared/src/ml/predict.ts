import type {
  DamageLevel,
  DensityLevel,
  RoadAccess,
  WeatherCondition,
} from "../domain";
import { explainAidNeed } from "./explain";
import modelFile from "./model.json";

/** Delapan faktor lapangan yang sudah divalidasi sebelum perhitungan. */
export type EstimationFactors = {
  affectedPeople: number;
  damageLevel: DamageLevel;
  vulnerableBabies: number;
  vulnerableElderly: number;
  vulnerablePregnant: number;
  vulnerableDisabled: number;
  handlingDays: number;
  roadAccess: RoadAccess;
  weather: WeatherCondition;
  density: DensityLevel;
};

export type AidItemForEstimate = {
  id: string;
  name: string;
  unit: string;
  standardPerPerson: number;
};

export type EstimatedAidItem = {
  aidItemId: string;
  name: string;
  unit: string;
  baseQty: number;
  reason: string;
};

export type EstimationResult = {
  modelVersion: string;
  totalPeople: number;
  items: EstimatedAidItem[];
};

export type BaseKind =
  | "perPerson"
  | "perPersonDay"
  | "perBabyDay"
  | "perPersonPlusElderly"
  | "perPersonPlusPregnant";

type ModelItem = {
  aidItemId: string;
  name: string;
  unit: string;
  baseKind: BaseKind;
  min: number;
  max: number;
  intercept: number;
  coefficients: number[];
};

type ModelFile = {
  modelVersion: string;
  trainedAt: string;
  sampleCount: number;
  features: string[];
  items: ModelItem[];
};

const model = modelFile as ModelFile;
const modelByAidItemId = new Map(model.items.map((item) => [item.aidItemId, item]));

export const DAMAGE_SCORE: Record<DamageLevel, number> = {
  RINGAN: 0,
  SEDANG: 1,
  BERAT: 2,
};

export const ROAD_SCORE: Record<RoadAccess, number> = {
  TERBUKA: 0,
  TERBATAS: 1,
  TERPUTUS: 2,
};

export const WEATHER_SCORE: Record<WeatherCondition, number> = {
  CERAH: 0,
  HUJAN: 1,
  EKSTREM: 2,
};

export const DENSITY_SCORE: Record<DensityLevel, number> = {
  RENDAH: 0,
  SEDANG: 1,
  TINGGI: 2,
};

/** Urutan fitur harus sama dengan `features` di model.json. */
export function buildFeatureRow(factors: EstimationFactors): number[] {
  return [
    DAMAGE_SCORE[factors.damageLevel],
    ROAD_SCORE[factors.roadAccess],
    WEATHER_SCORE[factors.weather],
    DENSITY_SCORE[factors.density],
  ];
}

function clampQuantity(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Rumus dasar per jenis bantuan. Model hanya menyesuaikan faktor di atas
 * angka dasar ini, sehingga hasil tetap masuk akal pada semua ukuran kejadian.
 */
export function computeBaseQuantity(
  baseKind: BaseKind,
  item: AidItemForEstimate,
  factors: EstimationFactors,
): number {
  const people = factors.affectedPeople;
  const days = factors.handlingDays;

  switch (baseKind) {
    case "perPersonDay":
      return item.standardPerPerson * people * days;
    case "perBabyDay":
      return 0.5 * factors.vulnerableBabies * days;
    case "perPersonPlusElderly":
      return item.standardPerPerson * people + 0.01 * factors.vulnerableElderly;
    case "perPersonPlusPregnant":
      return item.standardPerPerson * people + 2 * factors.vulnerablePregnant;
    case "perPerson":
    default:
      return item.standardPerPerson * people;
  }
}

function predictWithModel(
  modelItem: ModelItem,
  item: AidItemForEstimate,
  factors: EstimationFactors,
): number {
  const base = computeBaseQuantity(modelItem.baseKind, item, factors);
  const row = buildFeatureRow(factors);

  let factor = modelItem.intercept;
  for (let index = 0; index < row.length; index += 1) {
    factor += (modelItem.coefficients[index] ?? 0) * (row[index] ?? 0);
  }

  // Pengaman agar penyesuaian tidak pernah melompat di luar batas wajar.
  const safeFactor = Math.min(5, Math.max(0.2, factor));
  return clampQuantity(base * safeFactor, modelItem.min, modelItem.max);
}

const DAY_SENSITIVE_IDS = new Set([
  "aid_air_bersih",
  "aid_makanan_siap_saji",
  "aid_susu_bayi",
]);

/** Cadangan bila admin menambah jenis bantuan baru yang belum punya koefisien. */
function fallbackQuantity(item: AidItemForEstimate, factors: EstimationFactors): number {
  if (item.id === "aid_susu_bayi") {
    return Math.max(0, Math.round(factors.vulnerableBabies * 0.5 * factors.handlingDays));
  }

  const base = item.standardPerPerson * factors.affectedPeople;
  const dayFactor = DAY_SENSITIVE_IDS.has(item.id) ? factors.handlingDays : 1;
  const damageFactor = 1 + 0.1 * DAMAGE_SCORE[factors.damageLevel];
  const roadFactor = 1 + 0.1 * ROAD_SCORE[factors.roadAccess];
  const weatherFactor = 1 + 0.075 * WEATHER_SCORE[factors.weather];
  const densityFactor = 1 + 0.04 * DENSITY_SCORE[factors.density];

  return Math.max(
    0,
    Math.round(base * dayFactor * damageFactor * roadFactor * weatherFactor * densityFactor),
  );
}

/**
 * Menghitung kebutuhan sepuluh jenis bantuan secara deterministik. Fungsi ini
 * murni: input sama dan versi perhitungan sama selalu menghasilkan angka sama.
 */
export function predictAidNeeds(
  factors: EstimationFactors,
  aidItems: AidItemForEstimate[],
): EstimationResult {
  const items = aidItems.map((item) => {
    const modelItem = modelByAidItemId.get(item.id);
    const baseQty = modelItem
      ? predictWithModel(modelItem, item, factors)
      : fallbackQuantity(item, factors);

    return {
      aidItemId: item.id,
      name: item.name,
      unit: item.unit,
      baseQty,
      reason: explainAidNeed(item, factors, baseQty),
    };
  });

  return {
    modelVersion: model.modelVersion,
    totalPeople: factors.affectedPeople,
    items,
  };
}

export function estimationModelVersion(): string {
  return model.modelVersion;
}
