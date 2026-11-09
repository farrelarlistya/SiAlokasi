import type { Prisma, PrismaClient } from "@prisma/client";
import {
  devClockSchema,
  predictAidNeeds,
  type AidItemForEstimate,
  type IncidentFactorsInput,
} from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { writeAudit } from "../lib/audit";
import { firstIssueMessage, RequestError } from "../lib/errors";
import { nextPermitNumber } from "../lib/incident";
import { requireRole } from "../lib/rbac";
import { reserveStock } from "../lib/stock";
import { seedDatabase } from "../../prisma/seed";

type DevDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
  demoMode: boolean;
};

type ExampleTarget = "MENUNGGU" | "DISETUJUI" | "SELESAI";

type ExampleDefinition = {
  code: string;
  title: string;
  disasterType: "BANJIR" | "KEBAKARAN" | "GEMPA" | "ANGIN" | "LAINNYA";
  lat: number;
  lng: number;
  radiusM: number;
  regionId: string;
  occurredHoursAgo: number;
  factors: IncidentFactorsInput;
  target: ExampleTarget;
  poskoId: string;
};

const EXAMPLES: ExampleDefinition[] = [
  {
    code: "SIA-DEMO1",
    title: "Banjir di Wonokromo RW 03",
    disasterType: "BANJIR",
    lat: -7.3002,
    lng: 112.7382,
    radiusM: 1_200,
    regionId: "region_wonokromo",
    occurredHoursAgo: 5,
    factors: {
      affectedPeople: 180,
      damageLevel: "SEDANG",
      vulnerableBabies: 5,
      vulnerableElderly: 10,
      vulnerablePregnant: 2,
      vulnerableDisabled: 3,
      handlingDays: 3,
      roadAccess: "TERBATAS",
      weather: "HUJAN",
      density: "TINGGI",
    },
    target: "MENUNGGU",
    poskoId: "posko_balai_kota",
  },
  {
    code: "SIA-DEMO2",
    title: "Kebakaran permukiman di Tambaksari",
    disasterType: "KEBAKARAN",
    lat: -7.245,
    lng: 112.771,
    radiusM: 500,
    regionId: "region_tambaksari",
    occurredHoursAgo: 26,
    factors: {
      affectedPeople: 90,
      damageLevel: "BERAT",
      vulnerableBabies: 2,
      vulnerableElderly: 4,
      vulnerablePregnant: 1,
      vulnerableDisabled: 2,
      handlingDays: 2,
      roadAccess: "TERBUKA",
      weather: "CERAH",
      density: "SEDANG",
    },
    target: "DISETUJUI",
    poskoId: "posko_balai_kota",
  },
  {
    code: "SIA-DEMO3",
    title: "Angin kencang di Rungkut",
    disasterType: "ANGIN",
    lat: -7.3301,
    lng: 112.7802,
    radiusM: 800,
    regionId: "region_rungkut",
    occurredHoursAgo: 72,
    factors: {
      affectedPeople: 140,
      damageLevel: "SEDANG",
      vulnerableBabies: 4,
      vulnerableElderly: 8,
      vulnerablePregnant: 2,
      vulnerableDisabled: 3,
      handlingDays: 2,
      roadAccess: "TERBATAS",
      weather: "HUJAN",
      density: "SEDANG",
    },
    target: "SELESAI",
    poskoId: "posko_rungkut",
  },
];

async function createExample(
  tx: Prisma.TransactionClient,
  deps: DevDependencies,
  definition: ExampleDefinition,
  context: {
    petugasId: string;
    pimpinanId: string;
    actorId: string;
    aidItems: AidItemForEstimate[];
    now: Date;
    poskoNames: Map<string, string>;
  },
): Promise<void> {
  const occurredAt = deps.clock.shift(context.now, -definition.occurredHoursAgo * 3_600_000);
  const incident = await tx.incident.create({
    data: {
      code: definition.code,
      title: definition.title,
      disasterType: definition.disasterType,
      lat: definition.lat,
      lng: definition.lng,
      radiusM: definition.radiusM,
      regionId: definition.regionId,
      occurredAt,
      status: "BARU",
      reporterId: context.petugasId,
      affectedPeople: definition.factors.affectedPeople,
      damageLevel: definition.factors.damageLevel,
      vulnerableBabies: definition.factors.vulnerableBabies,
      vulnerableElderly: definition.factors.vulnerableElderly,
      vulnerablePregnant: definition.factors.vulnerablePregnant,
      vulnerableDisabled: definition.factors.vulnerableDisabled,
      handlingDays: definition.factors.handlingDays,
      roadAccess: definition.factors.roadAccess,
      weather: definition.factors.weather,
      density: definition.factors.density,
    },
    select: { id: true },
  });

  await tx.incidentLog.create({
    data: {
      incidentId: incident.id,
      fromStatus: null,
      toStatus: "BARU",
      actorId: context.petugasId,
      note: "Laporan contoh dibuat dari panel demo.",
      createdAt: occurredAt,
    },
  });

  const estimation = predictAidNeeds(definition.factors, context.aidItems);
  const recommendation = await tx.recommendation.create({
    data: {
      incidentId: incident.id,
      modelVersion: estimation.modelVersion,
      totalPeople: estimation.totalPeople,
      isActive: true,
      generatedAt: occurredAt,
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
    select: { id: true },
  });

  await tx.incident.update({
    where: { id: incident.id },
    data: { status: "DIPERIKSA" },
  });

  await tx.incidentLog.create({
    data: {
      incidentId: incident.id,
      fromStatus: "BARU",
      toStatus: "DIPERIKSA",
      actorId: context.petugasId,
      note: "Delapan faktor contoh sudah diisi dan estimasi dihitung.",
      createdAt: occurredAt,
    },
  });

  if (definition.target === "MENUNGGU") {
    await tx.incident.update({
      where: { id: incident.id },
      data: { status: "MENUNGGU_PERSETUJUAN" },
    });

    await tx.incidentLog.create({
      data: {
        incidentId: incident.id,
        fromStatus: "DIPERIKSA",
        toStatus: "MENUNGGU_PERSETUJUAN",
        actorId: context.petugasId,
        note: "Laporan contoh diajukan ke pimpinan.",
        createdAt: occurredAt,
      },
    });
  } else {
    const poskoName = context.poskoNames.get(definition.poskoId) ?? "Posko tujuan";
    const decidedAt = deps.clock.shift(context.now, -2 * 3_600_000);
    const submittedAt = deps.clock.shift(decidedAt, -30 * 60_000);
    const number = await nextPermitNumber(tx, deps.clock);

    await tx.incidentLog.create({
      data: {
        incidentId: incident.id,
        fromStatus: "DIPERIKSA",
        toStatus: "MENUNGGU_PERSETUJUAN",
        actorId: context.petugasId,
        note: "Laporan contoh diajukan ke pimpinan.",
        createdAt: submittedAt,
      },
    });

    await tx.decision.create({
      data: {
        recommendationId: recommendation.id,
        deciderId: context.pimpinanId,
        decision: "APPROVE",
        reason: "Contoh keputusan dari panel demo.",
        decidedAt,
      },
    });

    await tx.incident.update({
      where: { id: incident.id },
      data: { status: "DISETUJUI" },
    });

    const permit = await tx.permit.create({
      data: {
        number,
        incidentId: incident.id,
        poskoId: definition.poskoId,
        issuedById: context.pimpinanId,
        issuedAt: decidedAt,
        validUntil: deps.clock.shift(decidedAt, 7 * 24 * 3_600_000),
        status: "TERBIT",
        items: {
          create: estimation.items.map((item) => ({
            aidItemId: item.aidItemId,
            name: item.name,
            unit: item.unit,
            qty: item.baseQty,
            reason: item.reason,
          })),
        },
      },
      select: { id: true },
    });

    await reserveStock(
      tx,
      {
        clock: deps.clock,
        poskoId: definition.poskoId,
        poskoName,
        actorId: context.pimpinanId,
        permitId: permit.id,
        note: `Stok contoh untuk izin ${number}.`,
      },
      estimation.items.map((item) => ({
        aidItemId: item.aidItemId,
        qty: item.baseQty,
        name: item.name,
        unit: item.unit,
      })),
    );

    await tx.incidentLog.create({
      data: {
        incidentId: incident.id,
        fromStatus: "MENUNGGU_PERSETUJUAN",
        toStatus: "DISETUJUI",
        actorId: context.pimpinanId,
        note: `Contoh keputusan: disetujui. Izin ${number} terbit untuk ${poskoName}.`,
        createdAt: decidedAt,
      },
    });

    if (definition.target === "SELESAI") {
      const finishedAt = deps.clock.shift(context.now, -3_600_000);
      await tx.incident.update({
        where: { id: incident.id },
        data: { status: "SELESAI" },
      });

      await tx.incidentLog.create({
        data: {
          incidentId: incident.id,
          fromStatus: "DISETUJUI",
          toStatus: "SELESAI",
          actorId: context.pimpinanId,
          note: "Contoh distribusi sudah dilakukan dan laporan ditutup.",
          createdAt: finishedAt,
        },
      });
    }
  }

  await writeAudit(tx, deps.clock, {
    entity: "Incident",
    entityId: incident.id,
    action: "ISI_CONTOH",
    actorId: context.actorId,
    after: { code: definition.code, target: definition.target },
  });
}

export function registerDevRoutes(app: FastifyInstance, deps: DevDependencies): void {
  const adminOnly = { preHandler: requireRole(deps, "ADMIN") };

  app.get("/api/dev/status", adminOnly, async () => {
    const [offsetMinutes, now, incidents, permits, auditLogs, movements] = await Promise.all([
      deps.clock.offsetMinutes(),
      deps.clock.now(),
      deps.prisma.incident.count(),
      deps.prisma.permit.count(),
      deps.prisma.auditLog.count(),
      deps.prisma.stockMovement.count(),
    ]);

    return {
      demoMode: deps.demoMode,
      offsetMinutes,
      bisnisNow: now.toISOString(),
      counts: { incidents, permits, auditLogs, movements },
      examples: EXAMPLES.map((example) => ({
        code: example.code,
        title: example.title,
        target: example.target,
      })),
    };
  });

  app.patch("/api/dev/clock", adminOnly, async (request, reply) => {
    const parsed = devClockSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { message: firstIssueMessage(parsed) } });
    }

    const now = await deps.clock.setOffsetMinutes(parsed.data.offsetMinutes);

    return {
      offsetMinutes: parsed.data.offsetMinutes,
      bisnisNow: now.toISOString(),
      message: `Waktu demo sudah digeser ${parsed.data.offsetMinutes >= 0 ? "maju" : "mundur"} ${Math.abs(parsed.data.offsetMinutes)} menit.`,
    };
  });

  app.post("/api/dev/reset", adminOnly, async () => {
    const startedAt = Date.now();
    const result = await seedDatabase(deps.prisma);
    const elapsedMs = Date.now() - startedAt;

    return {
      result,
      elapsedMs,
      message: `Reset selesai dalam ${(elapsedMs / 1000).toFixed(1)} detik. Semua transaksi kembali ke nol dan waktu demo kembali normal. Silakan masuk lagi.`,
    };
  });

  app.post("/api/dev/seed-examples", adminOnly, async (request, reply) => {
    const startedAt = Date.now();
    const actorId = request.auth?.user.id ?? "";

    try {
      const result = await deps.prisma.$transaction(async (tx) => {
        const existing = await tx.incident.count();
        if (existing > 0) {
          throw new RequestError(
            409,
            "Masih ada laporan di aplikasi. Reset transaksi terlebih dahulu, lalu isi contoh agar peta tidak bercampur data lama.",
          );
        }

        const [petugas, pimpinan, aidItems, poskos] = await Promise.all([
          tx.user.findUniqueOrThrow({
            where: { email: "petugas@sialokasi.demo" },
            select: { id: true },
          }),
          tx.user.findUniqueOrThrow({
            where: { email: "pimpinan@sialokasi.demo" },
            select: { id: true },
          }),
          tx.aidItem.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, unit: true, standardPerPerson: true },
          }),
          tx.posko.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
          }),
        ]);

        if (aidItems.length === 0) {
          throw new RequestError(
            409,
            "Belum ada jenis bantuan aktif. Aktifkan jenis bantuan lebih dahulu.",
          );
        }

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('sialokasi-permit-number')::bigint)`;

        const now = await deps.clock.now();
        const poskoNames = new Map(poskos.map((posko) => [posko.id, posko.name]));

        for (const definition of EXAMPLES) {
          await createExample(tx, deps, definition, {
            petugasId: petugas.id,
            pimpinanId: pimpinan.id,
            actorId,
            aidItems: aidItems as AidItemForEstimate[],
            now,
            poskoNames,
          });
        }

        return { incidents: EXAMPLES.length, elapsedMs: Date.now() - startedAt };
      });

      return {
        ...result,
        message: `${result.incidents} laporan contoh sudah dibuat: 1 menunggu keputusan, 1 disetujui, dan 1 selesai.`,
      };
    } catch (error) {
      if (error instanceof RequestError) {
        return reply.code(error.statusCode).send({ error: { message: error.message } });
      }
      throw error;
    }
  });
}
