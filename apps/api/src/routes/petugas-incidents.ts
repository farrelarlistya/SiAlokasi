import type { Prisma, PrismaClient } from "@prisma/client";
import {
  incidentDraftSchema,
  incidentFactorsSchema,
  incidentPatchSchema,
  predictAidNeeds,
  type AidItemForEstimate,
} from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { writeAudit } from "../lib/audit";
import { firstIssueMessage, RequestError } from "../lib/errors";
import {
  generateUniqueTrackingCode,
  incidentDetailInclude,
  lockIncident,
  toIncidentDetail,
} from "../lib/incident";
import { requireRole } from "../lib/rbac";

type PetugasIncidentDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

export function registerPetugasIncidentRoutes(
  app: FastifyInstance,
  deps: PetugasIncidentDependencies,
): void {
  const petugasOnly = { preHandler: requireRole(deps, "PETUGAS") };

  app.get("/api/petugas/incidents", petugasOnly, async (request) => {
    const reporterId = request.auth?.user.id ?? "";
    const incidents = await deps.prisma.incident.findMany({
      where: { reporterId },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        code: true,
        title: true,
        disasterType: true,
        status: true,
        occurredAt: true,
        affectedPeople: true,
        radiusM: true,
        region: { select: { name: true } },
      },
    });

    return {
      incidents: incidents.map((incident) => ({
        ...incident,
        affectedPeople: incident.affectedPeople ?? 0,
      })),
      total: incidents.length,
    };
  });

  app.post("/api/petugas/incidents", petugasOnly, async (request, reply) => {
    const parsed = incidentDraftSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    const reporterId = request.auth?.user.id;
    if (!reporterId) {
      return reply.code(401).send({ error: { message: "Sesi Anda belum aktif." } });
    }

    const region = await deps.prisma.region.findFirst({
      where: { id: parsed.data.regionId, isActive: true },
      select: { id: true },
    });

    if (!region) {
      return reply.code(400).send({
        error: {
          message:
            "Kecamatan yang dipilih belum tersedia. Pilih kecamatan lain, atau hubungi admin wilayah.",
        },
      });
    }

    const now = await deps.clock.now();
    const occurredAt = deps.clock.parseBusinessDate(parsed.data.occurredAt);

    if (occurredAt.getTime() > now.getTime() + 5 * 60_000) {
      return reply.code(400).send({
        error: {
          message: "Waktu kejadian tidak boleh di masa depan. Periksa tanggal dan jam kejadian.",
        },
      });
    }

    const code = await generateUniqueTrackingCode(deps.prisma);

    const incident = await deps.prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          code,
          title: parsed.data.title,
          disasterType: parsed.data.disasterType,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          radiusM: parsed.data.radiusM,
          regionId: parsed.data.regionId,
          occurredAt,
          status: "BARU",
          reporterId,
        },
        include: incidentDetailInclude,
      });

      await tx.incidentLog.create({
        data: {
          incidentId: created.id,
          fromStatus: null,
          toStatus: "BARU",
          actorId: reporterId,
          note: "Laporan dibuat.",
          createdAt: now,
        },
      });

      await writeAudit(tx, deps.clock, {
        entity: "Incident",
        entityId: created.id,
        action: "BUAT",
        actorId: reporterId,
        after: {
          code,
          title: created.title,
          disasterType: created.disasterType,
          status: created.status,
        },
      });

      return created;
    });

    return reply.code(201).send({
      data: toIncidentDetail(incident),
      message: `Laporan tersimpan dengan kode lacak ${code}. Lanjutkan mengisi 8 faktor untuk menghitung estimasi.`,
    });
  });

  app.get("/api/petugas/incidents/:id", petugasOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const reporterId = request.auth?.user.id ?? "";

    const incident = await deps.prisma.incident.findFirst({
      where: { id, reporterId },
      include: incidentDetailInclude,
    });

    if (!incident) {
      return reply.code(404).send({
        error: { message: "Laporan ini tidak ditemukan di akun Anda." },
      });
    }

    return { data: toIncidentDetail(incident) };
  });

  app.patch("/api/petugas/incidents/:id", petugasOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const reporterId = request.auth?.user.id ?? "";

    const parsed = incidentPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    if (Object.keys(parsed.data).length === 0) {
      return reply.code(400).send({
        error: { message: "Belum ada perubahan yang bisa disimpan." },
      });
    }

    const target = await deps.prisma.incident.findFirst({
      where: { id, reporterId },
      select: { id: true, status: true, title: true, radiusM: true, regionId: true },
    });

    if (!target) {
      return reply.code(404).send({
        error: { message: "Laporan ini tidak ditemukan di akun Anda." },
      });
    }

    if (target.status !== "BARU") {
      return reply.code(409).send({
        error: {
          message:
            "Laporan ini sudah diperiksa atau diajukan, sehingga isinya tidak bisa diubah lagi. Buat laporan baru bila ada data yang perlu diperbaiki.",
        },
      });
    }

    if (parsed.data.regionId !== undefined) {
      const region = await deps.prisma.region.findFirst({
        where: { id: parsed.data.regionId, isActive: true },
        select: { id: true },
      });

      if (!region) {
        return reply.code(400).send({
          error: {
            message:
              "Kecamatan yang dipilih belum tersedia. Pilih kecamatan lain, atau hubungi admin wilayah.",
          },
        });
      }
    }

    if (parsed.data.occurredAt !== undefined) {
      const now = await deps.clock.now();
      const occurredAt = deps.clock.parseBusinessDate(parsed.data.occurredAt);

      if (occurredAt.getTime() > now.getTime() + 5 * 60_000) {
        return reply.code(400).send({
          error: {
            message: "Waktu kejadian tidak boleh di masa depan. Periksa tanggal dan jam kejadian.",
          },
        });
      }
    }

    const data: Prisma.IncidentUncheckedUpdateInput = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.disasterType !== undefined) data.disasterType = parsed.data.disasterType;
    if (parsed.data.lat !== undefined) data.lat = parsed.data.lat;
    if (parsed.data.lng !== undefined) data.lng = parsed.data.lng;
    if (parsed.data.radiusM !== undefined) data.radiusM = parsed.data.radiusM;
    if (parsed.data.regionId !== undefined) data.regionId = parsed.data.regionId;
    if (parsed.data.occurredAt !== undefined) {
      data.occurredAt = deps.clock.parseBusinessDate(parsed.data.occurredAt);
    }

    const updated = await deps.prisma.incident.update({
      where: { id },
      data,
      include: incidentDetailInclude,
    });

    await writeAudit(deps.prisma, deps.clock, {
      entity: "Incident",
      entityId: id,
      action: "UBAH",
      actorId: reporterId,
      before: { title: target.title, radiusM: target.radiusM, regionId: target.regionId },
      after: {
        title: updated.title,
        radiusM: updated.radiusM,
        regionId: updated.regionId,
      },
    });

    return {
      data: toIncidentDetail(updated),
      message: "Perubahan laporan sudah disimpan.",
    };
  });

  app.post("/api/petugas/incidents/:id/factors", petugasOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const reporterId = request.auth?.user.id ?? "";

    const parsed = incidentFactorsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    try {
      await deps.prisma.$transaction(async (tx) => {
        await lockIncident(tx, id);

        const incident = await tx.incident.findFirst({
          where: { id, reporterId },
          select: { id: true, status: true },
        });

        if (!incident) {
          throw new RequestError(404, "Laporan ini tidak ditemukan di akun Anda.");
        }

        if (incident.status !== "BARU" && incident.status !== "DIPERIKSA") {
          throw new RequestError(
            409,
            "Laporan ini sudah diajukan atau sudah diputuskan, sehingga estimasi tidak bisa dihitung ulang. Buat laporan baru bila ada data yang perlu diperbaiki.",
          );
        }

        const aidItems = await tx.aidItem.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, unit: true, standardPerPerson: true },
        });

        if (aidItems.length === 0) {
          throw new RequestError(
            409,
            "Belum ada jenis bantuan aktif. Minta admin mengaktifkan jenis bantuan lebih dahulu.",
          );
        }

        const estimation = predictAidNeeds(parsed.data, aidItems as AidItemForEstimate[]);
        const now = await deps.clock.now();

        await tx.incident.update({
          where: { id },
          data: {
            affectedPeople: parsed.data.affectedPeople,
            damageLevel: parsed.data.damageLevel,
            vulnerableBabies: parsed.data.vulnerableBabies,
            vulnerableElderly: parsed.data.vulnerableElderly,
            vulnerablePregnant: parsed.data.vulnerablePregnant,
            vulnerableDisabled: parsed.data.vulnerableDisabled,
            handlingDays: parsed.data.handlingDays,
            roadAccess: parsed.data.roadAccess,
            weather: parsed.data.weather,
            density: parsed.data.density,
            status: "DIPERIKSA",
          },
        });

        await tx.recommendation.updateMany({
          where: { incidentId: id, isActive: true },
          data: { isActive: false },
        });

        await tx.recommendation.create({
          data: {
            incidentId: id,
            modelVersion: estimation.modelVersion,
            totalPeople: estimation.totalPeople,
            isActive: true,
            generatedAt: now,
            items: {
              create: estimation.items.map((item) => ({
                aidItemId: item.aidItemId,
                baseQty: item.baseQty,
                finalQty: item.baseQty,
                unit: item.unit,
                reason: item.reason,
              })),
            },
          },
        });

        if (incident.status === "BARU") {
          await tx.incidentLog.create({
            data: {
              incidentId: id,
              fromStatus: "BARU",
              toStatus: "DIPERIKSA",
              actorId: reporterId,
              note: "Delapan faktor diisi dan estimasi dihitung.",
              createdAt: now,
            },
          });
        }

        await writeAudit(tx, deps.clock, {
          entity: "Incident",
          entityId: id,
          action: "HITUNG_ESTIMASI",
          actorId: reporterId,
          after: {
            modelVersion: estimation.modelVersion,
            totalPeople: estimation.totalPeople,
            itemCount: estimation.items.length,
          },
        });
      });
    } catch (error) {
      if (error instanceof RequestError) {
        return reply.code(error.statusCode).send({ error: { message: error.message } });
      }
      throw error;
    }

    const incident = await deps.prisma.incident.findUniqueOrThrow({
      where: { id },
      include: incidentDetailInclude,
    });

    return {
      data: toIncidentDetail(incident),
      message:
        "Estimasi siap. Periksa sepuluh jenis bantuan dan alasannya sebelum diajukan ke pimpinan.",
    };
  });

  app.post("/api/petugas/incidents/:id/submit", petugasOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const reporterId = request.auth?.user.id ?? "";

    try {
      await deps.prisma.$transaction(async (tx) => {
        await lockIncident(tx, id);

        const incident = await tx.incident.findFirst({
          where: { id, reporterId },
          select: {
            id: true,
            status: true,
            recommendations: {
              where: { isActive: true },
              orderBy: { generatedAt: "desc" },
              take: 1,
              select: { id: true, _count: { select: { items: true } } },
            },
          },
        });

        if (!incident) {
          throw new RequestError(404, "Laporan ini tidak ditemukan di akun Anda.");
        }

        if (incident.status === "BARU") {
          throw new RequestError(
            409,
            "Lengkapi 8 faktor dan hitung estimasi terlebih dahulu sebelum mengajukan laporan.",
          );
        }

        if (incident.status === "MENUNGGU_PERSETUJUAN") {
          throw new RequestError(
            409,
            "Laporan ini sudah diajukan dan sedang menunggu keputusan pimpinan.",
          );
        }

        if (incident.status !== "DIPERIKSA") {
          throw new RequestError(
            409,
            "Laporan ini sudah diputuskan atau dibatalkan, sehingga tidak bisa diajukan lagi.",
          );
        }

        const recommendation = incident.recommendations[0];
        if (!recommendation || recommendation._count.items === 0) {
          throw new RequestError(
            409,
            "Estimasi bantuan belum tersedia. Hitung estimasi terlebih dahulu, lalu ajukan lagi.",
          );
        }

        const now = await deps.clock.now();

        await tx.incident.update({
          where: { id },
          data: { status: "MENUNGGU_PERSETUJUAN" },
        });

        await tx.incidentLog.create({
          data: {
            incidentId: id,
            fromStatus: "DIPERIKSA",
            toStatus: "MENUNGGU_PERSETUJUAN",
            actorId: reporterId,
            note: "Diajukan ke pimpinan untuk ditinjau.",
            createdAt: now,
          },
        });

        await writeAudit(tx, deps.clock, {
          entity: "Incident",
          entityId: id,
          action: "AJUKAN",
          actorId: reporterId,
          before: { status: "DIPERIKSA" },
          after: { status: "MENUNGGU_PERSETUJUAN" },
        });
      });
    } catch (error) {
      if (error instanceof RequestError) {
        return reply.code(error.statusCode).send({ error: { message: error.message } });
      }
      throw error;
    }

    const incident = await deps.prisma.incident.findUniqueOrThrow({
      where: { id },
      include: incidentDetailInclude,
    });

    return {
      data: toIncidentDetail(incident),
      message:
        "Laporan sudah diajukan ke pimpinan. Isi laporan terkunci sampai keputusan dibuat.",
    };
  });
}
