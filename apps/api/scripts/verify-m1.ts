import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { DEMO_PASSWORD, SURABAYA_BOUNDS, SURABAYA_REGION_COUNT } from "@sialokasi/shared";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ClockService } from "../src/clock";
import { seedDatabase } from "../prisma/seed";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

const prisma = new PrismaClient();
const failures: string[] = [];
const passes: string[] = [];

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    passes.push(label);
    console.log(`  OK    ${label}${detail ? ` (${detail})` : ""}`);
  } else {
    failures.push(label);
    console.error(`  GAGAL ${label}${detail ? ` (${detail})` : ""}`);
  }
}

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(fullPath)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function findInFiles(dir: string, pattern: RegExp, skip: string[] = []): Promise<string[]> {
  const files = await listSourceFiles(dir);
  const hits: string[] = [];

  for (const file of files) {
    if (skip.some((skipped) => file.endsWith(skipped))) continue;
    const contents = await readFile(file, "utf8");
    if (pattern.test(contents)) {
      hits.push(path.relative(root, file));
    }
  }

  return hits;
}

async function main(): Promise<void> {
  console.log("Pemeriksaan M1 — Pondasi, UI Matang, Seed Bersih\n");
  await seedDatabase(prisma);

  console.log("[1] Data master dan kondisi bersih");
  const [aidItems, regions, poskos, users, incidents, recommendations, decisions, permits, logs, clock] =
    await Promise.all([
      prisma.aidItem.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.region.findMany(),
      prisma.posko.findMany(),
      prisma.user.findMany(),
      prisma.incident.count(),
      prisma.recommendation.count(),
      prisma.decision.count(),
      prisma.permit.count(),
      prisma.incidentLog.count(),
      prisma.demoClock.findUnique({ where: { id: 1 } }),
    ]);

  check("10 jenis bantuan", aidItems.length === 10, `${aidItems.length} baris`);
  check(
    `${SURABAYA_REGION_COUNT} kecamatan`,
    regions.length === SURABAYA_REGION_COUNT,
    `${regions.length} baris`,
  );
  check("3 posko", poskos.length === 3, `${poskos.length} baris`);
  check("3 akun demo", users.length === 3, `${users.length} baris`);
  check("0 laporan kejadian", incidents === 0, `${incidents} baris`);
  check("0 rekomendasi", recommendations === 0, `${recommendations} baris`);
  check("0 keputusan", decisions === 0, `${decisions} baris`);
  check("0 izin distribusi", permits === 0, `${permits} baris`);
  check("0 riwayat status", logs === 0, `${logs} baris`);
  check("waktu demo mulai dari 0", clock?.offsetMinutes === 0, `${clock?.offsetMinutes ?? "tidak ada"} menit`);

  console.log("\n[2] Kelengkapan data master");
  check(
    "semua jenis bantuan punya nama, satuan, dan ikon",
    aidItems.every((item) => item.name.length > 0 && item.unit.length > 0 && item.icon.length > 0),
  );
  check(
    "standar per jiwa tidak negatif",
    aidItems.every((item) => item.standardPerPerson >= 0),
  );
  check(
    "semua posko berada di area Surabaya",
    poskos.every(
      (posko) =>
        posko.lat >= SURABAYA_BOUNDS.minLat &&
        posko.lat <= SURABAYA_BOUNDS.maxLat &&
        posko.lng >= SURABAYA_BOUNDS.minLng &&
        posko.lng <= SURABAYA_BOUNDS.maxLng,
    ),
  );
  check(
    "akun demo memakai email domain demo",
    users.every((user) => user.email.endsWith("@sialokasi.demo")),
    users.map((user) => user.role).join(", "),
  );
  check(
    "setiap peran punya satu akun demo",
    ["PETUGAS", "PIMPINAN", "ADMIN"].every((role) => users.some((user) => user.role === role)),
  );
  check(
    "kata sandi akun demo disimpan sebagai hash",
    users.every((user) => user.passwordHash?.startsWith("scrypt:")),
    `${users.filter((user) => user.passwordHash?.startsWith("scrypt:")).length} dari ${users.length}`,
  );
  check(
    "kata sandi tidak tersimpan sebagai teks biasa",
    users.every((user) => !JSON.stringify(user).includes(DEMO_PASSWORD)),
  );

  console.log("\n[3] Aturan kode");
  const newDateHits = await findInFiles(
    path.join(root, "apps/api/src"),
    /new Date\s*\(/,
    ["clock.ts"],
  );
  check("waktu bisnis hanya lewat ClockService", newDateHits.length === 0, newDateHits.join(", "));

  const dialogHits = await findInFiles(
    path.join(root, "apps/web/src"),
    /window\.(alert|confirm|prompt)\s*\(/,
  );
  check("tidak ada dialog bawaan browser", dialogHits.length === 0, dialogHits.join(", "));

  const hexHits = await findInFiles(
    path.join(root, "apps/web/src"),
    /#[0-9a-fA-F]{3,8}\b/,
    ["theme.css", "map-illustration.tsx"],
  );
  check("tidak ada warna hex lepas di halaman", hexHits.length === 0, hexHits.join(", "));

  // Gaya teks: tanpa kalimat penggantung (AGENTS.md §7 "Batasan copy").
  const bannedCopy = [
    "Tentukan titik dan radius",
    "Pilih kejadian di peta atau daftar",
    "Sebutkan sendiri, misalnya",
    "Masih bisa disunting sebelum diajukan",
    "Sudah terkunci dan menunggu keputusan pimpinan",
    "Distribusi sudah dilakukan.",
    "Lima laporan terakhir dari akun Anda",
    "Isi faktor lapangan, lalu hitung estimasi",
    "bukan untuk menilai siapa yang salah",
    "Kecamatan terdampak · otomatis",
  ];
  const bannedPattern = new RegExp(
    bannedCopy.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  );
  const copyHits = await findInFiles(path.join(root, "apps/web/src"), bannedPattern);
  check(
    "tidak ada kalimat penggantung terlarang",
    copyHits.length === 0,
    copyHits.length > 0 ? copyHits.join(", ") : `${bannedCopy.length} frasa dipantau`,
  );

  const stepCopyHits = await findInFiles(
    path.join(root, "apps/web/src"),
    /(?:brief|hint)=\{?"?[^"}]*\b(?:lalu|untuk melihat|agar)\b/i,
  );
  check(
    "brief/hint tidak menulis ulang langkah pengguna",
    stepCopyHits.length === 0,
    stepCopyHits.join(", "),
  );

  // Server produksi memakai UTC; waktu yang tidak membawa zona wajib dibaca sebagai WIB.
  const clockService = new ClockService(prisma);
  const nowWib = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(" ", "T");
  const parsedNow = clockService.parseBusinessDate(nowWib);
  const businessNow = await clockService.now();
  check(
    "waktu kejadian 'sekarang' (WIB) tidak dianggap masa depan",
    !Number.isNaN(parsedNow.getTime()) &&
      parsedNow.getTime() <= businessNow.getTime() + 5 * 60_000 &&
      parsedNow.getTime() >= businessNow.getTime() - 5 * 60_000,
    `${nowWib} → ${parsedNow.toISOString()}`,
  );
  check(
    "waktu yang sudah membawa zona tidak diubah",
    clockService.parseBusinessDate("2026-11-13T04:00:00.000Z").toISOString() ===
      "2026-11-13T04:00:00.000Z",
  );

  console.log("\nRingkasan");
  console.log(`  ${passes.length} pemeriksaan lulus, ${failures.length} gagal`);

  if (failures.length > 0) {
    console.error("\nPerbaiki pemeriksaan yang gagal sebelum melanjutkan.");
    process.exitCode = 1;
  } else {
    console.log("\nM1 siap: pondasi, data master, dan aturan dasar terpenuhi.");
  }
}

main()
  .catch((error) => {
    console.error("Pemeriksaan M1 gagal dijalankan.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
