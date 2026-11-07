import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// Lokasi PostgreSQL 17 di mesin demo. Bisa diganti lewat variabel lingkungan.
const PG_DIR = process.env.PG_DIR ?? "C:\\Users\\farre\\pgsql\\17";
const PG_BIN = process.env.PG_BIN ?? path.join(PG_DIR, "bin");
const PG_DATA = process.env.PG_DATA ?? path.join(PG_DIR, "data");

function tool(name) {
  const withExtension = path.join(PG_BIN, `${name}.exe`);
  return existsSync(withExtension) ? withExtension : name;
}

function run(name, args, { quiet = false } = {}) {
  const result = spawnSync(tool(name), args, {
    stdio: quiet ? "ignore" : "inherit",
    windowsHide: true,
  });

  if (result.error) {
    console.error(`Tidak bisa menjalankan ${name}. Periksa PG_BIN (sekarang: ${PG_BIN}).`);
    console.error(result.error.message);
    process.exit(1);
  }

  return result.status ?? 1;
}

const command = process.argv[2] ?? "status";

if (command === "start") {
  if (!existsSync(PG_DATA)) {
    console.error(`Folder data PostgreSQL tidak ditemukan di ${PG_DATA}.`);
    process.exit(1);
  }

  const status = run("pg_isready", ["-h", "127.0.0.1", "-p", "5432"], { quiet: true });
  if (status === 0) {
    console.log("PostgreSQL sudah berjalan di 127.0.0.1:5432.");
    process.exit(0);
  }

  console.log(`Menyalakan PostgreSQL dari ${PG_DATA} ...`);
  const startStatus = run("pg_ctl", [
    "-D",
    PG_DATA,
    "-l",
    path.join(PG_DIR, "pg.log"),
    "start",
    "-w",
  ]);

  if (startStatus !== 0) {
    console.error("PostgreSQL gagal dinyalakan. Periksa pg.log di folder PostgreSQL.");
    process.exit(startStatus);
  }

  console.log("PostgreSQL siap di 127.0.0.1:5432.");
  process.exit(0);
}

if (command === "stop") {
  console.log("Menghentikan PostgreSQL ...");
  const status = run("pg_ctl", ["-D", PG_DATA, "stop", "-m", "fast", "-w"]);
  process.exit(status);
}

if (command === "status") {
  const status = run("pg_isready", ["-h", "127.0.0.1", "-p", "5432"]);
  process.exit(status);
}

console.error("Perintah tidak dikenal. Pakai: start, stop, atau status.");
process.exit(1);
