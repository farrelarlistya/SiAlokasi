import type { Prisma, PrismaClient } from "@prisma/client";
import type { ClockService } from "../clock";

type AuditInput = {
  entity: string;
  entityId: string;
  action: string;
  actorId: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

/**
 * Menulis satu baris riwayat perubahan. Modul lain tidak boleh mengubah atau
 * menghapus baris audit; tabel ini hanya menerima penambahan.
 */
export async function writeAudit(
  prisma: PrismaClient,
  clock: ClockService,
  input: AuditInput,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      actorId: input.actorId,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      createdAt: await clock.now(),
    },
  });
}
