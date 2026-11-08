import type { IncidentStatus, Prisma, PrismaClient } from "@prisma/client";
import {
  ACTIVE_INCIDENT_STATUSES,
  publicIncidentFilterSchema,
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
      incidents,
      total: incidents.length,
      note: "Data pribadi pelapor tidak ditampilkan di halaman publik.",
    };
  });
}
