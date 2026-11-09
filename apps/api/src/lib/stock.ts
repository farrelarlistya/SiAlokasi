import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { ClockService } from "../clock";
import { RequestError } from "./errors";

export type StockLine = {
  aidItemId: string;
  qty: number;
  name?: string;
  unit?: string;
};

type StockDependencies = {
  clock: ClockService;
  poskoId: string;
  poskoName: string;
  actorId: string | null;
  permitId: string;
  note: string;
};

async function aidItemNames(
  tx: Prisma.TransactionClient,
  aidItemIds: string[],
): Promise<Map<string, { name: string; unit: string }>> {
  if (aidItemIds.length === 0) return new Map();

  const rows = await tx.aidItem.findMany({
    where: { id: { in: aidItemIds } },
    select: { id: true, name: true, unit: true },
  });

  return new Map(rows.map((row) => [row.id, { name: row.name, unit: row.unit }]));
}

/**
 * Mengambil stok secara atomik. `UPDATE ... WHERE qty >= jumlah` memastikan dua
 * permintaan bersamaan tidak bisa membuat stok minus: satu berhasil, satu gagal.
 */
export async function reserveStock(
  tx: Prisma.TransactionClient,
  deps: StockDependencies,
  lines: StockLine[],
): Promise<void> {
  const sorted = [...lines]
    .filter((line) => line.qty > 0)
    .sort((a, b) => a.aidItemId.localeCompare(b.aidItemId));
  const names = await aidItemNames(
    tx,
    sorted.filter((line) => !line.name).map((line) => line.aidItemId),
  );
  const now = await deps.clock.now();

  for (const line of sorted) {
    const rows = await tx.$queryRaw<{ qty: number }[]>`
      UPDATE "stocks"
      SET "qty" = "qty" - ${line.qty}, "updatedAt" = NOW()
      WHERE "poskoId" = ${deps.poskoId}
        AND "aidItemId" = ${line.aidItemId}
        AND "qty" >= ${line.qty}
      RETURNING "qty"
    `;

    const balance = rows[0]?.qty;
    if (balance === undefined) {
      const info = names.get(line.aidItemId);
      const stock = await tx.stock.findUnique({
        where: {
          poskoId_aidItemId: {
            poskoId: deps.poskoId,
            aidItemId: line.aidItemId,
          },
        },
        select: { qty: true },
      });
      const available = stock?.qty ?? 0;
      const label = line.name ?? info?.name ?? "Bantuan";
      const unit = line.unit ?? info?.unit ?? "unit";
      throw new RequestError(
        409,
        `Stok ${label} di ${deps.poskoName} tidak cukup. Tersedia ${available} ${unit}, dibutuhkan ${line.qty} ${unit}. Pilih posko lain atau sesuaikan jumlah bantuan.`,
      );
    }

    await tx.stockMovement.create({
      data: {
        poskoId: deps.poskoId,
        aidItemId: line.aidItemId,
        qtyDelta: -line.qty,
        balanceAfter: balance,
        kind: "RESERVE",
        permitId: deps.permitId,
        actorId: deps.actorId,
        note: deps.note,
        createdAt: now,
      },
    });
  }
}

/** Mengembalikan stok saat izin lama digantikan oleh izin koreksi. */
export async function releaseStock(
  tx: Prisma.TransactionClient,
  deps: StockDependencies,
  lines: StockLine[],
): Promise<void> {
  const sorted = [...lines]
    .filter((line) => line.qty > 0)
    .sort((a, b) => a.aidItemId.localeCompare(b.aidItemId));
  const now = await deps.clock.now();

  for (const line of sorted) {
    const rows = await tx.$queryRaw<{ qty: number }[]>`
      INSERT INTO "stocks" ("id", "poskoId", "aidItemId", "qty", "updatedAt")
      VALUES (${randomUUID()}, ${deps.poskoId}, ${line.aidItemId}, ${line.qty}, NOW())
      ON CONFLICT ("poskoId", "aidItemId")
      DO UPDATE SET "qty" = "stocks"."qty" + EXCLUDED."qty", "updatedAt" = NOW()
      RETURNING "qty"
    `;

    const balance = rows[0]?.qty ?? 0;

    await tx.stockMovement.create({
      data: {
        poskoId: deps.poskoId,
        aidItemId: line.aidItemId,
        qtyDelta: line.qty,
        balanceAfter: balance,
        kind: "RELEASE",
        permitId: deps.permitId,
        actorId: deps.actorId,
        note: deps.note,
        createdAt: now,
      },
    });
  }
}
