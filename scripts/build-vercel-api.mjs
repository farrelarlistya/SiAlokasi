import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

/**
 * Vercel tidak menjalankan tsx. Skrip ini membundel API (termasuk paket
 * workspace `@sialokasi/shared`) menjadi satu berkas ESM, sementara Prisma
 * dibiarkan eksternal agar mesin query-nya ikut dilacak oleh Vercel.
 */
await mkdir("server", { recursive: true });

await build({
  entryPoints: ["apps/api/src/app.ts"],
  outfile: "server/api-app.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: false,
  legalComments: "none",
  external: ["@prisma/client"],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});

console.log("server/api-app.mjs siap.");
