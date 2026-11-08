import type { Role } from "@prisma/client";

export type DemoUserSeed = {
  id: string;
  name: string;
  email: string;
  role: Role;
  regionId?: string | null;
};

export const DEMO_USERS: DemoUserSeed[] = [
  {
    id: "user_petugas",
    name: "Rina Kusuma",
    email: "petugas@sialokasi.demo",
    role: "PETUGAS",
    regionId: "region_gubeng",
  },
  { id: "user_pimpinan", name: "Budi Santoso", email: "pimpinan@sialokasi.demo", role: "PIMPINAN" },
  { id: "user_admin", name: "Sari Wulandari", email: "admin@sialokasi.demo", role: "ADMIN" },
];

export type RegionSeed = { id: string; name: string };

export const REGIONS: RegionSeed[] = [
  { id: "region_gubeng", name: "Gubeng" },
  { id: "region_tambaksari", name: "Tambaksari" },
  { id: "region_rungkut", name: "Rungkut" },
  { id: "region_benowo", name: "Benowo" },
  { id: "region_bulak", name: "Bulak" },
  { id: "region_tandes", name: "Tandes" },
  { id: "region_wonokromo", name: "Wonokromo" },
  { id: "region_sukomanunggal", name: "Sukomanunggal" },
];

export type PoskoSeed = {
  id: string;
  name: string;
  regionId: string;
  lat: number;
  lng: number;
};

export const POSKOS: PoskoSeed[] = [
  { id: "posko_balai_kota", name: "Posko Balai Kota", regionId: "region_gubeng", lat: -7.2575, lng: 112.7521 },
  { id: "posko_rungkut", name: "Posko Rungkut", regionId: "region_rungkut", lat: -7.3301, lng: 112.7802 },
  { id: "posko_benowo", name: "Posko Benowo", regionId: "region_benowo", lat: -7.2352, lng: 112.6104 },
];

export type AidItemSeed = {
  id: string;
  name: string;
  unit: string;
  icon: string;
  standardPerPerson: number;
  sortOrder: number;
};

/**
 * 10 jenis bantuan logistik. `standardPerPerson` adalah koefisien acuan
 * (bukan kuantitas final); kuantitas final selalu dibulatkan ke bilangan bulat.
 */
export const AID_ITEMS: AidItemSeed[] = [
  { id: "aid_tenda_keluarga", name: "Tenda keluarga", unit: "unit", icon: "tent", standardPerPerson: 0.03, sortOrder: 1 },
  { id: "aid_air_bersih", name: "Air bersih", unit: "liter", icon: "droplets", standardPerPerson: 15, sortOrder: 2 },
  { id: "aid_makanan_siap_saji", name: "Makanan siap saji", unit: "paket", icon: "utensils", standardPerPerson: 3, sortOrder: 3 },
  { id: "aid_obat_p3k", name: "Obat & P3K", unit: "kit", icon: "briefcase-medical", standardPerPerson: 0.02, sortOrder: 4 },
  { id: "aid_selimut", name: "Selimut", unit: "lembar", icon: "bed-double", standardPerPerson: 0.5, sortOrder: 5 },
  { id: "aid_sanitasi", name: "Sanitasi (toilet portabel)", unit: "unit", icon: "toilet", standardPerPerson: 0.005, sortOrder: 6 },
  { id: "aid_susu_bayi", name: "Susu bayi", unit: "kaleng", icon: "milk", standardPerPerson: 0.05, sortOrder: 7 },
  { id: "aid_pembalut", name: "Pembalut", unit: "paket", icon: "heart-pulse", standardPerPerson: 0.1, sortOrder: 8 },
  { id: "aid_genset", name: "Genset", unit: "unit", icon: "zap", standardPerPerson: 0.002, sortOrder: 9 },
  { id: "aid_tenda_pleton", name: "Tenda pleton", unit: "unit", icon: "tent-tree", standardPerPerson: 0.004, sortOrder: 10 },
];

export type StockSeed = { poskoId: string; aidItemId: string; qty: number };

const stockByPosko: Record<string, number[]> = {
  posko_balai_kota: [40, 12_000, 2_400, 60, 800, 8, 300, 240, 4, 10],
  posko_rungkut: [25, 8_000, 1_600, 40, 500, 5, 200, 160, 3, 6],
  posko_benowo: [30, 9_000, 1_800, 45, 600, 6, 220, 180, 3, 8],
};

export const STOCKS: StockSeed[] = Object.entries(stockByPosko).flatMap(([poskoId, quantities]) =>
  AID_ITEMS.map((item, index) => ({
    poskoId,
    aidItemId: item.id,
    qty: quantities[index] ?? 0,
  })),
);
