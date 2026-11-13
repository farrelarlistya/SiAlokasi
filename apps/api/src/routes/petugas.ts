import type { IncidentStatus, PrismaClient } from "@prisma/client";
import { INCIDENT_STATUSES } from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { requireRole } from "../lib/rbac";

type PetugasDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

export function registerPetugasRoutes(app: FastifyInstance, deps: PetugasDependencies): void {
  app.get(
    "/api/petugas/dashboard",
    { preHandler: requireRole(deps, "PETUGAS") },
    async (request) => {
      const reporterId = request.auth?.user.id ?? "";

      const [grouped, recent] = await Promise.all([
        deps.prisma.incident.groupBy({
          by: ["status"],
          where: { reporterId },
          _count: { _all: true },
        }),
        deps.prisma.incident.findMany({
          where: { reporterId },
          orderBy: { occurredAt: "desc" },
          take: 5,
          select: {
            id: true,
            code: true,
            title: true,
            disasterType: true,
            disasterDetail: true,
            status: true,
            occurredAt: true,
            affectedPeople: true,
            region: { select: { name: true } },
          },
        }),
      ]);

      const counts = Object.fromEntries(INCIDENT_STATUSES.map((status) => [status, 0])) as Record<
        IncidentStatus,
        number
      >;

      for (const row of grouped) {
        counts[row.status] = row._count._all;
      }

      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

      return {
        counts,
        total,
        recent: recent.map((incident) => ({
          ...incident,
          affectedPeople: incident.affectedPeople ?? 0,
        })),
        profile: request.auth?.user ?? null,
      };
    },
  );
}
