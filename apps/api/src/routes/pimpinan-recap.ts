import type { PrismaClient } from "@prisma/client";
import {
  buildRecapCsv,
  DISASTER_LABEL,
  emptyRecapRow,
  emptyRecapTotals,
  formatMonthKey,
  recapFilterSchema,
  type RecapGroup,
  type RecapFilter,
  type RecapResponse,
  type RecapRow,
} from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { requireRole } from "../lib/rbac";

type RecapDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

const JAKARTA_MONTH = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
});

function parseFilterDate(
  clock: ClockService,
  value: string | undefined,
  endOfDay: boolean,
): Date | undefined {
  if (!value) return undefined;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!dateOnly) {
    const parsed = clock.parseBusinessDate(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return clock.parseBusinessDate(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`,
  );
}

function groupKeyFor(
  groupBy: RecapGroup,
  incident: {
    disasterType: string;
    occurredAt: Date;
    region: { id: string; name: string } | null;
  },
): { key: string; label: string } {
  if (groupBy === "type") {
    const type = incident.disasterType as keyof typeof DISASTER_LABEL;
    return {
      key: incident.disasterType,
      label: DISASTER_LABEL[type] ?? incident.disasterType,
    };
  }

  if (groupBy === "month") {
    const key = JAKARTA_MONTH.format(incident.occurredAt);
    return { key, label: formatMonthKey(key) };
  }

  return incident.region
    ? { key: incident.region.id, label: incident.region.name }
    : { key: "tanpa-kecamatan", label: "Tanpa kecamatan" };
}

async function buildRecap(
  deps: RecapDependencies,
  filter: RecapFilter,
): Promise<RecapResponse> {
  const from = parseFilterDate(deps.clock, filter.from, false);
  const to = parseFilterDate(deps.clock, filter.to, true);

  const incidents = await deps.prisma.incident.findMany({
    where: {
      ...(from || to
        ? {
            occurredAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(filter.regionId ? { regionId: filter.regionId } : {}),
      ...(filter.disasterType ? { disasterType: filter.disasterType } : {}),
    },
    orderBy: { occurredAt: "desc" },
    select: {
      status: true,
      affectedPeople: true,
      disasterType: true,
      occurredAt: true,
      region: { select: { id: true, name: true } },
      permits: {
        where: { supersededAt: null },
        select: { id: true },
      },
    },
  });

  const rows = new Map<string, RecapRow>();

  for (const incident of incidents) {
    const group = groupKeyFor(filter.groupBy, incident);
    const row = rows.get(group.key) ?? emptyRecapRow(group.key, group.label);

    row.totalReports += 1;
    row.affectedPeople += incident.affectedPeople ?? 0;
    row.permits += incident.permits.length;

    if (incident.status === "DISETUJUI" || incident.status === "SELESAI") {
      row.approved += 1;
    } else if (
      incident.status === "BARU" ||
      incident.status === "DIPERIKSA" ||
      incident.status === "MENUNGGU_PERSETUJUAN"
    ) {
      row.waiting += 1;
    } else if (incident.status === "DITOLAK") {
      row.rejected += 1;
    } else if (incident.status === "DIBATALKAN") {
      row.cancelled += 1;
    }

    const iso = incident.occurredAt.toISOString();
    if (!row.lastOccurredAt || iso > row.lastOccurredAt) {
      row.lastOccurredAt = iso;
    }

    rows.set(group.key, row);
  }

  const ordered = [...rows.values()].sort((a, b) => {
    if (filter.groupBy === "month") return b.key.localeCompare(a.key);
    return a.label.localeCompare(b.label, "id");
  });

  const totals = emptyRecapTotals();
  for (const row of ordered) {
    totals.totalReports += row.totalReports;
    totals.affectedPeople += row.affectedPeople;
    totals.approved += row.approved;
    totals.waiting += row.waiting;
    totals.rejected += row.rejected;
    totals.cancelled += row.cancelled;
    totals.permits += row.permits;
  }

  return {
    rows: ordered,
    totals,
    from: filter.from ?? null,
    to: filter.to ?? null,
    groupBy: filter.groupBy,
    generatedAt: (await deps.clock.now()).toISOString(),
    note: "Rekap menghitung laporan yang tercatat, termasuk laporan baru yang belum diputuskan. Izin yang sudah digantikan koreksi tidak dihitung dua kali.",
  };
}

function csvFileName(stamp: string): string {
  return `rekap-sialokasi-${stamp}.csv`;
}

export function registerPimpinanRecapRoutes(
  app: FastifyInstance,
  deps: RecapDependencies,
): void {
  const pimpinanOnly = { preHandler: requireRole(deps, "PIMPINAN") };

  app.get("/api/pimpinan/recap", pimpinanOnly, async (request, reply) => {
    const parsed = recapFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          message:
            parsed.error.issues[0]?.message ??
            "Pilihan rekap belum dikenali. Periksa tanggal dan kelompok yang dipilih.",
        },
      });
    }

    return buildRecap(deps, parsed.data);
  });

  app.get("/api/pimpinan/recap/export.csv", pimpinanOnly, async (request, reply) => {
    const parsed = recapFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          message:
            parsed.error.issues[0]?.message ??
            "Pilihan rekap belum dikenali. Periksa tanggal dan kelompok yang dipilih.",
        },
      });
    }

    const recap = await buildRecap(deps, parsed.data);
    const stamp = await deps.clock.jakartaDateStamp();

    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${csvFileName(stamp)}"`)
      .send(buildRecapCsv(recap.rows));
  });
}
