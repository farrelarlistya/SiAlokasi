import type { Prisma, PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { requireRole } from "../lib/rbac";

type AdminAuditDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

const ACTIONS = [
  "BUAT",
  "UBAH",
  "NONAKTIFKAN",
  "AKTIFKAN",
  "UBAH_PERAN",
  "REGISTER",
  "REGISTER_ULANG",
  "HITUNG_ESTIMASI",
  "AJUKAN",
  "BATALKAN",
  "SETUJUI",
  "TOLAK",
  "SELESAI",
  "UBAH_JUMLAH",
  "KOREKSI_IZIN",
  "ISI_CONTOH",
] as const;

function clampLimit(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 100);
}

export function registerAdminAuditRoutes(
  app: FastifyInstance,
  deps: AdminAuditDependencies,
): void {
  const adminOnly = { preHandler: requireRole(deps, "ADMIN") };

  app.get("/api/admin/audit", adminOnly, async (request) => {
    const query = request.query as {
      entity?: string;
      action?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };

    const limit = clampLimit(query.limit, 30);
    const offset = Math.max(Number.parseInt(query.offset ?? "0", 10) || 0, 0);
    const search = query.search?.trim();

    const where: Prisma.AuditLogWhereInput = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(search
        ? {
            OR: [
              { entityId: { contains: search, mode: "insensitive" } },
              { actor: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, entries] = await Promise.all([
      deps.prisma.auditLog.count({ where }),
      deps.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          entity: true,
          entityId: true,
          action: true,
          before: true,
          after: true,
          createdAt: true,
          actor: { select: { name: true, role: true } },
        },
      }),
    ]);

    const entities = await deps.prisma.auditLog.findMany({
      distinct: ["entity"],
      orderBy: { entity: "asc" },
      select: { entity: true },
    });

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        before: entry.before,
        after: entry.after,
        actorName: entry.actor?.name ?? "Sistem",
        actorRole: entry.actor?.role ?? null,
        createdAt: entry.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
      options: {
        entities: entities.map((entry) => entry.entity),
        actions: ACTIONS,
      },
      note: "Catatan ini hanya menerima penambahan. Tidak ada tombol ubah atau hapus.",
    };
  });

  app.get("/api/admin/incident-logs", adminOnly, async (request) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = clampLimit(query.limit, 30);
    const offset = Math.max(Number.parseInt(query.offset ?? "0", 10) || 0, 0);

    const [total, logs] = await Promise.all([
      deps.prisma.incidentLog.count(),
      deps.prisma.incidentLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          actor: { select: { name: true } },
          incident: { select: { id: true, code: true, title: true } },
        },
      }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        note: log.note,
        actorName: log.actor?.name ?? "Sistem",
        incidentId: log.incident.id,
        incidentCode: log.incident.code,
        incidentTitle: log.incident.title,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
      note: "Riwayat status laporan bersifat tetap; baris lama tidak bisa diubah atau dihapus.",
    };
  });
}
