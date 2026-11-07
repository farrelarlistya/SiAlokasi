import { FACTOR_LIMITS } from "./domain";

export type LatLng = { lat: number; lng: number };

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/** Radius bumi rata-rata (meter) untuk rumus Haversine. */
export const EARTH_RADIUS_M = 6_371_008.8;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Jarak dua titik di permukaan bumi (meter) memakai rumus Haversine.
 * Dipakai bersama oleh web dan api agar hasilnya identik.
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  if (!isValidCoordinate(a.lat, a.lng) || !isValidCoordinate(b.lat, b.lng)) {
    throw new RangeError("Koordinat tidak valid. Pastikan titik berada di peta.");
  }

  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinRadius(origin: LatLng, point: LatLng, radiusM: number): boolean {
  if (!Number.isFinite(radiusM) || radiusM < 0) {
    throw new RangeError("Radius harus berupa angka nol atau lebih.");
  }
  return haversineMeters(origin, point) <= radiusM;
}

/** Membatasi radius ke 100 m – 5 km dan membulatkan ke langkah 100 m. */
export function clampRadiusMeters(radiusM: number): number {
  if (!Number.isFinite(radiusM)) {
    return FACTOR_LIMITS.radiusM.min;
  }
  const { min, max, step } = FACTOR_LIMITS.radiusM;
  const snapped = Math.round(radiusM / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

/** Kotak pembatas kasar untuk query database sebelum penyaringan Haversine. */
export function boundingBox(center: LatLng, radiusM: number): BoundingBox {
  if (!isValidCoordinate(center.lat, center.lng)) {
    throw new RangeError("Koordinat pusat tidak valid.");
  }
  const safeRadius = Math.max(0, radiusM);
  const latDelta = (safeRadius / EARTH_RADIUS_M) * (180 / Math.PI);
  const cosLat = Math.cos(toRadians(center.lat));
  const lngDelta = cosLat === 0 ? 180 : latDelta / Math.abs(cosLat);

  return {
    minLat: Math.max(-90, center.lat - latDelta),
    maxLat: Math.min(90, center.lat + latDelta),
    minLng: Math.max(-180, center.lng - lngDelta),
    maxLng: Math.min(180, center.lng + lngDelta),
  };
}
