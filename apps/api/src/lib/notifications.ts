import type { Prisma, PrismaClient } from "@prisma/client";
import {
  buildCorrectionNotification,
  buildStatusNotification,
  type IncidentStatus,
} from "@sialokasi/shared";
import type { ClockService } from "../clock";

type NotificationWriter =
  | Pick<PrismaClient, "notification" | "user">
  | Prisma.TransactionClient;

export type StatusNotificationContext = {
  incidentId: string;
  reporterId: string;
  code: string;
  title: string;
  toStatus: IncidentStatus;
  permitNumber?: string | null;
  permitId?: string | null;
  reason?: string | null;
};

/**
 * Adapter notifikasi mode simulasi: menulis satu baris untuk setiap penerima.
 * Titik sambung ke WA/SMS asli nanti cukup mengganti isi fungsi ini.
 */
export async function notifyStatusChange(
  writer: NotificationWriter,
  clock: ClockService,
  input: StatusNotificationContext,
): Promise<number> {
  const draft = buildStatusNotification(input);
  const recipients = new Set<string>([input.reporterId]);

  // Antrian pimpinan perlu lonceng sendiri saat laporan baru diajukan.
  if (input.toStatus === "MENUNGGU_PERSETUJUAN") {
    const pimpinan = await writer.user.findMany({
      where: { role: "PIMPINAN", isActive: true },
      select: { id: true },
    });
    for (const user of pimpinan) recipients.add(user.id);
  }

  const createdAt = await clock.now();
  await writer.notification.createMany({
    data: [...recipients].map((userId) => ({
      userId,
      kind: draft.kind,
      title: draft.title,
      body: draft.body,
      incidentId: input.incidentId,
      permitId: input.permitId ?? null,
      createdAt,
    })),
  });

  return recipients.size;
}

export type CorrectionNotificationContext = {
  incidentId: string;
  reporterId: string;
  actorId: string;
  code: string;
  title: string;
  previousPermitNumber: string;
  newPermitNumber: string;
  permitId: string;
  reason?: string | null;
};

/** Notifikasi koreksi: pelapor diberi tahu, pimpinan lain tetap melihat jejaknya. */
export async function notifyPermitCorrection(
  writer: NotificationWriter,
  clock: ClockService,
  input: CorrectionNotificationContext,
): Promise<number> {
  const draft = buildCorrectionNotification(input);
  const recipients = new Set<string>([input.reporterId]);

  const pimpinan = await writer.user.findMany({
    where: { role: "PIMPINAN", isActive: true, id: { not: input.actorId } },
    select: { id: true },
  });
  for (const user of pimpinan) recipients.add(user.id);

  const createdAt = await clock.now();
  await writer.notification.createMany({
    data: [...recipients].map((userId) => ({
      userId,
      kind: draft.kind,
      title: draft.title,
      body: draft.body,
      incidentId: input.incidentId,
      permitId: input.permitId,
      createdAt,
    })),
  });

  return recipients.size;
}
