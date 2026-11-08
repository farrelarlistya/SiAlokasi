import type { PrismaClient } from "@prisma/client";
import {
  adjustRecommendationItemSchema,
  decisionInputSchema,
} from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { writeAudit } from "../lib/audit";
import { firstIssueMessage, RequestError } from "../lib/errors";
import {
  loadPimpinanIncidentDetail,
  lockIncident,
  nextPermitNumber,
} from "../lib/incident";
import { requireRole } from "../lib/rbac";

type PimpinanIncidentDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

export function registerPimpinanIncidentRoutes(
  app: FastifyInstance,
  deps: PimpinanIncidentDependencies,
): void {
  const pimpinanOnly = { preHandler: requireRole(deps, "PIMPINAN") };

  app.get("/api/pimpinan/incidents/:id", pimpinanOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const detail = await loadPimpinanIncidentDetail(deps.prisma, id);

    if (!detail) {
      return reply.code(404).send({
        error: { message: "Laporan ini tidak ditemukan." },
      });
    }

    return { data: detail };
  });

  app.patch(
    "/api/pimpinan/incidents/:id/items/:itemId",
    pimpinanOnly,
    async (request, reply) => {
      const { id, itemId } = request.params as { id: string; itemId: string };
      const deciderId = request.auth?.user.id ?? "";

      const parsed = adjustRecommendationItemSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
      }

      let change: { name: string; before: number; after: number } | null = null;

      try {
        change = await deps.prisma.$transaction(async (tx) => {
          await lockIncident(tx, id);

          const incident = await tx.incident.findUnique({
            where: { id },
            select: { id: true, status: true },
          });

          if (!incident) {
            throw new RequestError(404, "Laporan ini tidak ditemukan.");
          }

          if (incident.status !== "MENUNGGU_PERSETUJUAN") {
            throw new RequestError(
              409,
              "Jumlah bantuan hanya bisa diubah saat laporan masih menunggu keputusan. Laporan ini sudah diputuskan atau belum diajukan.",
            );
          }

          const item = await tx.recommendationItem.findFirst({
            where: {
              id: itemId,
              recommendation: { incidentId: id, isActive: true },
            },
            select: {
              id: true,
              finalQty: true,
              unit: true,
              aidItem: { select: { name: true } },
            },
          });

          if (!item) {
            throw new RequestError(
              404,
              "Baris bantuan ini tidak ditemukan pada perhitungan laporan tersebut.",
            );
          }

          if (item.finalQty === parsed.data.finalQty) {
            throw new RequestError(
              400,
              "Jumlah bantuan belum berubah. Ubah angkanya bila memang perlu disesuaikan.",
            );
          }

          await tx.recommendationItem.update({
            where: { id: itemId },
            data: {
              finalQty: parsed.data.finalQty,
              adjustReason: parsed.data.reason,
            },
          });

          await writeAudit(tx, deps.clock, {
            entity: "RecommendationItem",
            entityId: itemId,
            action: "UBAH_JUMLAH",
            actorId: deciderId,
            before: { finalQty: item.finalQty, unit: item.unit },
            after: {
              finalQty: parsed.data.finalQty,
              unit: item.unit,
              reason: parsed.data.reason,
            },
          });

          return {
            name: item.aidItem.name,
            before: item.finalQty,
            after: parsed.data.finalQty,
          };
        });
      } catch (error) {
        if (error instanceof RequestError) {
          return reply.code(error.statusCode).send({ error: { message: error.message } });
        }
        throw error;
      }

      const detail = await loadPimpinanIncidentDetail(deps.prisma, id);

      return {
        data: detail,
        message: change
          ? `Jumlah ${change.name} diubah dari ${change.before} menjadi ${change.after}. Alasan perubahan sudah tercatat.`
          : "Perubahan jumlah bantuan sudah disimpan.",
      };
    },
  );

  app.post("/api/pimpinan/incidents/:id/decision", pimpinanOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deciderId = request.auth?.user.id ?? "";

    const parsed = decisionInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    let message = "";

    try {
      message = await deps.prisma.$transaction(async (tx) => {
        await lockIncident(tx, id);

        const incident = await tx.incident.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            code: true,
            recommendations: {
              where: { isActive: true },
              orderBy: { generatedAt: "desc" },
              take: 1,
              select: {
                id: true,
                items: {
                  select: {
                    aidItemId: true,
                    finalQty: true,
                    unit: true,
                    reason: true,
                    adjustReason: true,
                    aidItem: { select: { name: true } },
                  },
                },
              },
            },
          },
        });

        if (!incident) {
          throw new RequestError(404, "Laporan ini tidak ditemukan.");
        }

        if (incident.status === "DISETUJUI" || incident.status === "SELESAI") {
          throw new RequestError(
            409,
            "Laporan ini sudah disetujui dan izin distribusinya sudah terbit. Keputusan tidak bisa diulang.",
          );
        }

        if (incident.status === "DITOLAK") {
          throw new RequestError(409, "Laporan ini sudah ditolak sebelumnya.");
        }

        if (incident.status !== "MENUNGGU_PERSETUJUAN") {
          throw new RequestError(
            409,
            "Laporan ini belum diajukan oleh petugas, sehingga belum bisa diputuskan.",
          );
        }

        const recommendation = incident.recommendations[0];
        if (!recommendation) {
          throw new RequestError(
            409,
            "Perhitungan bantuan belum tersedia. Minta petugas menghitung estimasi terlebih dahulu.",
          );
        }

        const now = await deps.clock.now();

        if (parsed.data.decision === "REJECT") {
          const reason = parsed.data.reason?.trim();
          if (!reason) {
            throw new RequestError(
              400,
              "Tulis alasan penolakan minimal 5 karakter agar petugas tahu apa yang perlu diperbaiki.",
            );
          }

          await tx.decision.create({
            data: {
              recommendationId: recommendation.id,
              deciderId,
              decision: "REJECT",
              reason,
              decidedAt: now,
            },
          });

          await tx.incident.update({
            where: { id },
            data: { status: "DITOLAK" },
          });

          await tx.incidentLog.create({
            data: {
              incidentId: id,
              fromStatus: "MENUNGGU_PERSETUJUAN",
              toStatus: "DITOLAK",
              actorId: deciderId,
              note: `Ditolak: ${reason}`,
              createdAt: now,
            },
          });

          await writeAudit(tx, deps.clock, {
            entity: "Incident",
            entityId: id,
            action: "TOLAK",
            actorId: deciderId,
            before: { status: "MENUNGGU_PERSETUJUAN" },
            after: { status: "DITOLAK", reason },
          });

          return `Laporan ${incident.code} ditolak. Alasan penolakan sudah dicatat dan bisa dibaca petugas.`;
        }

        const poskoId = parsed.data.poskoId;
        if (!poskoId) {
          throw new RequestError(
            400,
            "Pilih posko tujuan distribusi sebelum menyetujui laporan.",
          );
        }

        const posko = await tx.posko.findFirst({
          where: { id: poskoId, isActive: true },
          select: { id: true, name: true },
        });

        if (!posko) {
          throw new RequestError(
            400,
            "Posko tujuan belum tersedia atau sudah nonaktif. Pilih posko lain.",
          );
        }

        await tx.decision.create({
          data: {
            recommendationId: recommendation.id,
            deciderId,
            decision: "APPROVE",
            reason: parsed.data.reason?.trim() || null,
            decidedAt: now,
          },
        });

        await tx.incident.update({
          where: { id },
          data: { status: "DISETUJUI" },
        });

        // Nomor izin dibuat berurutan per tanggal; kunci global mencegah bentrok.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('sialokasi-permit-number')::bigint)`;
        const number = await nextPermitNumber(tx, deps.clock);

        const permit = await tx.permit.create({
          data: {
            number,
            incidentId: id,
            poskoId,
            issuedById: deciderId,
            issuedAt: now,
            validUntil: await deps.clock.afterDays(7),
            status: "TERBIT",
            items: {
              create: recommendation.items.map((item) => ({
                aidItemId: item.aidItemId,
                name: item.aidItem.name,
                unit: item.unit,
                qty: item.finalQty,
                reason: item.adjustReason ?? item.reason,
              })),
            },
          },
          select: { id: true, number: true },
        });

        await tx.incidentLog.create({
          data: {
            incidentId: id,
            fromStatus: "MENUNGGU_PERSETUJUAN",
            toStatus: "DISETUJUI",
            actorId: deciderId,
            note: `Disetujui. Izin distribusi ${number} terbit untuk ${posko.name}.`,
            createdAt: now,
          },
        });

        await writeAudit(tx, deps.clock, {
          entity: "Incident",
          entityId: id,
          action: "SETUJUI",
          actorId: deciderId,
          before: { status: "MENUNGGU_PERSETUJUAN" },
          after: {
            status: "DISETUJUI",
            permitNumber: permit.number,
            poskoId: posko.id,
          },
        });

        return `Laporan ${incident.code} disetujui. Izin distribusi ${permit.number} terbit untuk ${posko.name}.`;
      });
    } catch (error) {
      if (error instanceof RequestError) {
        return reply.code(error.statusCode).send({ error: { message: error.message } });
      }
      throw error;
    }

    const detail = await loadPimpinanIncidentDetail(deps.prisma, id);

    return { data: detail, message };
  });

  app.post("/api/pimpinan/incidents/:id/complete", pimpinanOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const actorId = request.auth?.user.id ?? "";

    try {
      await deps.prisma.$transaction(async (tx) => {
        await lockIncident(tx, id);

        const incident = await tx.incident.findUnique({
          where: { id },
          select: {
            id: true,
            code: true,
            status: true,
            permits: { take: 1, select: { id: true, number: true } },
          },
        });

        if (!incident) {
          throw new RequestError(404, "Laporan ini tidak ditemukan.");
        }

        if (incident.status === "SELESAI") {
          throw new RequestError(409, "Distribusi laporan ini sudah ditandai selesai.");
        }

        if (incident.status !== "DISETUJUI") {
          throw new RequestError(
            409,
            "Hanya laporan yang sudah disetujui yang bisa ditandai selesai.",
          );
        }

        if (incident.permits.length === 0) {
          throw new RequestError(
            409,
            "Izin distribusi belum terbit, sehingga distribusi belum bisa ditandai selesai.",
          );
        }

        const now = await deps.clock.now();

        await tx.incident.update({
          where: { id },
          data: { status: "SELESAI" },
        });

        await tx.incidentLog.create({
          data: {
            incidentId: id,
            fromStatus: "DISETUJUI",
            toStatus: "SELESAI",
            actorId,
            note: "Distribusi bantuan sudah dilakukan dan laporan ditutup.",
            createdAt: now,
          },
        });

        await writeAudit(tx, deps.clock, {
          entity: "Incident",
          entityId: id,
          action: "SELESAI",
          actorId,
          before: { status: "DISETUJUI" },
          after: { status: "SELESAI" },
        });
      });
    } catch (error) {
      if (error instanceof RequestError) {
        return reply.code(error.statusCode).send({ error: { message: error.message } });
      }
      throw error;
    }

    const detail = await loadPimpinanIncidentDetail(deps.prisma, id);

    return {
      data: detail,
      message: "Distribusi sudah ditandai selesai. Laporan ini ditutup.",
    };
  });
}
