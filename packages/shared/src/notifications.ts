import { z } from "zod";
import type { IncidentStatus } from "./domain";

/**
 * Notifikasi in-app adalah pengganti pesan WA/SMS pada mode demo.
 * Semua pesan memakai bahasa manusia dan tidak menyebut istilah mesin.
 */
export const NOTIFICATION_KINDS = ["LAPORAN", "KEPUTUSAN", "IZIN", "SISTEM"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  LAPORAN: "Laporan",
  KEPUTUSAN: "Keputusan",
  IZIN: "Izin distribusi",
  SISTEM: "Sistem",
};

export type NotificationView = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  incidentId: string | null;
  incidentCode: string | null;
  permitId: string | null;
  permitNumber: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  notifications: NotificationView[];
  unreadCount: number;
  total: number;
  note: string;
};

export const notificationReadSchema = z
  .object({
    all: z.boolean().optional(),
    ids: z
      .array(z.string().trim().min(1))
      .max(100, "Pilih paling banyak 100 notifikasi sekaligus.")
      .optional(),
  })
  .refine((value) => value.all === true || (value.ids?.length ?? 0) > 0, {
    message: "Pilih notifikasi yang ingin ditandai sudah dibaca.",
  });

export type NotificationReadInput = z.infer<typeof notificationReadSchema>;

export type StatusNotificationDraft = {
  kind: NotificationKind;
  title: string;
  body: string;
};

type StatusNotificationInput = {
  code: string;
  title: string;
  toStatus: IncidentStatus;
  permitNumber?: string | null;
  reason?: string | null;
};

function subject(code: string, title: string): string {
  return `${code} · ${title}`;
}

function reasonSuffix(reason: string | null | undefined): string {
  const clean = reason?.trim();
  return clean ? ` Alasan: ${clean}` : "";
}

/** Menyusun pesan notifikasi untuk setiap perpindahan status laporan. */
export function buildStatusNotification(input: StatusNotificationInput): StatusNotificationDraft {
  const subjectText = subject(input.code, input.title);

  switch (input.toStatus) {
    case "BARU":
      return {
        kind: "LAPORAN",
        title: "Laporan tersimpan",
        body: `${subjectText} sudah tersimpan. Lengkapi 8 faktor untuk menghitung estimasi bantuan.`,
      };
    case "DIPERIKSA":
      return {
        kind: "LAPORAN",
        title: "Estimasi bantuan siap",
        body: `${subjectText} sudah dihitung. Periksa daftar bantuan dan alasannya sebelum diajukan ke pimpinan.`,
      };
    case "MENUNGGU_PERSETUJUAN":
      return {
        kind: "LAPORAN",
        title: "Laporan menunggu keputusan",
        body: `${subjectText} sudah diajukan dan menunggu keputusan pimpinan.`,
      };
    case "DISETUJUI":
      return {
        kind: "IZIN",
        title: "Izin distribusi terbit",
        body: `${subjectText} disetujui.${
          input.permitNumber ? ` Izin distribusi ${input.permitNumber} sudah terbit.` : ""
        }`,
      };
    case "SELESAI":
      return {
        kind: "IZIN",
        title: "Distribusi selesai",
        body: `${subjectText} sudah ditandai selesai dan laporannya ditutup.`,
      };
    case "DITOLAK":
      return {
        kind: "KEPUTUSAN",
        title: "Laporan ditolak",
        body: `${subjectText} ditolak.${reasonSuffix(input.reason)} Buka laporan untuk menindaklanjuti.`,
      };
    case "DIBATALKAN":
      return {
        kind: "KEPUTUSAN",
        title: "Laporan dibatalkan",
        body: `${subjectText} dibatalkan.${reasonSuffix(input.reason)}`,
      };
    default: {
      const exhaustive: never = input.toStatus;
      throw new Error(`Status notifikasi tidak dikenal: ${String(exhaustive)}`);
    }
  }
}

type CorrectionNotificationInput = {
  code: string;
  title: string;
  previousPermitNumber: string;
  newPermitNumber: string;
  reason?: string | null;
};

/** Notifikasi saat izin lama digantikan izin koreksi baru. */
export function buildCorrectionNotification(
  input: CorrectionNotificationInput,
): StatusNotificationDraft {
  return {
    kind: "IZIN",
    title: "Izin distribusi dikoreksi",
    body: `${subject(input.code, input.title)}: izin ${input.previousPermitNumber} digantikan izin ${
      input.newPermitNumber
    }.${reasonSuffix(input.reason)}`,
  };
}
