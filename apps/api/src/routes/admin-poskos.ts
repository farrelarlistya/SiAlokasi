import type { PrismaClient } from "@prisma/client";
import { poskoInputSchema, poskoUpdateSchema, SURABAYA_BOUNDS } from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { writeAudit } from "../lib/audit";
import { requireRole } from "../lib/rbac";

type PoskoAdminDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

export function registerAdminPoskoRoutes(
  app: FastifyInstance,
  deps: PoskoAdminDependencies,
): void {
  const adminOnly = { preHandler: requireRole(deps, "ADMIN") };

  app.get("/api/admin/poskos", adminOnly, async () => {
    const poskos = await deps.prisma.posko.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        region: { select: { id: true, name: true, isActive: true } },
        _count: { select: { stocks: true, permits: true } },
      },
    });

    return {
      poskos: poskos.map((posko) => ({
        id: posko.id,
        name: posko.name,
        regionId: posko.regionId,
        regionName: posko.region.name,
        regionActive: posko.region.isActive,
        lat: posko.lat,
        lng: posko.lng,
        isActive: posko.isActive,
        createdAt: posko.createdAt,
        stockRows: posko._count.stocks,
        permitCount: posko._count.permits,
      })),
      summary: {
        total: poskos.length,
        active: poskos.filter((posko) => posko.isActive).length,
      },
    };
  });

  app.post("/api/admin/poskos", adminOnly, async (request, reply) => {
    const parsed = poskoInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.issues[0]?.message ?? "Isian belum lengkap." },
      });
    }

    const { name, regionId, lat, lng, isActive } = parsed.data;
    const [duplicate, region] = await Promise.all([
      deps.prisma.posko.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        select: { id: true },
      }),
      deps.prisma.region.findFirst({
        where: { id: regionId, isActive: true },
        select: { id: true },
      }),
    ]);

    if (duplicate) {
      return reply.code(409).send({
        error: { message: `Posko "${name}" sudah ada. Buka data itu untuk mengubahnya.` },
      });
    }

    if (!region) {
      return reply.code(400).send({
        error: { message: "Kecamatan yang dipilih belum aktif. Pilih kecamatan lain." },
      });
    }

    const posko = await deps.prisma.posko.create({
      data: { name, regionId, lat, lng, isActive: isActive ?? true },
    });

    await writeAudit(deps.prisma, deps.clock, {
      entity: "Posko",
      entityId: posko.id,
      action: "BUAT",
      actorId: request.auth?.user.id ?? null,
      after: {
        name: posko.name,
        regionId: posko.regionId,
        lat: posko.lat,
        lng: posko.lng,
        isActive: posko.isActive,
      },
    });

    return reply.code(201).send({
      data: posko,
      message: `Posko "${posko.name}" berhasil ditambahkan dan langsung muncul di pilihan posko.`,
    });
  });

  app.patch("/api/admin/poskos/:id", adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = poskoUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.issues[0]?.message ?? "Isian belum lengkap." },
      });
    }

    if (Object.keys(parsed.data).length === 0) {
      return reply.code(400).send({ error: { message: "Belum ada perubahan yang bisa disimpan." } });
    }

    const target = await deps.prisma.posko.findUnique({ where: { id } });
    if (!target) {
      return reply.code(404).send({ error: { message: "Posko ini tidak ditemukan." } });
    }

    if (parsed.data.name) {
      const duplicate = await deps.prisma.posko.findFirst({
        where: {
          name: { equals: parsed.data.name, mode: "insensitive" },
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicate) {
        return reply.code(409).send({
          error: { message: `Posko "${parsed.data.name}" sudah ada. Gunakan nama lain.` },
        });
      }
    }

    if (parsed.data.regionId) {
      const region = await deps.prisma.region.findFirst({
        where: { id: parsed.data.regionId, isActive: true },
        select: { id: true },
      });

      if (!region) {
        return reply.code(400).send({
          error: { message: "Kecamatan yang dipilih belum aktif. Pilih kecamatan lain." },
        });
      }
    }

    if (parsed.data.lat !== undefined || parsed.data.lng !== undefined) {
      const lat = parsed.data.lat ?? target.lat;
      const lng = parsed.data.lng ?? target.lng;
      const inside =
        lat >= SURABAYA_BOUNDS.minLat &&
        lat <= SURABAYA_BOUNDS.maxLat &&
        lng >= SURABAYA_BOUNDS.minLng &&
        lng <= SURABAYA_BOUNDS.maxLng;

      if (!inside) {
        return reply.code(400).send({
          error: {
            message:
              "Titik posko harus berada di area Kota Surabaya. Geser titik di peta atau periksa angka lintang dan bujur.",
          },
        });
      }
    }

    const updated = await deps.prisma.posko.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.regionId !== undefined ? { regionId: parsed.data.regionId } : {}),
        ...(parsed.data.lat !== undefined ? { lat: parsed.data.lat } : {}),
        ...(parsed.data.lng !== undefined ? { lng: parsed.data.lng } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });

    await writeAudit(deps.prisma, deps.clock, {
      entity: "Posko",
      entityId: id,
      action: parsed.data.isActive === false ? "NONAKTIFKAN" : "UBAH",
      actorId: request.auth?.user.id ?? null,
      before: {
        name: target.name,
        regionId: target.regionId,
        lat: target.lat,
        lng: target.lng,
        isActive: target.isActive,
      },
      after: {
        name: updated.name,
        regionId: updated.regionId,
        lat: updated.lat,
        lng: updated.lng,
        isActive: updated.isActive,
      },
    });

    return {
      data: updated,
      message:
        parsed.data.isActive === false
          ? `Posko "${updated.name}" dinonaktifkan. Izin lama yang memakai posko ini tetap tersimpan.`
          : `Posko "${updated.name}" sudah diperbarui.`,
    };
  });
}
