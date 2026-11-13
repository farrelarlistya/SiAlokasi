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

      const [waitingCount, activeCount, affected, permitsToday, queue, approved, poskos] =
        await Promise.all([
          deps.prisma.incident.count({ where: { status: "MENUNGGU_PERSETUJUAN" } }),
          deps.prisma.incident.count({ where: { status: { in: activeStatuses } } }),
          deps.prisma.incident.aggregate({
            where: { status: { in: activeStatuses } },
            _sum: { affectedPeople: true },
          }),
          deps.prisma.permit.count({ where: { issuedAt: { gte: startOfToday } } }),
          deps.prisma.incident.findMany({
            where: { status: "MENUNGGU_PERSETUJUAN" },
            orderBy: { occurredAt: "asc" },
            take: 20,
            select: {
              id: true,
              code: true,
              title: true,
              disasterType: true,
              disasterDetail: true,
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
          deps.prisma.incident.findMany({
            where: { status: "DISETUJUI" },
            orderBy: { updatedAt: "desc" },
            take: 10,
            select: {
              id: true,
              code: true,
              title: true,
              disasterType: true,
              disasterDetail: true,
              occurredAt: true,
              updatedAt: true,
              region: { select: { name: true } },
              permits: {
                orderBy: { issuedAt: "desc" },
                take: 1,
                select: {
                  number: true,
                  posko: { select: { name: true } },
                },
              },
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

      // Rincian bantuan yang menunggu keputusan, dipecah per jenis dan satuan
      // supaya angkanya bisa dibaca (jumlah campuran satuan tidak bermakna).
      const waitingRows = await deps.prisma.recommendationItem.findMany({
        where: {
          recommendation: {
            isActive: true,
            incident: { status: "MENUNGGU_PERSETUJUAN" },
          },
        },
        select: {
          finalQty: true,
          unit: true,
          aidItem: { select: { name: true, sortOrder: true } },
        },
      });

      const waitingMap = new Map<
        string,
        { name: string; unit: string; qty: number; sortOrder: number }
      >();
      for (const row of waitingRows) {
        const key = `${row.aidItem.name}|${row.unit}`;
        const current = waitingMap.get(key);
        if (current) {
          current.qty += row.finalQty;
        } else {
          waitingMap.set(key, {
            name: row.aidItem.name,
            unit: row.unit,
            qty: row.finalQty,
            sortOrder: row.aidItem.sortOrder,
          });
        }
      }
      const waitingAid = [...waitingMap.values()].sort(
        (left, right) => left.sortOrder - right.sortOrder,
      );

      return {
        summary: {
          waitingCount,
          activeCount,
          affectedPeople: affected._sum.affectedPeople ?? 0,
          permitsToday,
          lowStockCount,
        },
        waitingAid: {
          itemCount: waitingAid.length,
          items: waitingAid.map(({ name, unit, qty }) => ({ name, unit, qty })),
        },
        queue: queue.map((incident) => ({
          ...incident,
          affectedPeople: incident.affectedPeople ?? 0,
        })),
        approved: approved.map((incident) => {
          const permit = incident.permits[0] ?? null;
          return {
            id: incident.id,
            code: incident.code,
            title: incident.title,
            disasterType: incident.disasterType,
            disasterDetail: incident.disasterDetail,
            occurredAt: incident.occurredAt.toISOString(),
            approvedAt: incident.updatedAt.toISOString(),
            regionName: incident.region?.name ?? null,
            permitNumber: permit?.number ?? null,
            poskoName: permit?.posko.name ?? null,
          };
        }),
      };
    },
  );
}
