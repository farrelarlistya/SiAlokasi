import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

type MasterDependencies = {
  prisma: PrismaClient;
};

export function registerMasterRoutes(app: FastifyInstance, deps: MasterDependencies): void {
  app.get("/api/master/summary", async () => {
    const [aidItems, regions, poskos, incidents] = await Promise.all([
      deps.prisma.aidItem.count({ where: { isActive: true } }),
      deps.prisma.region.count(),
      deps.prisma.posko.count({ where: { isActive: true } }),
      deps.prisma.incident.count(),
    ]);

    return { aidItems, regions, poskos, incidents };
  });

  app.get("/api/master/options", async () => {
    const [aidItems, regions, poskos] = await Promise.all([
      deps.prisma.aidItem.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, unit: true, icon: true, standardPerPerson: true },
      }),
      deps.prisma.region.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      deps.prisma.posko.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          lat: true,
          lng: true,
          region: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { aidItems, regions, poskos };
  });
}
