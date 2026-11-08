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
        note: "Ringkasan stok hanya untuk dilihat. Perubahan stok dilakukan di luar aplikasi.",
      };
    },
  );
}
