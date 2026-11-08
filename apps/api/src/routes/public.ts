import type { IncidentStatus, Prisma, PrismaClient } from "@prisma/client";
import {
  ACTIVE_INCIDENT_STATUSES,
  publicIncidentFilterSchema,
  trackingCodeSchema,
  type PublicIncidentTracking,
} from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";

type PublicDependencies = {
  prisma: PrismaClient;
};

export function registerPublicRoutes(app: FastifyInstance, deps: PublicDependencies): void {
  app.get("/api/public/incidents", async (request, reply) => {
    const parsed = publicIncidentFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          message: parsed.error.issues[0]?.message ?? "Pilihan filter belum dikenali.",
        },
      });
    }

    const where: Prisma.IncidentWhereInput = {
      status: { in: [...ACTIVE_INCIDENT_STATUSES] as IncidentStatus[] },
    };

    if (parsed.data.disasterType) {
      where.disasterType = parsed.data.disasterType;
    }

    if (parsed.data.regionId) {
      where.regionId = parsed.data.regionId;
    }

    const incidents = await deps.prisma.incident.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 100,
      select: {
        id: true,
        code: true,
        title: true,
        disasterType: true,
        lat: true,
        lng: true,
        radiusM: true,
        occurredAt: true,
        status: true,
        affectedPeople: true,
        region: { select: { id: true, name: true } },
      },
    });

    return {
      incidents: incidents.map((incident) => ({
        ...incident,
        affectedPeople: incident.affectedPeople ?? 0,
      })),
      total: incidents.length,
      note: "Data pribadi pelapor tidak ditampilkan di halaman publik.",
    };
  });

  app.get("/api/public/incidents/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const parsed = trackingCodeSchema.safeParse(code);

    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          message:
            parsed.error.issues[0]?.message ??
            "Kode lacak belum sesuai. Contoh kode yang benar: SIA-7K2Q9.",
        },
      });
    }

    const incident = await deps.prisma.incident.findUnique({
      where: { code: parsed.data },
      select: {
        code: true,
        title: true,
        disasterType: true,
        occurredAt: true,
        status: true,
        affectedPeople: true,
        radiusM: true,
        lat: true,
        lng: true,
        createdAt: true,
        region: { select: { name: true } },
        logs: {
          orderBy: { createdAt: "asc" },
          select: { toStatus: true, createdAt: true },
        },
        recommendations: {
          where: { isActive: true },
          orderBy: { generatedAt: "desc" },
          take: 1,
          select: {
            modelVersion: true,
            totalPeople: true,
            items: {
              orderBy: { aidItem: { sortOrder: "asc" } },
              select: {
                finalQty: true,
                unit: true,
                reason: true,
                aidItem: { select: { name: true } },
              },
            },
          },
        },
        permits: {
          orderBy: { issuedAt: "desc" },
          take: 1,
          select: {
            number: true,
            issuedAt: true,
            validUntil: true,
            status: true,
            posko: { select: { name: true } },
          },
        },
      },
    });

    if (!incident) {
      return reply.code(404).send({
        error: {
          message:
            "Kode lacak ini tidak ditemukan. Periksa kembali huruf dan angkanya, lalu coba lagi.",
        },
      });
    }

    const permit = incident.permits[0] ?? null;
    const recommendation = incident.recommendations[0] ?? null;

    const timeline =
      incident.logs.length > 0
        ? incident.logs.map((log) => ({
            status: log.toStatus,
            at: log.createdAt.toISOString(),
          }))
        : [{ status: incident.status, at: incident.createdAt.toISOString() }];

    const result: PublicIncidentTracking = {
      incident: {
        code: incident.code,
        title: incident.title,
        disasterType: incident.disasterType,
        regionName: incident.region?.name ?? null,
        occurredAt: incident.occurredAt.toISOString(),
        status: incident.status,
        affectedPeople: incident.affectedPeople,
        radiusM: incident.radiusM,
        lat: incident.lat,
        lng: incident.lng,
      },
      timeline,
      aid:
        permit && recommendation
          ? {
              modelVersion: recommendation.modelVersion,
              totalPeople: recommendation.totalPeople,
              items: recommendation.items.map((item) => ({
                name: item.aidItem.name,
                unit: item.unit,
                qty: item.finalQty,
                reason: item.reason,
              })),
            }
          : null,
      permit: permit
        ? {
            number: permit.number,
            issuedAt: permit.issuedAt.toISOString(),
            validUntil: permit.validUntil?.toISOString() ?? null,
            poskoName: permit.posko.name,
            status: permit.status,
          }
        : null,
      note: "Data pribadi pelapor dan catatan internal tidak ditampilkan.",
    };

    return result;
  });
}
