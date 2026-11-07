import type { PrismaClient } from "@prisma/client";

/**
 * Satu-satunya pintu waktu bisnis aplikasi. Semua modul lain wajib memakai
 * `clock.now()` agar waktu bisa dimajukan lewat panel demo tanpa mengubah kode.
 */
export class ClockService {
  constructor(private readonly prisma: PrismaClient) {}

  async offsetMinutes(): Promise<number> {
    const clock = await this.prisma.demoClock.findUnique({ where: { id: 1 } });
    return clock?.offsetMinutes ?? 0;
  }

  async now(): Promise<Date> {
    const offset = await this.offsetMinutes();
    return new Date(Date.now() + offset * 60_000);
  }

  async setOffsetMinutes(offsetMinutes: number): Promise<Date> {
    await this.prisma.demoClock.upsert({
      where: { id: 1 },
      update: { offsetMinutes },
      create: { id: 1, offsetMinutes },
    });
    return this.now();
  }

  async reset(): Promise<void> {
    await this.setOffsetMinutes(0);
  }
}
