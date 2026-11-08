import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { requireRole } from "../lib/rbac";

type AdminSummaryDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

export function registerAdminSummaryRoutes(
  app: FastifyInstance,
  deps: AdminSummaryDependencies,
): void {
  const adminOnly = { preHandler: requireRole(deps, "ADMIN") };

  app.get("/api/admin/summary", adminOnly, async () => {
    const [
      pendingUsers,
      activeUsers,
      activeAidItems,
      activeRegions,
      activePoskos,
      incidents,
      recommendations,
      permits,
    ] = await Promise.all([
      deps.prisma.user.count({ where: { isActive: false } }),
      deps.prisma.user.count({ where: { isActive: true } }),
      deps.prisma.aidItem.count({ where: { isActive: true } }),
      deps.prisma.region.count({ where: { isActive: true } }),
      deps.prisma.posko.count({ where: { isActive: true } }),
      deps.prisma.incident.count(),
      deps.prisma.recommendation.count(),
      deps.prisma.permit.count(),
    ]);

    const audit = await deps.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        entity: true,
        entityId: true,
        action: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    });

    return {
      summary: {
        pendingUsers,
        activeUsers,
        activeAidItems,
        activeRegions,
        activePoskos,
        incidents,
        recommendations,
        permits,
      },
      audit: audit.map((entry) => ({
        id: entry.id,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        actorName: entry.actor?.name ?? "Pendaftaran mandiri",
        createdAt: entry.createdAt,
      })),
    };
  });
}
