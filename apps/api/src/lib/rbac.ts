import type { Role } from "@prisma/client";
import { ROLE_LABEL } from "@sialokasi/shared";
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import type { ClockService } from "../clock";
import type { PrismaClient } from "@prisma/client";
import { resolveSession, SESSION_COOKIE, type SessionUser } from "./auth";

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      sessionId: string;
      user: SessionUser;
    };
  }
}

type AuthDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

export function requireRole(
  deps: AuthDependencies,
  ...roles: Role[]
): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) {
      await reply.code(401).send({
        error: {
          message: "Sesi Anda belum aktif. Silakan masuk terlebih dahulu.",
        },
      });
      return;
    }

    const session = await resolveSession(deps.prisma, deps.clock, token);
    if (!session) {
      await reply.code(401).send({
        error: {
          message: "Sesi Anda sudah berakhir. Silakan masuk lagi.",
        },
      });
      return;
    }

    if (!roles.includes(session.user.role)) {
      const allowed = roles.map((role) => ROLE_LABEL[role]).join(" atau ");
      await reply.code(403).send({
        error: {
          message: `Halaman ini hanya bisa dibuka oleh ${allowed}.`,
        },
      });
      return;
    }

    request.auth = session;
  };
}

export async function getSessionUser(
  deps: AuthDependencies,
  request: FastifyRequest,
): Promise<SessionUser | null> {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = await resolveSession(deps.prisma, deps.clock, token);
  return session?.user ?? null;
}
