import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { requireRole } from "../lib/rbac";

type StockDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

export function registerStockRoutes(app: FastifyInstance, deps: StockDependencies): void {
  app.get(
    "/api/stock/summary",
    { preHandler: requireRole(deps, "ADMIN", "PIMPINAN") },
    async () => {
      const [aidItems, poskos] = await Promise.all([
        deps.prisma.aidItem.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, unit: true, icon: true, sortOrder: true },
        }),
        deps.prisma.posko.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            region: { select: { name: true } },
            stocks: {
              where: { aidItem: { isActive: true } },
              select: { aidItemId: true, qty: true },
            },
          },
        }),
      ]);

      return {
        aidItems,
        poskos: poskos.map((posko) => ({
          id: posko.id,
          name: posko.name,
          regionName: posko.region.name,
          stocks: posko.stocks,
        })),
        note: "Stok berkurang otomatis saat izin distribusi terbit. Setiap perubahan tercatat di jurnal stok dan tidak bisa dihapus.",
      };
    },
  );

  app.get(
    "/api/stock/movements",
    { preHandler: requireRole(deps, "ADMIN", "PIMPINAN") },
    async (request) => {
      const query = request.query as { limit?: string };
      const parsedLimit = Number.parseInt(query.limit ?? "40", 10);
      const limit = Number.isFinite(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 100)
        : 40;

      const movements = await deps.prisma.stockMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          poskoId: true,
          posko: { select: { name: true } },
          aidItemId: true,
          aidItem: { select: { name: true, unit: true } },
          qtyDelta: true,
          balanceAfter: true,
          kind: true,
          permit: { select: { number: true } },
          actor: { select: { name: true } },
          note: true,
          createdAt: true,
        },
      });

      return {
        movements: movements.map((movement) => ({
          id: movement.id,
          poskoId: movement.poskoId,
          poskoName: movement.posko.name,
          aidItemId: movement.aidItemId,
          aidItemName: movement.aidItem.name,
          unit: movement.aidItem.unit,
          qtyDelta: movement.qtyDelta,
          balanceAfter: movement.balanceAfter,
          kind: movement.kind,
          permitNumber: movement.permit?.number ?? null,
          actorName: movement.actor?.name ?? null,
          note: movement.note,
          createdAt: movement.createdAt.toISOString(),
        })),
        note: "Jurnal stok hanya menerima penambahan; baris lama tidak bisa diubah atau dihapus.",
      };
    },
  );
}
