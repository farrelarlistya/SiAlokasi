import type { Prisma, PrismaClient, Role } from "@prisma/client";
import { ROLES, ROLE_LABEL, userRoleInputSchema } from "@sialokasi/shared";
import type { FastifyInstance } from "fastify";
import type { ClockService } from "../clock";
import { writeAudit } from "../lib/audit";
import { requireRole } from "../lib/rbac";

type UserAdminDependencies = {
  prisma: PrismaClient;
  clock: ClockService;
};

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  region: { select: { id: true, name: true } },
} as const;

function queryString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function registerAdminUserRoutes(app: FastifyInstance, deps: UserAdminDependencies): void {
  const adminOnly = { preHandler: requireRole(deps, "ADMIN") };

  app.get("/api/admin/users", adminOnly, async (request) => {
    const query = request.query as Record<string, unknown>;
    const search = queryString(query.search);
    const role = queryString(query.role);
    const status = queryString(query.status);

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if ((ROLES as readonly string[]).includes(role)) {
      where.role = role as Role;
    }

    if (status === "active") where.isActive = true;
    if (status === "pending") where.isActive = false;

    const users = await deps.prisma.user.findMany({
      where,
      orderBy: [{ isActive: "asc" }, { createdAt: "desc" }],
      select: userListSelect,
    });

    return {
      users,
      summary: {
        total: users.length,
        pending: users.filter((user) => !user.isActive).length,
      },
    };
  });

  app.patch("/api/admin/users/:id", adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = userRoleInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { message: parsed.error.issues[0]?.message ?? "Isian belum lengkap." },
      });
    }

    const { role, isActive } = parsed.data;
    if (role === undefined && isActive === undefined) {
      return reply.code(400).send({
        error: { message: "Pilih perubahan peran atau status akun yang ingin disimpan." },
      });
    }

    const target = await deps.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        regionId: true,
      },
    });

    if (!target) {
      return reply.code(404).send({ error: { message: "Akun ini tidak ditemukan." } });
    }

    const actorId = request.auth?.user.id ?? null;
    if (target.id === actorId && isActive === false) {
      return reply.code(400).send({
        error: {
          message:
            "Akun Anda sendiri tidak bisa dinonaktifkan. Minta admin lain mengubah status bila perlu.",
        },
      });
    }

    if (target.id === actorId && role !== undefined && role !== target.role) {
      return reply.code(400).send({
        error: {
          message:
            "Peran akun Anda sendiri tidak bisa diubah dari halaman ini. Minta admin lain mengubahnya.",
        },
      });
    }

    const data: Prisma.UserUpdateInput = {};
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await deps.prisma.user.update({
      where: { id },
      data,
      select: userListSelect,
    });

    if (isActive === false) {
      await deps.prisma.session.deleteMany({ where: { userId: id } });
    }

    const action =
      role !== undefined && role !== target.role
        ? "UBAH_PERAN"
        : isActive === false
          ? "NONAKTIFKAN"
          : "AKTIFKAN";

    await writeAudit(deps.prisma, deps.clock, {
      entity: "User",
      entityId: id,
      action,
      actorId,
      before: { role: target.role, isActive: target.isActive },
      after: { role: updated.role, isActive: updated.isActive },
    });

    const message =
      isActive === false
        ? `Akun ${updated.name} dinonaktifkan. Riwayat laporannya tetap tersimpan.`
        : role !== undefined && role !== target.role
          ? `Peran ${updated.name} sekarang ${ROLE_LABEL[updated.role]}. Menu dan hak aksesnya langsung menyesuaikan.`
          : `Akun ${updated.name} sudah aktif dan bisa dipakai masuk.`;

    return { data: updated, message };
  });
}
