import { z } from "zod";

/** Peran pengguna yang dikenal sistem. Tamu tidak punya akun. */
export const ROLES = ["PETUGAS", "PIMPINAN", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export const roleSchema = z.enum(ROLES);

export const ROLE_LABEL: Record<Role, string> = {
  PETUGAS: "Petugas",
  PIMPINAN: "Pimpinan",
  ADMIN: "Admin",
};

/** Urutan status laporan kejadian. */
export const INCIDENT_STATUSES = [
  "BARU",
  "DIPERIKSA",
  "MENUNGGU_PERSETUJUAN",
  "DISETUJUI",
  "SELESAI",
  "DITOLAK",
  "DIBATALKAN",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export const incidentStatusSchema = z.enum(INCIDENT_STATUSES);

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  BARU: "Baru",
  DIPERIKSA: "Sudah diperiksa",
  MENUNGGU_PERSETUJUAN: "Menunggu persetujuan",
  DISETUJUI: "Disetujui",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
};

/** Warna chip status; dipetakan ke token di tema web. */
export type StatusTone = "info" | "progress" | "warning" | "success" | "calm" | "danger" | "muted";

export const STATUS_TONE: Record<IncidentStatus, StatusTone> = {
  BARU: "info",
  DIPERIKSA: "progress",
  MENUNGGU_PERSETUJUAN: "warning",
  DISETUJUI: "success",
  SELESAI: "calm",
  DITOLAK: "danger",
  DIBATALKAN: "muted",
};

/** Status yang dianggap masih berjalan dan boleh tampil di peta publik. */
export const ACTIVE_INCIDENT_STATUSES = [
  "BARU",
  "DIPERIKSA",
  "MENUNGGU_PERSETUJUAN",
  "DISETUJUI",
] as const;

/** Nama ikon Lucide yang boleh dipakai sebagai ikon jenis bantuan. */
export const AID_ICON_NAMES = [
  "tent",
  "tent-tree",
  "droplets",
  "utensils",
  "briefcase-medical",
  "bed-double",
  "toilet",
  "milk",
  "heart-pulse",
  "zap",
  "package",
  "pill",
  "shirt",
  "baby",
  "home",
  "truck",
  "radio",
  "thermometer",
] as const;
export type AidIconName = (typeof AID_ICON_NAMES)[number];

export const AID_ICON_LABEL: Record<AidIconName, string> = {
  tent: "Tenda",
  "tent-tree": "Tenda pleton",
  droplets: "Air",
  utensils: "Makanan",
  "briefcase-medical": "Obat & P3K",
  "bed-double": "Selimut & alas tidur",
  toilet: "Sanitasi",
  milk: "Susu bayi",
  "heart-pulse": "Kesehatan",
  zap: "Listrik & genset",
  package: "Paket bantuan",
  pill: "Obat-obatan",
  shirt: "Pakaian",
  baby: "Kebutuhan bayi",
  home: "Tempat tinggal",
  truck: "Angkutan",
  radio: "Komunikasi",
  thermometer: "Pemantauan suhu",
};

export const DECISION_TYPES = ["APPROVE", "REJECT"] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];
export const DECISION_LABEL: Record<DecisionType, string> = {
  APPROVE: "Disetujui",
  REJECT: "Ditolak",
};

export const DISASTER_TYPES = ["BANJIR", "KEBAKARAN", "GEMPA", "ANGIN", "LAINNYA"] as const;
export type DisasterType = (typeof DISASTER_TYPES)[number];
export const disasterTypeSchema = z.enum(DISASTER_TYPES);

export const DISASTER_LABEL: Record<DisasterType, string> = {
  BANJIR: "Banjir",
  KEBAKARAN: "Kebakaran",
  GEMPA: "Gempa",
  ANGIN: "Angin kencang",
  LAINNYA: "Lainnya",
};

/** Nama bencana yang tampil di layar, memakai isian petugas saat "Lainnya". */
export function disasterLabel(type: DisasterType, detail?: string | null): string {
  const custom = detail?.trim();
  if (type === "LAINNYA" && custom) return custom;
  return DISASTER_LABEL[type];
}

/** Nilai keterangan bencana yang disimpan, hanya untuk jenis "Lainnya". */
export function disasterDetailFor(
  input: { disasterType?: DisasterType | string | null; disasterDetail?: string | null },
): string | null {
  if (input.disasterType !== "LAINNYA") return null;
  const detail = input.disasterDetail?.trim();
  return detail ? detail.slice(0, DISASTER_DETAIL_MAX) : null;
}

export const DAMAGE_LEVELS = ["RINGAN", "SEDANG", "BERAT"] as const;
export type DamageLevel = (typeof DAMAGE_LEVELS)[number];
export const damageLevelSchema = z.enum(DAMAGE_LEVELS);
export const DAMAGE_LABEL: Record<DamageLevel, string> = {
  RINGAN: "Rusak ringan",
  SEDANG: "Rusak sedang",
  BERAT: "Rusak berat",
};

export const ROAD_ACCESS_OPTIONS = ["TERBUKA", "TERBATAS", "TERPUTUS"] as const;
export type RoadAccess = (typeof ROAD_ACCESS_OPTIONS)[number];
export const roadAccessSchema = z.enum(ROAD_ACCESS_OPTIONS);
export const ROAD_ACCESS_LABEL: Record<RoadAccess, string> = {
  TERBUKA: "Terbuka",
  TERBATAS: "Terbatas",
  TERPUTUS: "Terputus",
};

export const WEATHER_OPTIONS = ["CERAH", "HUJAN", "EKSTREM"] as const;
export type WeatherCondition = (typeof WEATHER_OPTIONS)[number];
export const weatherSchema = z.enum(WEATHER_OPTIONS);
export const WEATHER_LABEL: Record<WeatherCondition, string> = {
  CERAH: "Cerah",
  HUJAN: "Hujan",
  EKSTREM: "Cuaca ekstrem",
};

export const DENSITY_LEVELS = ["RENDAH", "SEDANG", "TINGGI"] as const;
export type DensityLevel = (typeof DENSITY_LEVELS)[number];
export const densitySchema = z.enum(DENSITY_LEVELS);
export const DENSITY_LABEL: Record<DensityLevel, string> = {
  RENDAH: "Rendah",
  SEDANG: "Sedang",
  TINGGI: "Tinggi",
};

/** Batas nilai faktor lapangan yang disepakati di PRD §6.2. */
export const FACTOR_LIMITS = {
  affectedPeople: { min: 1, max: 50_000 },
  vulnerable: { min: 0, max: 50_000 },
  radiusM: { min: 100, max: 5_000, step: 100 },
} as const;

/**
 * Lama penanganan tidak lagi diisi petugas. Perhitungan memakai asumsi awal
 * tiga hari, dan angka ini tampil di alasan setiap baris estimasi.
 */
export const DEFAULT_HANDLING_DAYS = 3;

/** Batas panjang keterangan untuk jenis bencana "Lainnya". */
export const DISASTER_DETAIL_MAX = 80;

/** Pola kode lacak publik, contoh: SIA-7K2Q9. */
export const TRACKING_CODE_PATTERN = /^SIA-[A-Z0-9]{5}$/;

/** Wilayah demo: Kota Surabaya. Dipakai untuk pemeriksaan koordinat. */
export const SURABAYA_CENTER = { lat: -7.2575, lng: 112.7521 } as const;
export const SURABAYA_BOUNDS = {
  minLat: -7.4,
  maxLat: -7.15,
  minLng: 112.55,
  maxLng: 112.9,
} as const;
