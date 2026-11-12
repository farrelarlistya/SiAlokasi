import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
// Bundel dibuat oleh scripts/build-vercel-api.mjs saat build Vercel.
import { buildApp } from "../server/api-app.mjs";

let appPromise: ReturnType<typeof buildApp> | null = null;

async function getApp() {
  appPromise ??= buildApp();
  return appPromise;
}

/**
 * Vercel Node Function untuk seluruh /api/*. Fastify menangani permintaan
 * setelah app.ready(); tidak ada app.listen di lingkungan serverless.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  await app.ready();

  const parsed = req as IncomingMessage & { body?: unknown };

  if (parsed.body !== undefined) {
    // Sebagian runtime Vercel sudah membaca body. Umpan balikkan sebagai stream
    // agar Fastify tetap bisa memvalidasi JSON seperti di server biasa.
    const payload =
      typeof parsed.body === "string" ? parsed.body : JSON.stringify(parsed.body);
    const stream = Readable.from([payload]) as unknown as IncomingMessage;
    Object.assign(stream, {
      headers: req.headers,
      method: req.method,
      url: req.url,
      httpVersion: "1.1",
      socket: req.socket,
      connection: req.socket,
      complete: true,
    });
    app.server.emit("request", stream, res);
    return;
  }

  app.server.emit("request", req, res);
}
