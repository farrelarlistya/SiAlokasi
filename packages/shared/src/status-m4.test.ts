import { describe, expect, it } from "vitest";
import {
  canCancelByPetugas,
  canCancelByPimpinan,
  canCorrectPermit,
} from "./status";

describe("aturan kasus khusus M4", () => {
  it("petugas hanya bisa membatalkan laporan sebelum diajukan", () => {
    expect(canCancelByPetugas("BARU")).toBe(true);
    expect(canCancelByPetugas("DIPERIKSA")).toBe(true);
    expect(canCancelByPetugas("MENUNGGU_PERSETUJUAN")).toBe(false);
    expect(canCancelByPetugas("DISETUJUI")).toBe(false);
  });

  it("pimpinan hanya bisa membatalkan laporan yang menunggu keputusan", () => {
    expect(canCancelByPimpinan("MENUNGGU_PERSETUJUAN")).toBe(true);
    expect(canCancelByPimpinan("DIPERIKSA")).toBe(false);
    expect(canCancelByPimpinan("SELESAI")).toBe(false);
  });

  it("koreksi izin hanya untuk laporan yang sudah disetujui atau selesai", () => {
    expect(canCorrectPermit("DISETUJUI")).toBe(true);
    expect(canCorrectPermit("SELESAI")).toBe(true);
    expect(canCorrectPermit("MENUNGGU_PERSETUJUAN")).toBe(false);
    expect(canCorrectPermit("DITOLAK")).toBe(false);
  });
});
