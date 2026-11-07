import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  isEditable,
  isTerminal,
  publicTimelineIndex,
  TransitionError,
} from "./status";

describe("alur status laporan", () => {
  it("mengizinkan alur bahagia dari BARU sampai SELESAI", () => {
    expect(canTransition("BARU", "DIPERIKSA")).toBe(true);
    expect(canTransition("DIPERIKSA", "MENUNGGU_PERSETUJUAN")).toBe(true);
    expect(canTransition("MENUNGGU_PERSETUJUAN", "DISETUJUI")).toBe(true);
    expect(canTransition("DISETUJUI", "SELESAI")).toBe(true);
  });

  it("menolak lompatan status", () => {
    expect(canTransition("BARU", "DISETUJUI")).toBe(false);
    expect(canTransition("DIPERIKSA", "SELESAI")).toBe(false);
  });

  it("mengizinkan penolakan dan pembatalan pada waktunya", () => {
    expect(canTransition("MENUNGGU_PERSETUJUAN", "DITOLAK")).toBe(true);
    expect(canTransition("BARU", "DIBATALKAN")).toBe(true);
    expect(canTransition("DISETUJUI", "DIBATALKAN")).toBe(false);
  });

  it("menandai status akhir", () => {
    expect(isTerminal("SELESAI")).toBe(true);
    expect(isTerminal("DITOLAK")).toBe(true);
    expect(isTerminal("DIBATALKAN")).toBe(true);
    expect(isTerminal("MENUNGGU_PERSETUJUAN")).toBe(false);
  });

  it("hanya mengizinkan penyuntingan saat BARU", () => {
    expect(isEditable("BARU")).toBe(true);
    expect(isEditable("MENUNGGU_PERSETUJUAN")).toBe(false);
  });

  it("melempar TransitionError untuk perpindahan terlarang", () => {
    expect(() => assertTransition("BARU", "SELESAI")).toThrow(TransitionError);
  });
});

describe("timeline publik", () => {
  it("memetakan status ke langkah timeline", () => {
    expect(publicTimelineIndex("BARU")).toBe(0);
    expect(publicTimelineIndex("DISETUJUI")).toBe(3);
    expect(publicTimelineIndex("SELESAI")).toBe(4);
  });
});
