import {
  DAMAGE_LABEL,
  DENSITY_LABEL,
  ROAD_ACCESS_LABEL,
  WEATHER_LABEL,
} from "../domain";
import { formatNumber } from "../format";
import type { AidItemForEstimate, EstimationFactors } from "./predict";
import { resolveHandlingDays } from "./predict";

const DAMAGE_PERCENT = { RINGAN: 0, SEDANG: 10, BERAT: 20 } as const;
const ROAD_PERCENT = { TERBUKA: 0, TERBATAS: 10, TERPUTUS: 20 } as const;
const WEATHER_PERCENT = { CERAH: 0, HUJAN: 8, EKSTREM: 15 } as const;
const DENSITY_PERCENT = { RENDAH: 0, SEDANG: 4, TINGGI: 8 } as const;

type Condition = {
  percent: number;
  label: string;
};

function roadCondition(factors: EstimationFactors): Condition | null {
  const percent = ROAD_PERCENT[factors.roadAccess];
  return percent > 0
    ? { percent, label: `akses jalan ${ROAD_ACCESS_LABEL[factors.roadAccess].toLowerCase()}` }
    : null;
}

function weatherCondition(factors: EstimationFactors): Condition | null {
  const percent = WEATHER_PERCENT[factors.weather];
  return percent > 0
    ? { percent, label: WEATHER_LABEL[factors.weather].toLowerCase() }
    : null;
}

function damageCondition(factors: EstimationFactors): Condition | null {
  const percent = DAMAGE_PERCENT[factors.damageLevel];
  return percent > 0
    ? { percent, label: DAMAGE_LABEL[factors.damageLevel].toLowerCase() }
    : null;
}

function densityCondition(factors: EstimationFactors): Condition | null {
  const percent = DENSITY_PERCENT[factors.density];
  return percent > 0
    ? { percent, label: `kepadatan penduduk ${DENSITY_LABEL[factors.density].toLowerCase()}` }
    : null;
}

function firstCondition(...conditions: (Condition | null)[]): Condition | null {
  for (const condition of conditions) {
    if (condition) return condition;
  }
  return null;
}

function conditionSuffix(condition: Condition | null): string {
  if (!condition) return ", dibulatkan ke satuan terdekat";
  return `, ditambah ${condition.percent}% karena ${condition.label}`;
}

function peoplePhrase(factors: EstimationFactors): string {
  return `${formatNumber(factors.affectedPeople)} jiwa`;
}

function dayPhrase(factors: EstimationFactors): string {
  return `selama ${formatNumber(resolveHandlingDays(factors))} hari`;
}

function ratioPhrase(standardPerPerson: number): string {
  if (standardPerPerson <= 0) return "sesuai kebutuhan lapangan";
  return `${formatNumber(Math.max(1, Math.round(1 / standardPerPerson)))} jiwa`;
}

/**
 * Satu kalimat alasan yang bisa dibaca pimpinan tanpa istilah teknis.
 * Angka yang tampil mengikuti faktor lapangan, bukan koefisien model.
 */
export function explainAidNeed(
  item: AidItemForEstimate,
  factors: EstimationFactors,
  quantity: number,
): string {
  if (quantity === 0) {
    return "Belum dibutuhkan pada jumlah jiwa dan lama penanganan ini.";
  }

  const people = peoplePhrase(factors);
  const days = dayPhrase(factors);

  switch (item.id) {
    case "aid_air_bersih":
      return `${people} × ${formatNumber(item.standardPerPerson)} liter per hari ${days}${conditionSuffix(
        firstCondition(roadCondition(factors), weatherCondition(factors)),
      )}.`;

    case "aid_makanan_siap_saji":
      return `${people} × ${formatNumber(item.standardPerPerson)} paket per hari ${days}${conditionSuffix(
        firstCondition(roadCondition(factors), weatherCondition(factors)),
      )}.`;

    case "aid_tenda_keluarga":
      return `1 tenda untuk sekitar ${ratioPhrase(item.standardPerPerson)}${conditionSuffix(
        firstCondition(damageCondition(factors), weatherCondition(factors)),
      )}.`;

    case "aid_tenda_pleton":
      return `1 tenda pleton untuk sekitar ${ratioPhrase(item.standardPerPerson)}${conditionSuffix(
        firstCondition(damageCondition(factors), weatherCondition(factors)),
      )}.`;

    case "aid_obat_p3k":
      return `1 kit untuk sekitar ${ratioPhrase(item.standardPerPerson)}${conditionSuffix(
        firstCondition(damageCondition(factors), weatherCondition(factors)),
      )}.`;

    case "aid_selimut":
      return `1 selimut untuk setiap ${ratioPhrase(item.standardPerPerson)}${conditionSuffix(
        firstCondition(weatherCondition(factors), densityCondition(factors)),
      )}.`;

    case "aid_sanitasi":
      return `1 toilet portabel untuk sekitar ${ratioPhrase(item.standardPerPerson)}${conditionSuffix(
        firstCondition(densityCondition(factors), null),
      )}.`;

    case "aid_susu_bayi":
      return `${formatNumber(factors.vulnerableBabies)} bayi × 1 kaleng per 2 hari ${days}${conditionSuffix(
        firstCondition(roadCondition(factors), weatherCondition(factors)),
      )}.`;

    case "aid_pembalut":
      return `1 paket untuk setiap ${ratioPhrase(item.standardPerPerson)}, ditambah kebutuhan ibu hamil${conditionSuffix(
        firstCondition(densityCondition(factors), null),
      )}.`;

    case "aid_genset":
      return `1 genset untuk sekitar ${ratioPhrase(item.standardPerPerson)}${conditionSuffix(
        firstCondition(roadCondition(factors), weatherCondition(factors)),
      )}.`;

    default: {
      const dayFactor = ["air", "makan", "susu"].some((word) =>
        item.name.toLowerCase().includes(word),
      )
        ? ` ${days}`
        : "";

      return `${item.name}: ${people} × ${formatNumber(item.standardPerPerson)} ${item.unit} per jiwa${dayFactor}${conditionSuffix(
        firstCondition(roadCondition(factors), weatherCondition(factors), damageCondition(factors)),
      )}.`;
    }
  }
}
