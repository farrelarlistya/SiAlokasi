import type { IncidentStatus } from "./domain";
import { INCIDENT_STATUSES } from "./domain";

/**
 * Peta perpindahan status yang sah. Arah panah selalu dari kiri ke kanan.
 * Terminal berarti tidak ada perpindahan keluar lagi.
 */
export const STATUS_FLOW: Record<IncidentStatus, readonly IncidentStatus[]> = {
  BARU: ["DIPERIKSA", "DIBATALKAN"],
  DIPERIKSA: ["MENUNGGU_PERSETUJUAN", "DIBATALKAN"],
  MENUNGGU_PERSETUJUAN: ["DISETUJUI", "DITOLAK", "DIBATALKAN"],
  DISETUJUI: ["SELESAI"],
  SELESAI: [],
  DITOLAK: [],
  DIBATALKAN: [],
};

export const TERMINAL_STATUSES: readonly IncidentStatus[] = ["SELESAI", "DITOLAK", "DIBATALKAN"];

/** Laporan hanya boleh disunting selama masih berstatus BARU. */
export function isEditable(status: IncidentStatus): boolean {
  return status === "BARU";
}

export function isTerminal(status: IncidentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Petugas boleh membatalkan laporannya sendiri selama belum diajukan. */
export function canCancelByPetugas(status: IncidentStatus): boolean {
  return status === "BARU" || status === "DIPERIKSA";
}

/** Pimpinan boleh membatalkan laporan yang sudah masuk antrian. */
export function canCancelByPimpinan(status: IncidentStatus): boolean {
  return status === "MENUNGGU_PERSETUJUAN";
}

/** Setelah disetujui, isi hanya boleh diperbaiki lewat izin koreksi baru. */
export function canCorrectPermit(status: IncidentStatus): boolean {
  return status === "DISETUJUI" || status === "SELESAI";
}

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return STATUS_FLOW[from].includes(to);
}

export class TransitionError extends Error {
  readonly from: IncidentStatus;
  readonly to: IncidentStatus;

  constructor(from: IncidentStatus, to: IncidentStatus) {
    super(`Status tidak bisa berpindah dari ${from} ke ${to}.`);
    this.name = "TransitionError";
    this.from = from;
    this.to = to;
  }
}

export function assertTransition(from: IncidentStatus, to: IncidentStatus): void {
  if (!canTransition(from, to)) {
    throw new TransitionError(from, to);
  }
}

/** Langkah timeline publik: 4 titik yang mudah dipahami tamu. */
export const PUBLIC_TIMELINE: readonly IncidentStatus[] = [
  "BARU",
  "DIPERIKSA",
  "MENUNGGU_PERSETUJUAN",
  "DISETUJUI",
];

export function publicTimelineIndex(status: IncidentStatus): number {
  if (status === "SELESAI") return PUBLIC_TIMELINE.length;
  const index = PUBLIC_TIMELINE.indexOf(status);
  return index === -1 ? 0 : index;
}

export function assertKnownStatus(value: string): IncidentStatus {
  if (!(INCIDENT_STATUSES as readonly string[]).includes(value)) {
    throw new Error(`Status "${value}" tidak dikenal.`);
  }
  return value as IncidentStatus;
}
