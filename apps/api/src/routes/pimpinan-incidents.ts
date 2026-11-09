import type { PrismaClient } from "@prisma/client";
import {
  adjustRecommendationItemSchema,
  correctionInputSchema,
  decisionInputSchema,
  pimpinanCancelSchema,
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
import { notifyPermitCorrection, notifyStatusChange } from "../lib/notifications";
import { releaseStock, reserveStock } from "../lib/stock";

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
            title: true,
            reporterId: true,
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

          await notifyStatusChange(tx, deps.clock, {
            incidentId: id,
            reporterId: incident.reporterId,
            code: incident.code,
            title: incident.title,
            toStatus: "DITOLAK",
            reason,
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

        // Stok diambil saat izin terbit. Bila salah satu kurang, seluruh
        // keputusan dibatalkan dan stok tidak berubah sedikit pun.
        await reserveStock(
          tx,
          {
            clock: deps.clock,
            poskoId: posko.id,
            poskoName: posko.name,
            actorId: deciderId,
            permitId: permit.id,
            note: `Pengambilan stok untuk izin ${permit.number}.`,
          },
          recommendation.items.map((item) => ({
            aidItemId: item.aidItemId,
            qty: item.finalQty,
            name: item.aidItem.name,
            unit: item.unit,
          })),
        );

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

        await notifyStatusChange(tx, deps.clock, {
          incidentId: id,
          reporterId: incident.reporterId,
          code: incident.code,
          title: incident.title,
          toStatus: "DISETUJUI",
          permitNumber: permit.number,
          permitId: permit.id,
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
            title: true,
            status: true,
            reporterId: true,
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

        await notifyStatusChange(tx, deps.clock, {
          incidentId: id,
          reporterId: incident.reporterId,
          code: incident.code,
          title: incident.title,
          toStatus: "SELESAI",
          permitId: incident.permits[0]?.id ?? null,
          permitNumber: incident.permits[0]?.number ?? null,
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

  app.post("/api/pimpinan/incidents/:id/cancel", pimpinanOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const actorId = request.auth?.user.id ?? "";

    const parsed = pimpinanCancelSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    const reason = parsed.data.reason.trim();

    try {
      await deps.prisma.$transaction(async (tx) => {
        await lockIncident(tx, id);

        const incident = await tx.incident.findUnique({
          where: { id },
          select: { id: true, code: true, title: true, status: true, reporterId: true },
        });

        if (!incident) {
          throw new RequestError(404, "Laporan ini tidak ditemukan.");
        }

        if (incident.status !== "MENUNGGU_PERSETUJUAN") {
          throw new RequestError(
            409,
            "Hanya laporan yang masih menunggu keputusan yang bisa dibatalkan pimpinan. Laporan yang sudah disetujui diperbaiki lewat koreksi izin.",
          );
        }

        const now = await deps.clock.now();

        await tx.incident.update({
          where: { id },
          data: { status: "DIBATALKAN", cancelReason: reason },
        });

        await tx.incidentLog.create({
          data: {
            incidentId: id,
            fromStatus: "MENUNGGU_PERSETUJUAN",
            toStatus: "DIBATALKAN",
            actorId,
            note: `Dibatalkan pimpinan: ${reason}`,
            createdAt: now,
          },
        });

        await writeAudit(tx, deps.clock, {
          entity: "Incident",
          entityId: id,
          action: "BATALKAN",
          actorId,
          before: { status: "MENUNGGU_PERSETUJUAN" },
          after: { status: "DIBATALKAN", reason },
        });

        await notifyStatusChange(tx, deps.clock, {
          incidentId: id,
          reporterId: incident.reporterId,
          code: incident.code,
          title: incident.title,
          toStatus: "DIBATALKAN",
          reason,
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
      message: "Laporan sudah dibatalkan pimpinan. Alasan pembatalan tercatat di riwayat.",
    };
  });

  app.post("/api/pimpinan/incidents/:id/corrections", pimpinanOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const actorId = request.auth?.user.id ?? "";

    const parsed = correctionInputSchema.safeParse(request.body);
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
            code: true,
            title: true,
            status: true,
            reporterId: true,
            permits: {
              orderBy: { issuedAt: "desc" },
              take: 1,
              select: {
                id: true,
                number: true,
                status: true,
                poskoId: true,
                supersededAt: true,
                posko: { select: { id: true, name: true } },
                items: {
                  orderBy: { aidItemId: "asc" },
                  select: {
                    aidItemId: true,
                    name: true,
                    unit: true,
                    qty: true,
                    reason: true,
                  },
                },
              },
            },
          },
        });

        if (!incident) {
          throw new RequestError(404, "Laporan ini tidak ditemukan.");
        }

        if (incident.status !== "DISETUJUI" && incident.status !== "SELESAI") {
          throw new RequestError(
            409,
            "Koreksi hanya bisa diajukan setelah laporan disetujui. Laporan yang masih menunggu keputusan cukup ditolak atau dibatalkan.",
          );
        }

        const permit = incident.permits[0];
        if (!permit) {
          throw new RequestError(
            409,
            "Izin distribusi belum terbit, sehingga belum ada yang bisa dikoreksi.",
          );
        }

        if (permit.supersededAt) {
          throw new RequestError(
            409,
            "Izin ini sudah digantikan izin koreksi yang lebih baru. Buka izin terbaru untuk mengoreksi lagi.",
          );
        }

        const posko = await tx.posko.findFirst({
          where: { id: parsed.data.poskoId, isActive: true },
          select: { id: true, name: true },
        });

        if (!posko) {
          throw new RequestError(
            400,
            "Posko tujuan koreksi belum tersedia atau sudah nonaktif. Pilih posko lain.",
          );
        }

        const qtyByItem = new Map(parsed.data.items.map((item) => [item.aidItemId, item.qty]));
        const known = new Set(permit.items.map((item) => item.aidItemId));
        for (const aidItemId of qtyByItem.keys()) {
          if (!known.has(aidItemId)) {
            throw new RequestError(
              400,
              "Ada jenis bantuan yang tidak tercatat pada izin ini. Muat ulang halaman, lalu coba lagi.",
            );
          }
        }

        const changes = permit.items.map((item) => ({
          aidItemId: item.aidItemId,
          name: item.name,
          unit: item.unit,
          beforeQty: item.qty,
          afterQty: qtyByItem.get(item.aidItemId) ?? item.qty,
          reason: item.reason,
        }));
        const changedQty = changes.some((item) => item.beforeQty !== item.afterQty);

        if (!changedQty && posko.id === permit.poskoId) {
          throw new RequestError(
            400,
            "Belum ada perubahan pada jumlah bantuan atau posko tujuan. Ubah salah satunya bila memang perlu dikoreksi.",
          );
        }

        const now = await deps.clock.now();

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('sialokasi-permit-number')::bigint)`;
        const number = await nextPermitNumber(tx, deps.clock);

        // Stok izin lama dikembalikan lebih dulu, lalu izin baru mengambil stok.
        // Semua langkah berada dalam satu transaksi; gagal di tengah = tidak ada perubahan.
        await releaseStock(
          tx,
          {
            clock: deps.clock,
            poskoId: permit.poskoId,
            poskoName: permit.posko.name,
            actorId,
            permitId: permit.id,
            note: `Stok dikembalikan karena izin ${permit.number} digantikan koreksi.`,
          },
          permit.items.map((item) => ({
            aidItemId: item.aidItemId,
            qty: item.qty,
            name: item.name,
            unit: item.unit,
          })),
        );

        const newPermit = await tx.permit.create({
          data: {
            number,
            incidentId: id,
            poskoId: posko.id,
            issuedById: actorId,
            issuedAt: now,
            validUntil: await deps.clock.afterDays(7),
            status: "TERBIT",
            replacesNumber: permit.number,
            items: {
              create: changes.map((item) => ({
                aidItemId: item.aidItemId,
                name: item.name,
                unit: item.unit,
                qty: item.afterQty,
                reason:
                  item.beforeQty !== item.afterQty
                    ? `Koreksi izin ${permit.number}: ${parsed.data.reason.trim()}`
                    : item.reason,
              })),
            },
          },
          select: { id: true, number: true },
        });

        await reserveStock(
          tx,
          {
            clock: deps.clock,
            poskoId: posko.id,
            poskoName: posko.name,
            actorId,
            permitId: newPermit.id,
            note: `Pengambilan stok untuk izin koreksi ${newPermit.number}.`,
          },
          changes.map((item) => ({
            aidItemId: item.aidItemId,
            qty: item.afterQty,
            name: item.name,
            unit: item.unit,
          })),
        );

        await tx.permit.update({
          where: { id: permit.id },
          data: {
            status: "DIBATALKAN",
            supersededAt: now,
            supersededByNumber: newPermit.number,
          },
        });

        await tx.incidentCorrection.create({
          data: {
            incidentId: id,
            previousPermitId: permit.id,
            newPermitId: newPermit.id,
            reason: parsed.data.reason.trim(),
            changes,
            actorId,
            createdAt: now,
          },
        });

        await notifyPermitCorrection(tx, deps.clock, {
          incidentId: id,
          reporterId: incident.reporterId,
          actorId,
          code: incident.code,
          title: incident.title,
          previousPermitNumber: permit.number,
          newPermitNumber: newPermit.number,
          permitId: newPermit.id,
          reason: parsed.data.reason.trim(),
        });

        if (incident.status === "SELESAI") {
          await tx.incident.update({
            where: { id },
            data: { status: "DISETUJUI" },
          });

          await tx.incidentLog.create({
            data: {
              incidentId: id,
              fromStatus: "SELESAI",
              toStatus: "DISETUJUI",
              actorId,
              note: `Laporan dibuka kembali karena koreksi izin ${permit.number} → ${newPermit.number}.`,
              createdAt: now,
            },
          });
        }

        await writeAudit(tx, deps.clock, {
          entity: "Incident",
          entityId: id,
          action: "KOREKSI_IZIN",
          actorId,
          before: { permitNumber: permit.number, poskoId: permit.poskoId },
          after: {
            permitNumber: newPermit.number,
            poskoId: posko.id,
            reason: parsed.data.reason.trim(),
          },
        });

        return `Izin ${permit.number} sudah digantikan izin ${newPermit.number}. Stok posko ${
          permit.posko.name
        } → ${posko.name} ikut disesuaikan.`;
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
}
