import type { PrismaClient, Role } from "@prisma/client";
import type { ClockService } from "../clock";
import {
  createHash,
  randomBytes,
} from "node:crypto";

export const SESSION_COOKIE = "sialokasi_session";
export const SESSION_TTL_MINUTES = 12 * 60;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  regionId: string | null;
  regionName: string | null;
};

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  regionId: true,
  region: { select: { name: true } },
} as const;

type UserWithRegion = {
  id: string;
  name: string;
  email: string;
  role: Role;
  regionId: string | null;
  region: { name: string } | null;
};

export function toSessionUser(user: UserWithRegion): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    regionId: user.regionId,
    regionName: user.region?.name ?? null,
  };
}

export async function createSession(
  prisma: PrismaClient,
  userId: string,
  expiresAt: Date,
): Promise<string> {
  const token = createSessionToken();
  await prisma.session.create({
    data: {
      tokenHash: hashValue(token),
      userId,
      expiresAt,
    },
  });
  return token;
}

export async function resolveSession(
  prisma: PrismaClient,
  clock: ClockService,
  token: string,
): Promise<{ sessionId: string; user: SessionUser } | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashValue(token) },
    select: {
      id: true,
      expiresAt: true,
      user: { select: { ...userSelect, isActive: true } },
    },
  });

  if (!session) return null;

  const now = await clock.now();
  if (session.expiresAt.getTime() <= now.getTime() || !session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return {
    sessionId: session.id,
    user: toSessionUser(session.user),
  };
}
