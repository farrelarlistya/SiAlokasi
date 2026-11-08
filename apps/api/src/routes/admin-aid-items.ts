import type { Prisma, PrismaClient } from "@prisma/client";
import { aidItemInputSchema } from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { writeAudit } from "../lib/audit";
import { requireRole } from "../lib/rbac";

type AidItemAdminDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

const updateSchema = aidItemInputSchema.partial();

function itemAuditValue(item: {
  name: string;
  unit: string;
  icon: string;
  standardPerPerson: number;
  isActive: boolean;
  sortOrder: number;
}) {
  return {
    name: item.name,
    unit: item.unit,
    icon: item.icon,
    standardPerPerson: item.standardPerPerson,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
  };
}

export function registerAdminAidItemRoutes(
  app: FastifyInstance,
  deps: AidItemAdminDependencies,
): void {
  const adminOnly = { preHandler: requireRole(deps, "ADMIN") };

  app.get("/api/admin/aid-items", adminOnly, async () => {
    const rows = await deps.prisma.aidItem.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { recommendationItems: true, stocks: true } },
      },
    });

    const items = rows.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      icon: item.icon,
      standardPerPerson: item.standardPerPerson,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      usageCount: item._count.recommendationItems,
      stockRows: item._count.stocks,
    }));

    return {
      items,
      summary: {
        total: items.length,
        active: items.filter((item) => item.isActive).length,
        inactive: items.filter((item) => !item.isActive).length,
      },
    };
  });

  app.post("/api/admin/aid-items", adminOnly, async (request, reply) => {
    const parsed = aidItemInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.issues[0]?.message ?? "Isian belum lengkap." },
      });
    }

    const { name, unit, icon, standardPerPerson, isActive } = parsed.data;
    const duplicate = await deps.prisma.aidItem.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });

    if (duplicate) {
      return reply.code(409).send({
        error: {
          message: `Jenis bantuan "${name}" sudah ada. Buka item itu untuk mengubahnya.`,
        },
      });
    }

    const last = await deps.prisma.aidItem.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const item = await deps.prisma.aidItem.create({
      data: {
        name,
        unit,
        icon,
        standardPerPerson,
        isActive: isActive ?? true,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });

    await writeAudit(deps.prisma, deps.clock, {
      entity: "AidItem",
      entityId: item.id,
      action: "BUAT",
      actorId: request.auth?.user.id ?? null,
      after: itemAuditValue(item),
    });

    return reply.code(201).send({
      data: item,
      message: `Jenis bantuan "${item.name}" berhasil ditambahkan.`,
    });
  });

  app.patch("/api/admin/aid-items/:id", adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.issues[0]?.message ?? "Isian belum lengkap." },
      });
    }

    if (Object.keys(parsed.data).length === 0) {
      return reply.code(400).send({
        error: { message: "Belum ada perubahan yang bisa disimpan." },
      });
    }

    const target = await deps.prisma.aidItem.findUnique({ where: { id } });
    if (!target) {
      return reply.code(404).send({ error: { message: "Jenis bantuan ini tidak ditemukan." } });
    }

    if (parsed.data.name) {
      const duplicate = await deps.prisma.aidItem.findFirst({
        where: {
          name: { equals: parsed.data.name, mode: "insensitive" },
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicate) {
        return reply.code(409).send({
          error: {
            message: `Jenis bantuan "${parsed.data.name}" sudah ada. Gunakan nama lain.`,
          },
        });
      }
    }

    const data: Prisma.AidItemUpdateInput = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.unit !== undefined) data.unit = parsed.data.unit;
    if (parsed.data.icon !== undefined) data.icon = parsed.data.icon;
    if (parsed.data.standardPerPerson !== undefined) {
      data.standardPerPerson = parsed.data.standardPerPerson;
    }
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

    const updated = await deps.prisma.aidItem.update({ where: { id }, data });

    const action =
      parsed.data.isActive === false && target.isActive
        ? "NONAKTIFKAN"
        : parsed.data.isActive === true && !target.isActive
          ? "AKTIFKAN"
          : "UBAH";

    await writeAudit(deps.prisma, deps.clock, {
      entity: "AidItem",
      entityId: id,
      action,
      actorId: request.auth?.user.id ?? null,
      before: itemAuditValue(target),
      after: itemAuditValue(updated),
    });

    const message =
      parsed.data.isActive === false
        ? `"${updated.name}" dinonaktifkan. Item ini hilang dari formulir baru, tetapi tetap muncul di laporan lama.`
        : parsed.data.isActive === true
          ? `"${updated.name}" aktif kembali dan bisa dipilih di formulir baru.`
          : `Perubahan "${updated.name}" sudah disimpan.`;

    return { data: updated, message };
  });
}
