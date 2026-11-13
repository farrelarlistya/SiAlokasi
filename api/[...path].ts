import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { FastifyInstance } from "fastify";
// Bundel dibuat oleh scripts/build-vercel-api.mjs saat build Vercel.
import { buildApp } from "../server/api-app.mjs";

let appPromise: Promise<FastifyInstance> | null = null;

async function getApp() {
  appPromise ??= buildApp();
  return appPromise;
}

/**
 * Teruskan permintaan ke Fastify dan tunggu respons benar-benar selesai.
 * Tanpa menunggu `finish`, fungsi Vercel bisa berhenti sebelum badan respons
 * terkirim (terlihat sebagai 400 tanpa isi pada permintaan POST).
 */
function dispatch(app: FastifyInstance, request: IncomingMessage, response: ServerResponse) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    response.once("finish", settle);
    response.once("close", settle);

    app.server.emit("request", request, response);

    if (response.writableEnded) settle();
  });
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
    const payload = Buffer.isBuffer(parsed.body)
      ? parsed.body
      : typeof parsed.body === "string"
        ? parsed.body
        : JSON.stringify(parsed.body);
    const stream = Readable.from([payload]) as unknown as IncomingMessage;
    Object.assign(stream, {
      // Samakan content-length dengan isi yang benar-benar dikirim ulang.
      headers: { ...req.headers, "content-length": String(Buffer.byteLength(payload)) },
      method: req.method,
      url: req.url,
      httpVersion: "1.1",
      socket: req.socket,
      connection: req.socket,
      complete: true,
    });
    await dispatch(app, stream, res);
    return;
  }

  await dispatch(app, req, res);
}
