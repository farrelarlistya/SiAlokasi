import type { DisasterType } from "./domain";

export const RECAP_GROUPS = ["region", "type", "month"] as const;
export type RecapGroup = (typeof RECAP_GROUPS)[number];

export const RECAP_GROUP_LABEL: Record<RecapGroup, string> = {
  region: "Kecamatan",
  type: "Jenis bencana",
  month: "Bulan",
};

/** Satu baris rekap; angkanya selalu bilangan bulat. */
export type RecapRow = {
  key: string;
  label: string;
  totalReports: number;
  affectedPeople: number;
  approved: number;
  waiting: number;
  rejected: number;
  cancelled: number;
  permits: number;
  lastOccurredAt: string | null;
};

export type RecapTotals = Omit<RecapRow, "key" | "label" | "lastOccurredAt">;

export type RecapResponse = {
  rows: RecapRow[];
  totals: RecapTotals;
  from: string | null;
  to: string | null;
  groupBy: RecapGroup;
  generatedAt: string;
  note: string;
};

export function emptyRecapRow(key: string, label: string): RecapRow {
  return {
    key,
    label,
    totalReports: 0,
    affectedPeople: 0,
    approved: 0,
    waiting: 0,
    rejected: 0,
    cancelled: 0,
    permits: 0,
    lastOccurredAt: null,
  };
}

export function emptyRecapTotals(): RecapTotals {
  return {
    totalReports: 0,
    affectedPeople: 0,
    approved: 0,
    waiting: 0,
    rejected: 0,
    cancelled: 0,
    permits: 0,
  };
}

/** Label bulan dari kunci `YYYY-MM`, contoh 2026-11 → "November 2026". */
export function formatMonthKey(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return key;

  const date = new Date(`${key}-01T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return key;

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDisasterKey(value: DisasterType): string {
  return value;
}

/**
 * Satu sel CSV yang aman: tanda kutip ganda di-escape, koma/baris baru
 * dibungkus tanda kutip. Dipakai untuk ekspor rekap.
 */
export function formatCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  const text = String(value);
  if (/[",\r\n;]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

/** CSV rekap memakai pemisah koma, BOM UTF-8, dan CRLF agar rapi di Excel. */
export function buildRecapCsv(rows: RecapRow[]): string {
  const header = [
    "Kelompok",
    "Jumlah laporan",
    "Jiwa terdampak",
    "Disetujui",
    "Belum diputuskan",
    "Ditolak",
    "Dibatalkan",
    "Izin terbit",
  ];

  const lines = [header.map(formatCsvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.label,
        row.totalReports,
        row.affectedPeople,
        row.approved,
        row.waiting,
        row.rejected,
        row.cancelled,
        row.permits,
      ]
        .map(formatCsvCell)
        .join(","),
    );
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
