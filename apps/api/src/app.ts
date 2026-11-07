import cors from "@fastify/cors";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { ClockService } from "./clock";
import { env } from "./env";
import { prisma } from "./prisma";
import { registerHealthRoutes } from "./routes/health";
import { registerMasterRoutes } from "./routes/master";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  });

  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  const clock = new ClockService(prisma);

  registerHealthRoutes(app, { prisma, clock, demoMode: env.DEMO_MODE });
  registerMasterRoutes(app, { prisma });

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
