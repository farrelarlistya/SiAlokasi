import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";

type HealthDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
  demoMode: boolean;
};

export function registerHealthRoutes(app: FastifyInstance, deps: HealthDependencies): void {
  app.get("/api/health", async () => {
    let database: "ok" | "down" = "ok";
    try {
      await deps.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }

    const now = await deps.clock.now();

    return {
      ok: database === "ok",
      service: "SiAlokasi",
      version: "0.1.0",
      time: now.toISOString(),
      demoMode: deps.demoMode,
      database,
    };
  });
}
