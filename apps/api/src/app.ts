import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { ClockService } from "./clock";
import { env } from "./env";
import { prisma } from "./prisma";
import { registerAdminAidItemRoutes } from "./routes/admin-aid-items";
import { registerAdminAuditRoutes } from "./routes/admin-audit";
import { registerAdminPoskoRoutes } from "./routes/admin-poskos";
import { registerAdminRegionRoutes } from "./routes/admin-regions";
import { registerAdminSummaryRoutes } from "./routes/admin-summary";
import { registerAdminUserRoutes } from "./routes/admin-users";
import { registerAuthRoutes } from "./routes/auth";
import { registerDevRoutes } from "./routes/dev";
import { registerHealthRoutes } from "./routes/health";
import { registerMasterRoutes } from "./routes/master";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerPetugasIncidentRoutes } from "./routes/petugas-incidents";
import { registerPetugasRoutes } from "./routes/petugas";
import { registerPimpinanIncidentRoutes } from "./routes/pimpinan-incidents";
import { registerPimpinanRecapRoutes } from "./routes/pimpinan-recap";
import { registerPimpinanRoutes } from "./routes/pimpinan";
import { registerPublicRoutes } from "./routes/public";
import { registerStockRoutes } from "./routes/stock";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    trustProxy: env.TRUST_PROXY,
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return payload;
  });

  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  await app.register(cookie);

  const clock = new ClockService(prisma);

  registerHealthRoutes(app, { prisma, clock, demoMode: env.DEMO_MODE });
  registerAuthRoutes(app, { prisma, clock, demoMode: env.DEMO_MODE });
  registerNotificationRoutes(app, { prisma, clock });
  registerMasterRoutes(app, { prisma });
  registerPublicRoutes(app, { prisma });
  registerPetugasRoutes(app, { prisma, clock });
  registerPetugasIncidentRoutes(app, { prisma, clock });
  registerPimpinanRoutes(app, { prisma, clock });
  registerPimpinanIncidentRoutes(app, { prisma, clock });
  registerPimpinanRecapRoutes(app, { prisma, clock });
  registerStockRoutes(app, { prisma, clock });
  registerAdminSummaryRoutes(app, { prisma, clock });
  registerAdminAuditRoutes(app, { prisma, clock });
  registerAdminUserRoutes(app, { prisma, clock });
  registerAdminAidItemRoutes(app, { prisma, clock });
  registerAdminRegionRoutes(app, { prisma, clock });
  registerAdminPoskoRoutes(app, { prisma, clock });
  registerDevRoutes(app, { prisma, clock, demoMode: env.DEMO_MODE });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      error: { message: "Halaman yang diminta tidak ditemukan." },
    });
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Permintaan gagal diproses");
    const statusCode = error.statusCode ?? 500;
    const message =
      statusCode < 500
        ? error.message
        : "Data belum bisa dimuat. Coba lagi sebentar, atau hubungi admin.";

    reply.status(statusCode).send({ error: { message } });
  });

  return app;
}
