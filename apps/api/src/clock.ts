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

  /** Waktu bisnis ditambah sejumlah menit, dipakai untuk masa berlaku sesi & kode masuk. */
  async afterMinutes(minutes: number): Promise<Date> {
    const now = await this.now();
    return new Date(now.getTime() + minutes * 60_000);
  }

  /** Membaca waktu yang dikirim formulir. Semua parsing tanggal lewat sini. */
  parseBusinessDate(value: string): Date {
    return new Date(value);
  }

  /** Menggeser waktu bisnis yang sudah dihitung tanpa memakai jam sistem langsung. */
  shift(base: Date, deltaMs: number): Date {
    return new Date(base.getTime() + deltaMs);
  }

  /** Waktu bisnis ditambah sejumlah hari, dipakai untuk masa berlaku izin. */
  async afterDays(days: number): Promise<Date> {
    const now = await this.now();
    return new Date(now.getTime() + days * 24 * 60 * 60_000);
  }

  /** Tanggal Jakarta dalam bentuk YYYYMMDD untuk nomor izin. */
  async jakartaDateStamp(): Promise<string> {
    const now = await this.now();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(now)
      .replaceAll("-", "");
  }

  /** Awal hari menurut waktu Jakarta, dipakai untuk ringkasan "hari ini". */
  async startOfDayJakarta(): Promise<Date> {
    const now = await this.now();
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return new Date(`${date}T00:00:00+07:00`);
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
