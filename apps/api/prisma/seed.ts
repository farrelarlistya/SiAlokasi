import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AID_ITEMS, DEMO_USERS, POSKOS, REGIONS, STOCKS } from "./seed-data";

export type SeedResult = {
  users: number;
  regions: number;
  poskos: number;
  aidItems: number;
  stocks: number;
  incidents: number;
};

/**
 * Menyiapkan data master dan memastikan tidak ada riwayat transaksi.
 * Aman dijalankan berulang kali (idempoten) dan dipakai juga oleh `demo:reset`.
 */
export async function seedDatabase(prisma: PrismaClient): Promise<SeedResult> {
  await prisma.$transaction([
    prisma.permit.deleteMany(),
    prisma.decision.deleteMany(),
    prisma.recommendationItem.deleteMany(),
    prisma.recommendation.deleteMany(),
    prisma.incidentLog.deleteMany(),
    prisma.incident.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.otpCode.deleteMany(),
  ]);

  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, isActive: true },
      create: user,
    });
  }

  for (const region of REGIONS) {
    await prisma.region.upsert({
      where: { id: region.id },
      update: { name: region.name },
      create: region,
    });
  }

  for (const posko of POSKOS) {
    await prisma.posko.upsert({
      where: { id: posko.id },
      update: {
        name: posko.name,
        regionId: posko.regionId,
        lat: posko.lat,
        lng: posko.lng,
        isActive: true,
      },
      create: posko,
    });
  }

  for (const item of AID_ITEMS) {
    await prisma.aidItem.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        unit: item.unit,
        icon: item.icon,
        standardPerPerson: item.standardPerPerson,
        sortOrder: item.sortOrder,
        isActive: true,
      },
      create: item,
    });
  }

  for (const stock of STOCKS) {
    await prisma.stock.upsert({
      where: { poskoId_aidItemId: { poskoId: stock.poskoId, aidItemId: stock.aidItemId } },
      update: { qty: stock.qty },
      create: stock,
    });
  }

  await prisma.demoClock.upsert({
    where: { id: 1 },
    update: { offsetMinutes: 0 },
    create: { id: 1, offsetMinutes: 0 },
  });

  const [users, regions, poskos, aidItems, stocks, incidents] = await Promise.all([
    prisma.user.count(),
    prisma.region.count(),
    prisma.posko.count(),
    prisma.aidItem.count(),
    prisma.stock.count(),
    prisma.incident.count(),
  ]);

  return { users, regions, poskos, aidItems, stocks, incidents };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  const prisma = new PrismaClient();
  try {
    const result = await seedDatabase(prisma);
    console.log("Data awal siap:");
    console.log(`  ${result.users} akun demo`);
    console.log(`  ${result.regions} kecamatan`);
    console.log(`  ${result.poskos} posko`);
    console.log(`  ${result.aidItems} jenis bantuan`);
    console.log(`  ${result.stocks} baris stok`);
    console.log(`  ${result.incidents} laporan kejadian (harus 0)`);
  } catch (error) {
    console.error("Data awal gagal disiapkan.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
