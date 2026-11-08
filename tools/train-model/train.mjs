import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Pelatihan model estimasi bantuan SiAlokasi.
 *
 * Model memprediksi FAKTOR PENYESUAIAN di atas rumus dasar per jiwa, bukan
 * angka absolut. Cara ini menjaga hasil tetap wajar untuk kejadian kecil
 * maupun besar, dan alasannya mudah dijelaskan ke pimpinan.
 *
 * Data latih sintetis dan deterministik. Jalankan dengan `npm run model:train`.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outputPath = path.join(root, "packages/shared/src/ml/model.json");

const MODEL_VERSION = "sialokasi-ridge-1.1.0";
const SAMPLE_COUNT = 4_000;
const RIDGE_LAMBDA = 0.01;

/** Fitur kategorikal yang membentuk faktor penyesuaian. */
const FEATURES = ["damage", "road", "weather", "density"];

const ITEMS = [
  {
    aidItemId: "aid_tenda_keluarga",
    name: "Tenda keluarga",
    unit: "unit",
    baseKind: "perPerson",
    min: 0,
    max: 2_000,
    factor: (f) => 1 + 0.1 * f.damage + 0.02 * f.weather,
  },
  {
    aidItemId: "aid_air_bersih",
    name: "Air bersih",
    unit: "liter",
    baseKind: "perPersonDay",
    min: 0,
    max: 25_000_000,
    factor: (f) => 1 + 0.1 * f.road + 0.08 * f.weather,
  },
  {
    aidItemId: "aid_makanan_siap_saji",
    name: "Makanan siap saji",
    unit: "paket",
    baseKind: "perPersonDay",
    min: 0,
    max: 5_000_000,
    factor: (f) => 1 + 0.1 * f.road + 0.08 * f.weather,
  },
  {
    aidItemId: "aid_obat_p3k",
    name: "Obat & P3K",
    unit: "kit",
    baseKind: "perPerson",
    min: 0,
    max: 1_500,
    factor: (f) => 1 + 0.1 * f.damage + 0.05 * f.weather,
  },
  {
    aidItemId: "aid_selimut",
    name: "Selimut",
    unit: "lembar",
    baseKind: "perPerson",
    min: 0,
    max: 40_000,
    factor: (f) => 1 + 0.08 * f.weather + 0.04 * f.density,
  },
  {
    aidItemId: "aid_sanitasi",
    name: "Sanitasi (toilet portabel)",
    unit: "unit",
    baseKind: "perPersonPlusElderly",
    min: 0,
    max: 400,
    factor: (f) => 1 + 0.1 * f.density,
  },
  {
    aidItemId: "aid_susu_bayi",
    name: "Susu bayi",
    unit: "kaleng",
    baseKind: "perBabyDay",
    min: 0,
    max: 200_000,
    factor: (f) => 1 + 0.05 * f.road,
  },
  {
    aidItemId: "aid_pembalut",
    name: "Pembalut",
    unit: "paket",
    baseKind: "perPersonPlusPregnant",
    min: 0,
    max: 8_000,
    factor: (f) => 1 + 0.04 * f.density,
  },
  {
    aidItemId: "aid_genset",
    name: "Genset",
    unit: "unit",
    baseKind: "perPerson",
    min: 0,
    max: 200,
    factor: (f) => 1 + 0.15 * f.road + 0.1 * f.weather,
  },
  {
    aidItemId: "aid_tenda_pleton",
    name: "Tenda pleton",
    unit: "unit",
    baseKind: "perPerson",
    min: 0,
    max: 300,
    factor: (f) => 1 + 0.1 * f.damage,
  },
];

/** PRNG deterministik agar data latih bisa dibuat ulang kapan saja. */
function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = mulberry32(20261108);

function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick(values) {
  return values[Math.floor(random() * values.length)];
}

function buildFactors() {
  const affectedPeople = randomInt(1, 50_000);
  const damage = pick([0, 1, 2]);
  const road = pick([0, 1, 2]);
  const weather = pick([0, 1, 2]);
  const density = pick([0, 1, 2]);
  const days = randomInt(1, 30);

  let babies = randomInt(0, Math.min(250, Math.floor(affectedPeople * 0.2)));
  let elderly = randomInt(0, Math.min(500, Math.floor(affectedPeople * 0.3)));
  let pregnant = randomInt(0, Math.min(100, Math.floor(affectedPeople * 0.1)));
  let disabled = randomInt(0, Math.min(150, Math.floor(affectedPeople * 0.1)));

  const totalVulnerable = babies + elderly + pregnant + disabled;
  if (totalVulnerable > affectedPeople) {
    const scale = affectedPeople / totalVulnerable;
    babies = Math.floor(babies * scale);
    elderly = Math.floor(elderly * scale);
    pregnant = Math.floor(pregnant * scale);
    disabled = Math.floor(disabled * scale);
  }

  return {
    affectedPeople,
    damage,
    road,
    weather,
    density,
    days,
    babies,
    elderly,
    pregnant,
    disabled,
  };
}

/**
 * Rumus dasar yang sama dengan `computeBaseQuantity` di shared. Harus dijaga
 * sinkron; perubahan di sini wajib diikuti perubahan di predict.ts.
 */
function baseQuantity(item, factors, standardPerPerson) {
  const people = factors.affectedPeople;
  const days = factors.days;

  switch (item.baseKind) {
    case "perPersonDay":
      return standardPerPerson * people * days;
    case "perBabyDay":
      return 0.5 * factors.babies * days;
    case "perPersonPlusElderly":
      return standardPerPerson * people + 0.01 * factors.elderly;
    case "perPersonPlusPregnant":
      return standardPerPerson * people + 2 * factors.pregnant;
    case "perPerson":
    default:
      return standardPerPerson * people;
  }
}

/** Standar per jiwa mengikuti data master; disalin agar skrip bisa berdiri sendiri. */
const STANDARD_PER_PERSON = {
  aid_tenda_keluarga: 0.03,
  aid_air_bersih: 15,
  aid_makanan_siap_saji: 3,
  aid_obat_p3k: 0.02,
  aid_selimut: 0.5,
  aid_sanitasi: 0.005,
  aid_susu_bayi: 0.05,
  aid_pembalut: 0.1,
  aid_genset: 0.002,
  aid_tenda_pleton: 0.004,
};

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function solveLinearSystem(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][column]) < 1e-12) {
      continue;
    }

    [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];

    const pivot = augmented[column][column];
    for (let index = column; index <= size; index += 1) {
      augmented[column][index] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      if (factor === 0) continue;
      for (let index = column; index <= size; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function trainRidge(rows, targets) {
  const width = FEATURES.length + 1;
  const matrix = Array.from({ length: width }, () => Array(width).fill(0));
  const vector = Array(width).fill(0);

  for (let index = 0; index < rows.length; index += 1) {
    const row = [1, ...rows[index]];
    const target = targets[index];

    for (let a = 0; a < width; a += 1) {
      vector[a] += row[a] * target;
      for (let b = 0; b < width; b += 1) {
        matrix[a][b] += row[a] * row[b];
      }
    }
  }

  for (let a = 1; a < width; a += 1) {
    matrix[a][a] += RIDGE_LAMBDA * rows.length;
  }

  const solution = solveLinearSystem(matrix, vector);
  return {
    intercept: solution[0],
    coefficients: solution.slice(1),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function main() {
  const samples = Array.from({ length: SAMPLE_COUNT }, buildFactors);
  const rows = samples.map((factors) => [factors.damage, factors.road, factors.weather, factors.density]);

  const items = ITEMS.map((item) => {
    const standardPerPerson = STANDARD_PER_PERSON[item.aidItemId] ?? 0;

    const absoluteTargets = samples.map((factors) => {
      const base = baseQuantity(item, factors, standardPerPerson);
      const noise = 0.97 + random() * 0.06;
      return clamp(Math.round(base * item.factor(factors) * noise), item.min, item.max);
    });

    // Target regresi adalah faktor penyesuaian, bukan angka absolut.
    const factorTargets = samples.map((factors, index) => {
      const base = baseQuantity(item, factors, standardPerPerson);
      if (base <= 0) return 1;
      return absoluteTargets[index] / base;
    });

    const model = trainRidge(rows, factorTargets);

    const predictions = samples.map((factors, index) => {
      const base = baseQuantity(item, factors, standardPerPerson);
      const factor = model.intercept + model.coefficients.reduce(
        (sum, coefficient, featureIndex) => sum + coefficient * rows[index][featureIndex],
        0,
      );
      return clamp(Math.round(base * factor), item.min, item.max);
    });

    const targetMean = mean(absoluteTargets);
    const ssTotal = absoluteTargets.reduce((sum, target) => sum + (target - targetMean) ** 2, 0);
    const ssResidual = absoluteTargets.reduce(
      (sum, target, index) => sum + (target - predictions[index]) ** 2,
      0,
    );
    const r2 = ssTotal === 0 ? 1 : 1 - ssResidual / ssTotal;
    const rmse = Math.sqrt(ssResidual / absoluteTargets.length);

    console.log(
      `${item.name.padEnd(28)} R² ${r2.toFixed(4)}  RMSE ${rmse.toFixed(2)}  faktor ${model.intercept.toFixed(3)}`,
    );

    return {
      aidItemId: item.aidItemId,
      name: item.name,
      unit: item.unit,
      baseKind: item.baseKind,
      min: item.min,
      max: item.max,
      intercept: Number(model.intercept.toFixed(8)),
      coefficients: model.coefficients.map((value) => Number(value.toFixed(8))),
    };
  });

  return {
    modelVersion: MODEL_VERSION,
    trainedAt: "2026-11-08",
    sampleCount: SAMPLE_COUNT,
    features: FEATURES,
    items,
  };
}

const model = main();
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(model, null, 2)}\n`, "utf8");
console.log(`\nModel ${model.modelVersion} ditulis ke ${path.relative(root, outputPath)}`);
