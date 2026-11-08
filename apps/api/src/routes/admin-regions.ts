import type { PrismaClient } from "@prisma/client";
import { regionInputSchema } from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { writeAudit } from "../lib/audit";
import { requireRole } from "../lib/rbac";

type RegionAdminDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

const updateSchema = regionInputSchema.partial();

export function registerAdminRegionRoutes(
  app: FastifyInstance,
  deps: RegionAdminDependencies,
): void {
  const adminOnly = { preHandler: requireRole(deps, "ADMIN") };

  app.get("/api/admin/regions", adminOnly, async () => {
    const regions = await deps.prisma.region.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { poskos: true, incidents: true, users: true } },
      },
    });

    return {
      regions: regions.map((region) => ({
        id: region.id,
        name: region.name,
        isActive: region.isActive,
        createdAt: region.createdAt,
        poskoCount: region._count.poskos,
        incidentCount: region._count.incidents,
        userCount: region._count.users,
      })),
      summary: {
        total: regions.length,
        active: regions.filter((region) => region.isActive).length,
      },
    };
  });

  app.post("/api/admin/regions", adminOnly, async (request, reply) => {
    const parsed = regionInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.issues[0]?.message ?? "Isian belum lengkap." },
      });
    }

    const { name, isActive } = parsed.data;
    const duplicate = await deps.prisma.region.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });

    if (duplicate) {
      return reply.code(409).send({
        error: { message: `Kecamatan "${name}" sudah ada. Buka data itu untuk mengubahnya.` },
      });
    }

    const region = await deps.prisma.region.create({
      data: { name, isActive: isActive ?? true },
    });

    await writeAudit(deps.prisma, deps.clock, {
      entity: "Region",
      entityId: region.id,
      action: "BUAT",
      actorId: request.auth?.user.id ?? null,
      after: { name: region.name, isActive: region.isActive },
    });

    return reply.code(201).send({
      data: region,
      message: `Kecamatan "${region.name}" berhasil ditambahkan.`,
    });
  });

  app.patch("/api/admin/regions/:id", adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.issues[0]?.message ?? "Isian belum lengkap." },
      });
    }

    if (Object.keys(parsed.data).length === 0) {
      return reply.code(400).send({ error: { message: "Belum ada perubahan yang bisa disimpan." } });
    }

    const target = await deps.prisma.region.findUnique({ where: { id } });
    if (!target) {
      return reply.code(404).send({ error: { message: "Kecamatan ini tidak ditemukan." } });
    }

    if (parsed.data.name) {
      const duplicate = await deps.prisma.region.findFirst({
        where: {
          name: { equals: parsed.data.name, mode: "insensitive" },
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicate) {
        return reply.code(409).send({
          error: { message: `Kecamatan "${parsed.data.name}" sudah ada. Gunakan nama lain.` },
        });
      }
    }

    if (parsed.data.isActive === false && target.isActive) {
      const activePoskos = await deps.prisma.posko.count({
        where: { regionId: id, isActive: true },
      });

      if (activePoskos > 0) {
        return reply.code(409).send({
          error: {
            message: `Kecamatan ini masih punya ${activePoskos} posko aktif. Pindahkan atau nonaktifkan poskonya lebih dahulu.`,
          },
        });
      }
    }

    const updated = await deps.prisma.region.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });

    await writeAudit(deps.prisma, deps.clock, {
      entity: "Region",
      entityId: id,
      action: parsed.data.isActive === false ? "NONAKTIFKAN" : "UBAH",
      actorId: request.auth?.user.id ?? null,
      before: { name: target.name, isActive: target.isActive },
      after: { name: updated.name, isActive: updated.isActive },
    });

    return {
      data: updated,
      message:
        parsed.data.isActive === false
          ? `Kecamatan "${updated.name}" dinonaktifkan. Laporan lama tetap menyimpan nama kecamatan ini.`
          : `Kecamatan "${updated.name}" sudah diperbarui.`,
    };
  });
}
