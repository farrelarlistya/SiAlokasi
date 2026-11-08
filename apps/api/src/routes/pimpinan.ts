import type { IncidentStatus, PrismaClient } from "@prisma/client";
import { ACTIVE_INCIDENT_STATUSES } from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { requireRole } from "../lib/rbac";

type PimpinanDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

export function registerPimpinanRoutes(
  app: FastifyInstance,
  deps: PimpinanDependencies,
): void {
  app.get(
    "/api/pimpinan/summary",
    { preHandler: requireRole(deps, "PIMPINAN") },
    async () => {
      const activeStatuses = [...ACTIVE_INCIDENT_STATUSES] as IncidentStatus[];
      const startOfToday = await deps.clock.startOfDayJakarta();

      const [waitingCount, activeCount, affected, permitsToday, waitingAid, queue, poskos] =
        await Promise.all([
          deps.prisma.incident.count({ where: { status: "MENUNGGU_PERSETUJUAN" } }),
          deps.prisma.incident.count({ where: { status: { in: activeStatuses } } }),
          deps.prisma.incident.aggregate({
            where: { status: { in: activeStatuses } },
            _sum: { affectedPeople: true },
          }),
          deps.prisma.permit.count({ where: { issuedAt: { gte: startOfToday } } }),
          deps.prisma.recommendationItem.aggregate({
            where: {
              recommendation: {
                isActive: true,
                incident: { status: "MENUNGGU_PERSETUJUAN" },
              },
            },
            _sum: { finalQty: true },
          }),
          deps.prisma.incident.findMany({
            where: { status: "MENUNGGU_PERSETUJUAN" },
            orderBy: { occurredAt: "asc" },
            take: 20,
            select: {
              id: true,
              code: true,
              title: true,
              disasterType: true,
              status: true,
              occurredAt: true,
              affectedPeople: true,
              radiusM: true,
              lat: true,
              lng: true,
              region: { select: { name: true } },
              reporter: { select: { name: true } },
            },
          }),
          deps.prisma.posko.findMany({
            where: { isActive: true },
            select: {
              id: true,
              stocks: {
                where: { aidItem: { isActive: true } },
                select: { aidItemId: true, qty: true },
              },
            },
          }),
        ]);

      const maxByItem = new Map<string, number>();
      for (const posko of poskos) {
        for (const stock of posko.stocks) {
          maxByItem.set(stock.aidItemId, Math.max(maxByItem.get(stock.aidItemId) ?? 0, stock.qty));
        }
      }

      let lowStockCount = 0;
      for (const posko of poskos) {
        for (const stock of posko.stocks) {
          const max = maxByItem.get(stock.aidItemId) ?? 0;
          if (max > 0 && stock.qty <= max * 0.2) {
            lowStockCount += 1;
          }
        }
      }

      return {
        summary: {
          waitingCount,
          activeCount,
          affectedPeople: affected._sum.affectedPeople ?? 0,
          permitsToday,
          lowStockCount,
          waitingAidTotal: waitingAid._sum.finalQty ?? 0,
        },
        queue: queue.map((incident) => ({
          ...incident,
          affectedPeople: incident.affectedPeople ?? 0,
        })),
      };
    },
  );
}
