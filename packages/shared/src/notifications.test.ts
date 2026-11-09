import { describe, expect, it } from "vitest";
import { INCIDENT_STATUSES } from "./domain";
import {
  buildCorrectionNotification,
  buildStatusNotification,
  NOTIFICATION_KIND_LABEL,
  NOTIFICATION_KINDS,
  notificationReadSchema,
} from "./notifications";

const forbiddenWords = [
  "payload",
  "webhook",
  "exception",
  "null",
  "undefined",
  "http",
  "sql",
  "json",
  "endpoint",
];

describe("notifikasi status", () => {
  it("membuat pesan manusia untuk setiap status laporan", () => {
    for (const status of INCIDENT_STATUSES) {
      const draft = buildStatusNotification({
        code: "SIA-7K2Q9",
        title: "Banjir di Wonokromo",
        toStatus: status,
      });

      expect(draft.title.trim().length).toBeGreaterThan(0);
      expect(draft.body).toContain("SIA-7K2Q9");
      expect(draft.body).toContain("Banjir di Wonokromo");
      expect(draft.kind in NOTIFICATION_KIND_LABEL).toBe(true);

      const lower = `${draft.title} ${draft.body}`.toLowerCase();
      for (const word of forbiddenWords) {
        expect(lower).not.toContain(word);
      }
    }
  });

  it("menyertakan nomor izin saat laporan disetujui", () => {
    const draft = buildStatusNotification({
      code: "SIA-7K2Q9",
      title: "Banjir di Wonokromo",
      toStatus: "DISETUJUI",
      permitNumber: "IZN-20261109-001",
    });

    expect(draft.kind).toBe("IZIN");
    expect(draft.body).toContain("IZN-20261109-001");
  });

  it("menyertakan alasan penolakan dan pembatalan", () => {
    const rejected = buildStatusNotification({
      code: "SIA-7K2Q9",
      title: "Banjir di Wonokromo",
      toStatus: "DITOLAK",
      reason: "Lokasi belum bisa dipastikan.",
    });
    const canceled = buildStatusNotification({
      code: "SIA-7K2Q9",
      title: "Banjir di Wonokromo",
      toStatus: "DIBATALKAN",
      reason: "Laporan dobel.",
    });

    expect(rejected.body).toContain("Lokasi belum bisa dipastikan.");
    expect(canceled.body).toContain("Laporan dobel.");
  });

  it("membuat pesan koreksi dengan nomor izin lama dan baru", () => {
    const draft = buildCorrectionNotification({
      code: "SIA-7K2Q9",
      title: "Banjir di Wonokromo",
      previousPermitNumber: "IZN-20261109-001",
      newPermitNumber: "IZN-20261109-002",
      reason: "Kebutuhan air berkurang.",
    });

    expect(draft.kind).toBe("IZIN");
    expect(draft.body).toContain("IZN-20261109-001");
    expect(draft.body).toContain("IZN-20261109-002");
    expect(draft.body).toContain("Kebutuhan air berkurang.");
  });
});

describe("skema baca notifikasi", () => {
  it("menerima pilihan semua atau daftar id", () => {
    expect(notificationReadSchema.safeParse({ all: true }).success).toBe(true);
    expect(notificationReadSchema.safeParse({ ids: ["notif_1", "notif_2"] }).success).toBe(true);
  });

  it("menolak pilihan kosong dan daftar lebih dari 100", () => {
    expect(notificationReadSchema.safeParse({}).success).toBe(false);
    expect(notificationReadSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(
      notificationReadSchema.safeParse({
        ids: Array.from({ length: 101 }, (_, index) => `notif_${index}`),
      }).success,
    ).toBe(false);
  });
});

describe("label jenis notifikasi", () => {
  it("mencakup semua jenis yang dikenal", () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(NOTIFICATION_KIND_LABEL[kind].length).toBeGreaterThan(0);
    }
  });
});
