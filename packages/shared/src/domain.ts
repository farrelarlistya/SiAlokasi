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
  handlingDays: { min: 1, max: 30 },
  radiusM: { min: 100, max: 5_000, step: 100 },
} as const;

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
