import type { PrismaClient } from "@prisma/client";
import { loginSchema, registerPetugasSchema } from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import {
  createSession,
  hashValue,
  SESSION_COOKIE,
  SESSION_TTL_MINUTES,
  toSessionUser,
  userSelect,
} from "../lib/auth";
import { writeAudit } from "../lib/audit";
import { hashPassword, verifyPassword } from "../lib/password";
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
  app.post("/api/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    const { email, password } = parsed.data;
    const user = await deps.prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, isActive: true, passwordHash: true },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply.code(401).send({
        error: {
          message: "Email atau kata sandi belum cocok. Periksa kembali, lalu coba lagi.",
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

    const { name, email, password, regionId } = parsed.data;
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
            "Email ini sudah terdaftar dan aktif. Masuk memakai email dan kata sandi Anda, atau daftar dengan email lain.",
        },
      });
    }

    if (existing) {
      await deps.prisma.user.update({
        where: { id: existing.id },
        data: { name, regionId, passwordHash: hashPassword(password) },
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
          "Pendaftaran Anda sudah tercatat sebelumnya. Admin akan mengaktifkan akun ini; setelah aktif, masuk memakai email dan kata sandi yang Anda pilih.",
      });
    }

    const user = await deps.prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
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
        "Pendaftaran terkirim. Admin akan mengaktifkan akun Anda; setelah aktif, masuk memakai email dan kata sandi yang Anda pilih.",
    });
  });
}
