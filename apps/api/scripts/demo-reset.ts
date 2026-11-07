import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../prisma/seed";

const prisma = new PrismaClient();
const startedAt = Date.now();

try {
  const result = await seedDatabase(prisma);
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(`Demo direset dalam ${seconds} detik.`);
  console.log(`  ${result.aidItems} jenis bantuan, ${result.regions} kecamatan, ${result.poskos} posko`);
  console.log(`  ${result.incidents} laporan kejadian (kembali ke 0)`);
  console.log("  Waktu demo kembali ke sekarang (offset 0).");
} catch (error) {
  console.error("Reset demo gagal. Pastikan database menyala dengan `npm run db:start`.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
