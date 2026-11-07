import { buildApp } from "./app";
import { env } from "./env";
import { prisma } from "./prisma";

const app = await buildApp();

async function shutdown(signal: string): Promise<void> {
  app.log.info(`Menerima ${signal}, menutup server.`);
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
