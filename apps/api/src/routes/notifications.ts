import type { Prisma, PrismaClient } from "@prisma/client";
import {
  NOTIFICATION_KINDS,
  notificationReadSchema,
  type NotificationKind,
  type NotificationListResponse,
} from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { firstIssueMessage } from "../lib/errors";
import { requireRole } from "../lib/rbac";

type NotificationDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

function readKind(value: string): NotificationKind {
  return (NOTIFICATION_KINDS as readonly string[]).includes(value)
    ? (value as NotificationKind)
    : "SISTEM";
}

export function registerNotificationRoutes(
  app: FastifyInstance,
  deps: NotificationDependencies,
): void {
  const signedIn = {
    preHandler: requireRole(deps, "PETUGAS", "PIMPINAN", "ADMIN"),
  };

  app.get("/api/notifications", signedIn, async (request): Promise<NotificationListResponse> => {
    const userId = request.auth?.user.id ?? "";
    const query = request.query as { limit?: string; unread?: string };
    const requested = Number.parseInt(query.limit ?? "20", 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 20;
    const unreadOnly = query.unread === "1" || query.unread === "true";

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [rows, total, unreadCount] = await Promise.all([
      deps.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          kind: true,
          title: true,
          body: true,
          readAt: true,
          createdAt: true,
          incident: { select: { id: true, code: true } },
          permit: { select: { id: true, number: true } },
        },
      }),
      deps.prisma.notification.count({ where: { userId } }),
      deps.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      notifications: rows.map((row) => ({
        id: row.id,
        kind: readKind(row.kind),
        title: row.title,
        body: row.body,
        incidentId: row.incident?.id ?? null,
        incidentCode: row.incident?.code ?? null,
        permitId: row.permit?.id ?? null,
        permitNumber: row.permit?.number ?? null,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      unreadCount,
      total,
      note: "Notifikasi ini hanya tersimpan di aplikasi. Tidak ada pesan WA atau SMS yang dikirim.",
    };
  });

  app.post("/api/notifications/read", signedIn, async (request, reply) => {
    const userId = request.auth?.user.id ?? "";
    const parsed = notificationReadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    const where: Prisma.NotificationWhereInput = {
      userId,
      readAt: null,
      ...(parsed.data.all ? {} : { id: { in: parsed.data.ids ?? [] } }),
    };

    const now = await deps.clock.now();
    const result = await deps.prisma.notification.updateMany({
      where,
      data: { readAt: now },
    });

    return {
      updated: result.count,
      message:
        result.count === 0
          ? "Tidak ada notifikasi baru yang perlu ditandai."
          : `${result.count} notifikasi sudah ditandai dibaca.`,
    };
  });
}
