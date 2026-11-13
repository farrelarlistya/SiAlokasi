/**
 * Membuat berkas batas kecamatan Kota Surabaya dari data OpenStreetMap.
 *
 * Sumber: Overpass API (relasi admin_level=6 di sekitar Kota Surabaya).
 * Data © kontributor OpenStreetMap, lisensi ODbL. Catatan lisensi ada di
 * docs/desain/gambar/CREDITS.md.
 *
 * Cara pakai (data mentah diunduh lebih dulu):
 *   node tools/build-region-boundaries.mjs <berkas-overpass.json>
 *
 * Hasil: packages/shared/src/geo/kecamatan-surabaya.json (ring sederhana,
 * toleransi ±60 m) yang dipakai `findRegionAt()` untuk menebak kecamatan
 * dari satu titik koordinat tanpa memanggil layanan luar saat aplikasi dipakai.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Sebutkan berkas JSON Overpass sebagai argumen pertama.");
  process.exit(1);
}

const TOLERANCE = 0.00055; // sekitar 60 meter
const SURABAYA_PREFIX_MIN_LAT = -7.6;
const SURABAYA_PREFIX_MAX_LAT = -7.0;

const raw = JSON.parse(readFileSync(input, "utf8"));

function slug(name) {
  return `region_${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`;
}

/** Jarak tegak lurus titik ke garis (derajat, cukup untuk area kecil). */
function perpendicularDistance(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const px = x1 + clamped * dx;
  const py = y1 + clamped * dy;
  return Math.hypot(x - px, y - py);
}

function simplify(points, tolerance) {
  if (points.length <= 3) return points;

  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance <= tolerance) {
    return [points[0], points[points.length - 1]];
  }

  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

function key(point) {
  return `${point[0].toFixed(7)},${point[1].toFixed(7)}`;
}

/** Menyambung potongan garis menjadi cincin tertutup. */
function joinRings(segments) {
  const remaining = segments
    .map((segment) => segment.map((point) => [point.lat, point.lon]))
    .filter((segment) => segment.length >= 2);

  const rings = [];

  while (remaining.length > 0) {
    const ring = remaining.shift().slice();

    let extended = true;
    while (extended) {
      extended = false;
      const startKey = key(ring[0]);
      const endKey = key(ring[ring.length - 1]);

      for (let i = 0; i < remaining.length; i += 1) {
        const segment = remaining[i];
        const segmentStart = key(segment[0]);
        const segmentEnd = key(segment[segment.length - 1]);

        if (segmentStart === endKey) {
          ring.push(...segment.slice(1));
        } else if (segmentEnd === endKey) {
          ring.push(...segment.slice(0, -1).reverse());
        } else if (segmentEnd === startKey) {
          ring.unshift(...segment.slice(0, -1));
        } else if (segmentStart === startKey) {
          ring.unshift(...segment.slice(1).reverse());
        } else {
          continue;
        }

        remaining.splice(i, 1);
        extended = true;
        break;
      }
    }

    rings.push(ring);
  }

  return rings;
}

const regions = [];

for (const element of raw.elements) {
  if (element.type !== "relation" || !element.tags?.name) continue;

  const name = element.tags.name;
  const outer = (element.members ?? []).filter(
    (member) => member.type === "way" && (member.role === "outer" || member.role === "") && member.geometry,
  );

  if (outer.length === 0) continue;

  const rings = joinRings(outer.map((member) => member.geometry))
    .map((ring) => {
      const closed = ring[0] && ring[ring.length - 1] && key(ring[0]) === key(ring[ring.length - 1]) ? ring : [...ring, ring[0]];
      return simplify(closed, TOLERANCE);
    })
    .filter((ring) => ring.length >= 4)
    .map((ring) => ring.map(([lat, lng]) => [Number(lat.toFixed(5)), Number(lng.toFixed(5))]));

  if (rings.length === 0) continue;

  const centroidLat = rings[0].reduce((sum, point) => sum + point[0], 0) / rings[0].length;
  if (centroidLat < SURABAYA_PREFIX_MIN_LAT || centroidLat > SURABAYA_PREFIX_MAX_LAT) {
    console.warn(`Lewati ${name}: di luar area Kota Surabaya.`);
    continue;
  }

  regions.push({ id: slug(name), name, rings });
}

regions.sort((left, right) => left.name.localeCompare(right.name, "id"));

const output = {
  source: "OpenStreetMap via Overpass API (admin_level=6, Kota Surabaya)",
  license: "ODbL 1.0 — © kontributor OpenStreetMap",
  generatedAt: new Date().toISOString().slice(0, 10),
  toleranceDegrees: TOLERANCE,
  regions,
};

const target = path.resolve("packages/shared/src/geo/kecamatan-surabaya.json");
writeFileSync(target, `${JSON.stringify(output)}\n`, "utf8");

const points = regions.reduce(
  (sum, region) => sum + region.rings.reduce((inner, ring) => inner + ring.length, 0),
  0,
);
console.log(`Tersimpan: ${target}`);
console.log(`${regions.length} kecamatan, ${points} titik, ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);