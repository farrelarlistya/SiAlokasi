import type { PrismaClient } from "@prisma/client";
import { loginSchema, otpRequestSchema, registerPetugasSchema } from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import { randomInt } from "node:crypto";
import type { ClockService } from "../clock";
import {
  createSession,
  DEMO_CODE,
  hashValue,
  SESSION_COOKIE,
  SESSION_TTL_MINUTES,
  toSessionUser,
  userSelect,
} from "../lib/auth";
import { writeAudit } from "../lib/audit";
import { getSessionUser } from "../lib/rbac";

type AuthDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
  demoMode: boolean;
};

function sessionCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MINUTES * 60,
  };
}

function firstIssueMessage(result: {
  success: false;
  error: { issues: { message: string }[] };
}): string {
  return result.error.issues[0]?.message ?? "Isian belum lengkap. Periksa kembali.";
}

export function registerAuthRoutes(app: FastifyInstance, deps: AuthDependencies): void {
  app.post("/api/auth/request-code", async (request, reply) => {
    const parsed = otpRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    const { email } = parsed.data;
    const user = await deps.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return {
        sent: true,
        demoMode: deps.demoMode,
        demoCode: deps.demoMode ? DEMO_CODE : undefined,
        message:
          "Kalau email ini terdaftar, kode masuk akan dikirim dalam satu menit. Periksa juga folder spam.",
      };
    }

    if (!user.isActive) {
      return reply.code(403).send({
        error: {
          message:
            "Akun ini belum diaktifkan admin. Hubungi admin wilayah agar akun Anda bisa dipakai.",
        },
      });
    }

    const code = deps.demoMode ? DEMO_CODE : String(randomInt(0, 1_000_000)).padStart(6, "0");
    const now = await deps.clock.now();

    await deps.prisma.otpCode.deleteMany({ where: { userId: user.id, usedAt: null } });
    await deps.prisma.otpCode.create({
      data: {
        userId: user.id,
        codeHash: hashValue(code),
        expiresAt: await deps.clock.afterMinutes(10),
        createdAt: now,
      },
    });

    if (!deps.demoMode) {
      // Pengiriman asli belum dipasang; adapter notifikasi menulis ke log server.
      request.log.info({ email }, `Kode masuk untuk ${email}: ${code}`);
    }

    return {
      sent: true,
      demoMode: deps.demoMode,
      demoCode: deps.demoMode ? DEMO_CODE : undefined,
      message: deps.demoMode
        ? "Mode demo aktif. Gunakan kode 123456 untuk masuk."
        : "Kode masuk sudah dikirim. Kode berlaku 10 menit.",
    };
  });

  app.post("/api/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    const { email, code } = parsed.data;
    const user = await deps.prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, isActive: true },
    });

    if (!user) {
      return reply.code(401).send({
        error: {
          message: "Email dan kode masuk belum cocok. Periksa kembali, lalu coba lagi.",
        },
      });
    }

    if (!user.isActive) {
      return reply.code(403).send({
        error: {
          message:
            "Akun ini belum diaktifkan admin. Hubungi admin wilayah agar akun Anda bisa dipakai.",
        },
      });
    }

    const now = await deps.clock.now();
    let accepted = deps.demoMode && code === DEMO_CODE;

    if (!accepted) {
      const otp = await deps.prisma.otpCode.findFirst({
        where: {
          userId: user.id,
          codeHash: hashValue(code),
          usedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      });

      if (otp) {
        await deps.prisma.otpCode.update({
          where: { id: otp.id },
          data: { usedAt: now },
        });
        accepted = true;
      }
    }

    if (!accepted) {
      return reply.code(401).send({
        error: {
          message:
            "Kode masuk belum cocok atau sudah kedaluwarsa. Minta kode baru, lalu masukkan lagi.",
        },
      });
    }

    const token = await createSession(
      deps.prisma,
      user.id,
      await deps.clock.afterMinutes(SESSION_TTL_MINUTES),
    );

    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions());

    return {
      user: toSessionUser(user),
      message: `Selamat datang, ${user.name}.`,
    };
  });

  app.get("/api/auth/me", async (request) => {
    const user = await getSessionUser({ prisma: deps.prisma, clock: deps.clock }, request);
    return { user };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) {
      await deps.prisma.session
        .deleteMany({ where: { tokenHash: hashValue(token) } })
        .catch(() => undefined);
    }

    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { message: "Anda sudah keluar. Sampai jumpa lagi." };
  });

  app.post("/api/auth/register", async (request, reply) => {
    const parsed = registerPetugasSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    const { name, email, regionId } = parsed.data;
    const region = await deps.prisma.region.findFirst({
      where: { id: regionId, isActive: true },
      select: { id: true, name: true },
    });

    if (!region) {
      return reply.code(400).send({
        error: {
          message: "Kecamatan yang dipilih belum tersedia. Pilih kecamatan lain di daftar.",
        },
      });
    }

    const existing = await deps.prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });

    if (existing?.isActive) {
      return reply.code(409).send({
        error: {
          message:
            "Email ini sudah terdaftar dan aktif. Masuk dengan kode, atau daftar memakai email lain.",
        },
      });
    }

    if (existing) {
      await deps.prisma.user.update({
        where: { id: existing.id },
        data: { name, regionId },
      });

      await writeAudit(deps.prisma, deps.clock, {
        entity: "User",
        entityId: existing.id,
        action: "REGISTER_ULANG",
        actorId: null,
        after: { name, email, regionId, role: "PETUGAS", isActive: false },
      });

      return reply.code(200).send({
        message:
          "Pendaftaran Anda sudah tercatat sebelumnya. Admin akan mengaktifkan akun ini; Anda bisa masuk setelah menerima pemberitahuan.",
      });
    }

    const user = await deps.prisma.user.create({
      data: {
        name,
        email,
        role: "PETUGAS",
        isActive: false,
        regionId,
      },
      select: { id: true, name: true, email: true },
    });

    await writeAudit(deps.prisma, deps.clock, {
      entity: "User",
      entityId: user.id,
      action: "REGISTER",
      actorId: null,
      after: { name: user.name, email: user.email, regionId, role: "PETUGAS", isActive: false },
    });

    return reply.code(201).send({
      message:
        "Pendaftaran terkirim. Admin akan mengaktifkan akun Anda. Setelah aktif, masuk memakai email dan kode dari admin.",
    });
  });
}
