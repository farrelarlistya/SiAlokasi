import boundaries from "./kecamatan-surabaya.json";
import { isValidCoordinate } from "../geo";

export type SurabayaRegion = {
  id: string;
  name: string;
};

type Ring = [number, number][];

type Boundary = {
  id: string;
  name: string;
  rings: Ring[];
};

const regionBoundaries = boundaries.regions as unknown as Boundary[];

const boundaryByName = new Map<string, Boundary>(
  regionBoundaries.map((region) => [region.name.toLowerCase(), region]),
);

/**
 * Daftar kecamatan Kota Surabaya beserta batas wilayahnya. Urutan nama dipakai
 * sebagai urutan tampilan pada pilihan manual.
 */
export const SURABAYA_REGIONS: SurabayaRegion[] = regionBoundaries
  .map(({ id, name }) => ({ id, name }))
  .sort((left, right) => left.name.localeCompare(right.name, "id"));

export const SURABAYA_REGION_COUNT = SURABAYA_REGIONS.length;

const regionById = new Map(SURABAYA_REGIONS.map((region) => [region.id, region]));

export function findSurabayaRegionById(regionId: string | null | undefined): SurabayaRegion | null {
  if (!regionId) return null;
  return regionById.get(regionId) ?? null;
}

/** Uji titik di dalam cincin (ray casting pada bidang lintang/bujur). */
function isPointInRing(lat: number, lng: number, ring: Ring): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const current = ring[i];
    const previous = ring[j];
    if (!current || !previous) continue;

    const [currentLat, currentLng] = current;
    const [previousLat, previousLng] = previous;

    const crosses = currentLng > lng !== previousLng > lng;
    if (!crosses) continue;

    const slope =
      ((previousLat - currentLat) * (lng - currentLng)) / (previousLng - currentLng) + currentLat;

    if (lat < slope) inside = !inside;
  }

  return inside;
}

/**
 * Menentukan kecamatan dari satu titik koordinat. Memakai batas wilayah resmi
 * (OpenStreetMap) sehingga tidak perlu memilih kecamatan secara manual.
 * Mengembalikan `null` bila titik berada di luar Kota Surabaya.
 */
export function findRegionAt(lat: number, lng: number): SurabayaRegion | null {
  if (!isValidCoordinate(lat, lng)) return null;

  for (const region of regionBoundaries) {
    for (const ring of region.rings) {
      if (isPointInRing(lat, lng, ring)) {
        return regionById.get(region.id) ?? { id: region.id, name: region.name };
      }
    }
  }

  return null;
}

/**
 * Kecamatan terdekat, dipakai sebagai cadangan bila titik tepat di garis batas
 * atau berada sedikit di luar area (misalnya di atas laut dekat pesisir).
 */
export function nearestRegionTo(lat: number, lng: number, maxKm = 3): SurabayaRegion | null {
  if (!isValidCoordinate(lat, lng)) return null;

  let best: { region: SurabayaRegion; distanceSq: number } | null = null;

  for (const region of regionBoundaries) {
    for (const ring of region.rings) {
      for (const point of ring) {
        const dLat = point[0] - lat;
        const dLng = (point[1] - lng) * Math.cos((lat * Math.PI) / 180);
        const distanceSq = dLat * dLat + dLng * dLng;
        if (!best || distanceSq < best.distanceSq) {
          best = {
            region: regionById.get(region.id) ?? { id: region.id, name: region.name },
            distanceSq,
          };
        }
      }
    }
  }

  if (!best) return null;

  const distanceKm = Math.sqrt(best.distanceSq) * 111.32;
  return distanceKm <= maxKm ? best.region : null;
}

/**
 * Kecamatan untuk sebuah titik: pakai batas wilayah, lalu cadangan terdekat.
 * Titik yang jauh di luar kota tetap menghasilkan `null`.
 */
export function resolveRegionForPoint(lat: number, lng: number): SurabayaRegion | null {
  return findRegionAt(lat, lng) ?? nearestRegionTo(lat, lng);
}

/** Nama kecamatan yang cocok dengan data batas (untuk pencocokan hasil impor). */
export function findSurabayaRegionByName(name: string | null | undefined): SurabayaRegion | null {
  if (!name) return null;
  const boundary = boundaryByName.get(name.trim().toLowerCase());
  if (!boundary) return null;
  return regionById.get(boundary.id) ?? { id: boundary.id, name: boundary.name };
}
