import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createTrackingCode,
  resolveRegionForPoint,
  type IncidentCorrectionView,
  type IncidentDetailView,
  type PimpinanIncidentDetailView,
  type PoskoStockView,
} from "@sialokasi/shared";
import { randomInt } from "node:crypto";
import type { ClockService } from "../clock";
import { RequestError } from "./errors";

export const incidentDetailInclude = {
  region: { select: { id: true, name: true } },
  reporter: { select: { id: true, name: true } },
  logs: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  },
  recommendations: {
    where: { isActive: true },
    orderBy: { generatedAt: "desc" },
    take: 1,
    select: {
      id: true,
      modelVersion: true,
      totalPeople: true,
      generatedAt: true,
      items: {
        orderBy: { aidItem: { sortOrder: "asc" } },
        select: {
          id: true,
          aidItemId: true,
          baseQty: true,
          finalQty: true,
          unit: true,
          reason: true,
          adjustReason: true,
          aidItem: { select: { name: true, icon: true } },
        },
      },
      decisions: {
        orderBy: { decidedAt: "desc" },
        take: 1,
        select: {
          id: true,
          decision: true,
          reason: true,
          decidedAt: true,
          decider: { select: { name: true } },
        },
      },
    },
  },
  permits: {
    orderBy: { issuedAt: "desc" },
    take: 1,
    select: {
      id: true,
      number: true,
      issuedAt: true,
      validUntil: true,
      status: true,
      supersededAt: true,
      supersededByNumber: true,
      replacesNumber: true,
      posko: { select: { id: true, name: true, region: { select: { name: true } } } },
      issuedBy: { select: { name: true } },
      items: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          aidItemId: true,
          name: true,
          unit: true,
          qty: true,
          reason: true,
        },
      },
    },
  },
  corrections: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reason: true,
      changes: true,
      createdAt: true,
      actor: { select: { name: true } },
      previousPermit: { select: { number: true } },
      newPermit: { select: { number: true } },
    },
  },
} satisfies Prisma.IncidentInclude;

export type IncidentWithDetail = Prisma.IncidentGetPayload<{
  include: typeof incidentDetailInclude;
}>;

function readCorrectionItems(changes: Prisma.JsonValue): IncidentCorrectionView["items"] {
  if (!Array.isArray(changes)) return [];

  return changes.flatMap((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    if (
      typeof row.aidItemId !== "string" ||
      typeof row.name !== "string" ||
      typeof row.unit !== "string" ||
      typeof row.beforeQty !== "number" ||
      typeof row.afterQty !== "number"
    ) {
      return [];
    }

    return [
      {
        aidItemId: row.aidItemId,
        name: row.name,
        unit: row.unit,
        beforeQty: row.beforeQty,
        afterQty: row.afterQty,
      },
    ];
  });
}

export function toIncidentDetail(incident: IncidentWithDetail): IncidentDetailView {
  const recommendation = incident.recommendations[0] ?? null;
  const permit = incident.permits[0] ?? null;
  const decision = recommendation?.decisions[0] ?? null;

  const factors =
    incident.affectedPeople === null ||
    incident.damageLevel === null ||
    incident.roadAccess === null ||
    incident.weather === null ||
    incident.density === null
      ? null
      : {
          affectedPeople: incident.affectedPeople,
          damageLevel: incident.damageLevel,
          vulnerableBabies: incident.vulnerableBabies,
          vulnerableElderly: incident.vulnerableElderly,
          vulnerablePregnant: incident.vulnerablePregnant,
          vulnerableDisabled: incident.vulnerableDisabled,
          roadAccess: incident.roadAccess,
          weather: incident.weather,
          density: incident.density,
        };

  return {
    id: incident.id,
    code: incident.code,
    title: incident.title,
    disasterType: incident.disasterType,
    disasterDetail: incident.disasterDetail,
    lat: incident.lat,
    lng: incident.lng,
    radiusM: incident.radiusM,
    occurredAt: incident.occurredAt.toISOString(),
    status: incident.status,
    affectedPeople: incident.affectedPeople,
    region: incident.region,
    reporter: incident.reporter,
    factors,
    cancelReason: incident.cancelReason,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    recommendation: recommendation
      ? {
          id: recommendation.id,
          modelVersion: recommendation.modelVersion,
          totalPeople: recommendation.totalPeople,
          generatedAt: recommendation.generatedAt.toISOString(),
          items: recommendation.items.map((item) => ({
            id: item.id,
            aidItemId: item.aidItemId,
            name: item.aidItem.name,
            icon: item.aidItem.icon,
            unit: item.unit,
            baseQty: item.baseQty,
            finalQty: item.finalQty,
            reason: item.reason,
            adjustReason: item.adjustReason,
          })),
        }
      : null,
    logs: incident.logs.map((log) => ({
      id: log.id,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      note: log.note,
      actorName: log.actor?.name ?? null,
      createdAt: log.createdAt.toISOString(),
    })),
    permit: permit
      ? {
          id: permit.id,
          number: permit.number,
          issuedAt: permit.issuedAt.toISOString(),
          validUntil: permit.validUntil?.toISOString() ?? null,
          status: permit.status,
          posko: {
            id: permit.posko.id,
            name: permit.posko.name,
            regionName: permit.posko.region.name,
          },
          issuedBy: permit.issuedBy,
          items: permit.items,
          supersededAt: permit.supersededAt?.toISOString() ?? null,
          supersededByNumber: permit.supersededByNumber,
          replacesNumber: permit.replacesNumber,
        }
      : null,
    decision: decision
      ? {
          id: decision.id,
          decision: decision.decision,
          reason: decision.reason,
          decidedAt: decision.decidedAt.toISOString(),
          deciderName: decision.decider.name,
        }
      : null,
    corrections: incident.corrections.map((correction) => ({
      id: correction.id,
      reason: correction.reason,
      actorName: correction.actor.name,
      createdAt: correction.createdAt.toISOString(),
      previousPermitNumber: correction.previousPermit.number,
      newPermitNumber: correction.newPermit.number,
      items: readCorrectionItems(correction.changes),
    })),
  };
}

/**
 * Menentukan kecamatan dari titik kejadian, bukan dari pilihan petugas.
 * Memakai batas wilayah resmi Kota Surabaya; titik di luar kota ditolak dengan
 * pesan yang memberi tahu langkah perbaikan.
 */
export async function resolveIncidentRegionId(
  prisma: PrismaClient,
  lat: number,
  lng: number,
): Promise<string> {
  const detected = resolveRegionForPoint(lat, lng);

  if (!detected) {
    throw new RequestError(
      400,
      "Titik kejadian berada di luar Kota Surabaya. Geser titik ke lokasi kejadian, lalu coba lagi.",
    );
  }

  const region = await prisma.region.findFirst({
    where: {
      isActive: true,
      OR: [{ id: detected.id }, { name: detected.name }],
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!region) {
    throw new RequestError(
      400,
      `Kecamatan ${detected.name} belum ada di data wilayah. Hubungi admin untuk menambahkannya.`,
    );
  }

  return region.id;
}

export async function generateUniqueTrackingCode(prisma: PrismaClient): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = createTrackingCode((max) => randomInt(0, max));
    const existing = await prisma.incident.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw new Error("Kode lacak belum bisa dibuat. Coba lagi sebentar.");
}

/** Nomor izin berurutan per tanggal Jakarta. Dipanggil di dalam transaksi. */
export async function nextPermitNumber(
  tx: Prisma.TransactionClient,
  clock: ClockService,
): Promise<string> {
  const stamp = await clock.jakartaDateStamp();
  const prefix = `IZN-${stamp}-`;
  const rows = await tx.permit.findMany({
    where: { number: { startsWith: prefix } },
    select: { number: true },
  });

  let highest = 0;
  for (const row of rows) {
    const suffix = Number.parseInt(row.number.slice(prefix.length), 10);
    if (Number.isFinite(suffix)) {
      highest = Math.max(highest, suffix);
    }
  }

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

export async function loadPoskoStocks(prisma: PrismaClient): Promise<PoskoStockView[]> {
  const poskos = await prisma.posko.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      region: { select: { name: true } },
      stocks: {
        where: { aidItem: { isActive: true } },
        select: { aidItemId: true, qty: true },
      },
    },
  });

  return poskos.map((posko) => ({
    id: posko.id,
    name: posko.name,
    regionName: posko.region.name,
    stocks: posko.stocks,
  }));
}

export async function loadPimpinanIncidentDetail(
  prisma: PrismaClient,
  id: string,
): Promise<PimpinanIncidentDetailView | null> {
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: incidentDetailInclude,
  });

  if (!incident) return null;

  return {
    ...toIncidentDetail(incident),
    poskos: await loadPoskoStocks(prisma),
  };
}

/** Mengunci satu laporan agar dua permintaan bersamaan tidak saling menimpa. */
export async function lockIncident(
  tx: Prisma.TransactionClient,
  incidentId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${incidentId})::bigint)`;
}
