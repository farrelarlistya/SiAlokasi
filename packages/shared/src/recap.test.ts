import { describe, expect, it } from "vitest";
import {
  buildRecapCsv,
  emptyRecapRow,
  formatCsvCell,
  formatMonthKey,
  type RecapRow,
} from "./recap";

function row(overrides: Partial<RecapRow> = {}): RecapRow {
  return {
    ...emptyRecapRow("key", "Label"),
    totalReports: 3,
    affectedPeople: 420,
    approved: 1,
    waiting: 1,
    rejected: 1,
    cancelled: 0,
    permits: 1,
    lastOccurredAt: "2026-11-08T04:30:00.000Z",
    ...overrides,
  };
}

describe("formatMonthKey", () => {
  it("mengubah kunci bulan menjadi label bahasa Indonesia", () => {
    expect(formatMonthKey("2026-11")).toBe("November 2026");
  });

  it("mengembalikan kunci apa adanya bila formatnya tidak dikenal", () => {
    expect(formatMonthKey("2026/11")).toBe("2026/11");
  });
});

describe("formatCsvCell", () => {
  it("membungkus koma dan tanda kutip dengan benar", () => {
    expect(formatCsvCell('Posko "Balai", Kota')).toBe('"Posko ""Balai"", Kota"');
  });

  it("mengosongkan nilai kosong", () => {
    expect(formatCsvCell(null)).toBe("");
    expect(formatCsvCell(undefined)).toBe("");
  });

  it("menulis angka apa adanya", () => {
    expect(formatCsvCell(420)).toBe("420");
  });
});

describe("buildRecapCsv", () => {
  it("memuat judul kolom, BOM, dan satu baris per kelompok", () => {
    const csv = buildRecapCsv([
      row({ label: "Wonokromo" }),
      row({ label: "Banjir", totalReports: 2 }),
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Kelompok,Jumlah laporan,Jiwa terdampak");
    expect(csv).toContain("Wonokromo,3,420,1,1,1,0,1");
    expect(csv).toContain("Banjir,2,420,1,1,1,0,1");
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(3);
  });

  it("memakai CRLF agar rapi saat dibuka di Excel", () => {
    expect(buildRecapCsv([row()])).toContain("\r\n");
  });
});
