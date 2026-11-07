import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDistance, formatNumber, formatRelativeTime } from "./format";

const NOW = Date.parse("2026-11-08T10:00:00.000Z");

describe("format angka", () => {
  it("memakai pemisah ribuan Indonesia", () => {
    expect(formatNumber(1_200)).toBe("1.200");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("format jarak", () => {
  it("menampilkan meter di bawah 1 km", () => {
    expect(formatDistance(350)).toBe("350 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("menampilkan kilometer dengan koma desimal", () => {
    expect(formatDistance(1_200)).toBe("1,2 km");
    expect(formatDistance(5_000)).toBe("5 km");
  });

  it("menolak jarak negatif", () => {
    expect(() => formatDistance(-10)).toThrow(RangeError);
  });
});

describe("format tanggal", () => {
  it("memakai zona waktu Jakarta", () => {
    const date = "2026-11-08T03:42:00.000Z";
    expect(formatDate(date)).toContain("2026");
    expect(formatDateTime(date)).toMatch(/10[:.]42/);
  });
});

describe("format waktu relatif", () => {
  it("menampilkan menit, jam, dan hari", () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe("baru saja");
    expect(formatRelativeTime(NOW - 12 * 60_000, NOW)).toBe("12 menit lalu");
    expect(formatRelativeTime(NOW - 2 * 3_600_000, NOW)).toBe("2 jam lalu");
    expect(formatRelativeTime(NOW - 3 * 24 * 3_600_000, NOW)).toBe("3 hari lalu");
    expect(formatRelativeTime(NOW - 24 * 3_600_000, NOW)).toBe("kemarin");
  });
});
