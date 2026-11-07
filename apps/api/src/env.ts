import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL belum diisi. Salin apps/api/.env.example menjadi apps/api/.env."),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.string().default("info"),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  DEMO_MODE: z
    .string()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `- ${issue.message}`).join("\n");
  throw new Error(`Konfigurasi server belum lengkap:\n${message}`);
}

export const env = parsed.data;
