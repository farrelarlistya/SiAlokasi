import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import type { Response as InjectResponse } from "light-my-request";
import { DEMO_PASSWORD } from "@sialokasi/shared";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedDatabase } from "../prisma/seed";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app");
const { SESSION_COOKIE } = await import("../src/lib/auth");

const prisma = new PrismaClient();
const app = await buildApp();

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

const passes: string[] = [];
const failures: string[] = [];

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    passes.push(label);
    console.log(`  OK    ${label}${detail ? ` (${detail})` : ""}`);
  } else {
    failures.push(label);
    console.error(`  GAGAL ${label}${detail ? ` (${detail})` : ""}`);
  }
}

function cookieFrom(response: { cookies: { name: string; value: string }[] }): string {
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE);
  return cookie ? `${SESSION_COOKIE}=${cookie.value}` : "";
}

async function login(email: string): Promise<{ cookie: string; statusCode: number }> {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password: DEMO_PASSWORD },
  });

  return { cookie: cookieFrom(response), statusCode: response.statusCode };
}

async function get(url: string, cookie?: string): Promise<InjectResponse> {
  return app.inject({
    method: "GET",
    url,
    headers: cookie ? { cookie } : undefined,
  });
}

async function post(
  url: string,
  cookie: string | undefined,
  payload: object = {},
): Promise<InjectResponse> {
  return app.inject({
    method: "POST",
    url,
    headers: cookie ? { cookie } : undefined,
    payload,
  });
}

type NotificationApi = {
  notifications: {
    id: string;
    kind: string;
    title: string;
    body: string;
    incidentId: string | null;
    incidentCode: string | null;
    permitId: string | null;
    permitNumber: string | null;
    readAt: string | null;
    createdAt: string;
  }[];
  unreadCount: number;
  total: number;
  note: string;
};

type IncidentBody = {
  data: {
    id: string;
    code: string;
    status: string;
    permit: {
      id: string;
      number: string;
      items: { aidItemId: string; name: string; qty: number }[];
    } | null;
  };
  message?: string;
};

async function notifications(cookie: string, query = "?limit=100"): Promise<NotificationApi> {
  const response = await get(`/api/notifications${query}`, cookie);
  if (response.statusCode !== 200) {
    throw new Error(`Gagal membaca notifikasi: ${response.statusCode} ${response.body}`);
  }
  return response.json() as NotificationApi;
}

async function notificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId } });
}

async function userId(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  return user.id;
}

async function readText(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), "utf8");
}

const draftBase = {
  title: "Laporan uji notifikasi M5",
  disasterType: "BANJIR",
  occurredAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  lat: -7.3002,
  lng: 112.7382,
  radiusM: 900,
  regionId: "region_wonokromo",
};

const validFactors = {
  affectedPeople: 120,
  damageLevel: "SEDANG",
  vulnerableBabies: 4,
  vulnerableElderly: 8,
  vulnerablePregnant: 2,
  vulnerableDisabled: 2,
  roadAccess: "TERBATAS",
  weather: "HUJAN",
  density: "SEDANG",
};

async function main(): Promise<void> {
  console.log("Pemeriksaan M5 — Uji Lintas Perangkat & Siap Pamer\n");
  await seedDatabase(prisma);

  const petugas = await login("petugas@sialokasi.demo");
  const pimpinan = await login("pimpinan@sialokasi.demo");
  const admin = await login("admin@sialokasi.demo");
  const petugasId = await userId("petugas@sialokasi.demo");
  const pimpinanId = await userId("pimpinan@sialokasi.demo");

  console.log("[1] Hak akses dan kondisi awal notifikasi");
  check("petugas bisa masuk", petugas.statusCode === 200);
  check("pimpinan bisa masuk", pimpinan.statusCode === 200);
  check("admin bisa masuk", admin.statusCode === 200);
  check(
    "tanpa sesi ditolak 401 dari notifikasi",
    (await get("/api/notifications")).statusCode === 401,
  );
  const initialPetugas = await notifications(petugas.cookie);
  const initialPimpinan = await notifications(pimpinan.cookie);
  check(
    "seed bersih menghasilkan 0 notifikasi",
    initialPetugas.total === 0 && initialPimpinan.total === 0,
  );
  check(
    "semua peran bisa membuka lonceng notifikasi",
    (await get("/api/notifications", admin.cookie)).statusCode === 200,
  );
  check(
    "permintaan tandai baca tanpa pilihan ditolak 400",
    (await post("/api/notifications/read", petugas.cookie, {})).statusCode === 400,
  );

  console.log("\n[2] Setiap perubahan status menambah notifikasi");
  const beforeCreate = await notificationCount(petugasId);
  const created = await post("/api/petugas/incidents", petugas.cookie, draftBase);
  check("petugas bisa membuat laporan", created.statusCode === 201);
  const createdBody = created.json() as IncidentBody;
  const incidentId = createdBody.data.id;
  const incidentCode = createdBody.data.code;
  check(
    "status BARU menambah satu notifikasi pelapor",
    (await notificationCount(petugasId)) === beforeCreate + 1,
  );
  const afterCreate = await notifications(petugas.cookie);
  check(
    "notifikasi laporan baru memakai bahasa manusia",
    afterCreate.notifications[0]?.title === "Laporan tersimpan" &&
      afterCreate.notifications[0]?.body.includes(incidentCode) === true,
  );

  const beforeEstimate = await notificationCount(petugasId);
  const estimated = await post(
    `/api/petugas/incidents/${incidentId}/factors`,
    petugas.cookie,
    validFactors,
  );
  check("estimasi berhasil dihitung", estimated.statusCode === 200);
  check(
    "status DIPERIKSA menambah satu notifikasi pelapor",
    (await notificationCount(petugasId)) === beforeEstimate + 1,
  );

  const beforeSubmit = await notificationCount(petugasId);
  const beforePimpinan = await notificationCount(pimpinanId);
  const submitted = await post(`/api/petugas/incidents/${incidentId}/submit`, petugas.cookie);
  check("laporan berhasil diajukan", submitted.statusCode === 200);
  check(
    "status MENUNGGU menambah notifikasi pelapor dan pimpinan",
    (await notificationCount(petugasId)) === beforeSubmit + 1 &&
      (await notificationCount(pimpinanId)) === beforePimpinan + 1,
  );
  const pimpinanInbox = await notifications(pimpinan.cookie);
  check(
    "pimpinan menerima notifikasi antrian keputusan",
    pimpinanInbox.notifications[0]?.title === "Laporan menunggu keputusan" &&
      pimpinanInbox.notifications[0]?.incidentId === incidentId,
  );

  const beforeApprove = await notificationCount(petugasId);
  const approved = await post(`/api/pimpinan/incidents/${incidentId}/decision`, pimpinan.cookie, {
    decision: "APPROVE",
    poskoId: "posko_balai_kota",
    reason: "Stok posko mencukupi.",
  });
  check("laporan berhasil disetujui", approved.statusCode === 200);
  const approvedBody = approved.json() as IncidentBody;
  check(
    "status DISETUJUI menambah notifikasi pelapor",
    (await notificationCount(petugasId)) === beforeApprove + 1,
  );
  const afterApprove = await notifications(petugas.cookie);
  check(
    "notifikasi persetujuan memuat nomor izin",
    afterApprove.notifications[0]?.title === "Izin distribusi terbit" &&
      afterApprove.notifications[0]?.body.includes(approvedBody.data.permit?.number ?? "?") === true &&
      afterApprove.notifications[0]?.permitId === approvedBody.data.permit?.id,
  );

  const beforeComplete = await notificationCount(petugasId);
  const completed = await post(`/api/pimpinan/incidents/${incidentId}/complete`, pimpinan.cookie);
  check("distribusi bisa ditandai selesai", completed.statusCode === 200);
  check(
    "status SELESAI menambah notifikasi pelapor",
    (await notificationCount(petugasId)) === beforeComplete + 1,
  );

  const detailResponse = await get(`/api/pimpinan/incidents/${incidentId}`, pimpinan.cookie);
  const detail = detailResponse.json() as IncidentBody;
  const permit = detail.data.permit;
  if (!permit) throw new Error("Izin hasil persetujuan tidak ditemukan untuk uji koreksi.");
  const correctionItems = permit.items.map((item) => ({ aidItemId: item.aidItemId, qty: item.qty }));
  const changedItem = correctionItems.find((item) => item.qty > 1);
  if (!changedItem) throw new Error("Tidak ada jumlah bantuan yang bisa dikoreksi pada uji M5.");
  changedItem.qty -= 1;

  const beforeCorrection = await notificationCount(petugasId);
  const corrected = await post(
    `/api/pimpinan/incidents/${incidentId}/corrections`,
    pimpinan.cookie,
    {
      poskoId: "posko_balai_kota",
      reason: "Hasil pendataan ulang M5: satu jenis bantuan dikurangi.",
      items: correctionItems,
    },
  );
  check("koreksi izin berhasil disimpan", corrected.statusCode === 200);
  const correctedBody = corrected.json() as IncidentBody;
  const afterCorrection = await notifications(petugas.cookie);
  check(
    "koreksi menambah notifikasi pelapor",
    (await notificationCount(petugasId)) === beforeCorrection + 1,
  );
  check(
    "notifikasi koreksi memuat nomor izin lama dan baru",
    afterCorrection.notifications[0]?.title === "Izin distribusi dikoreksi" &&
      afterCorrection.notifications[0]?.body.includes(permit.number) === true &&
      afterCorrection.notifications[0]?.body.includes(correctedBody.data.permit?.number ?? "?") ===
        true,
  );

  console.log("\n[3] Tandai dibaca dan isolasi antar-pengguna");
  const inbox = await notifications(petugas.cookie);
  check("pelapor memiliki lebih dari satu notifikasi", inbox.total >= 6, `${inbox.total} baris`);
  check("semua notifikasi baru masih belum dibaca", inbox.unreadCount === inbox.total);

  const firstId = inbox.notifications[0]?.id;
  if (!firstId) throw new Error("Notifikasi pertama tidak ditemukan.");
  const markedOne = await post("/api/notifications/read", petugas.cookie, { ids: [firstId] });
  check("satu notifikasi bisa ditandai dibaca", markedOne.statusCode === 200);
  const afterOne = await notifications(petugas.cookie);
  check("jumlah belum dibaca berkurang satu", afterOne.unreadCount === inbox.unreadCount - 1);

  const pimpinanInboxBefore = await notifications(pimpinan.cookie);
  const foreignId = pimpinanInboxBefore.notifications[0]?.id;
  if (!foreignId) throw new Error("Notifikasi pimpinan tidak ditemukan untuk uji isolasi.");
  const crossUser = await post("/api/notifications/read", petugas.cookie, { ids: [foreignId] });
  check("notifikasi milik pengguna lain tidak bisa ditandai", crossUser.statusCode === 200);
  check(
    "isolasi antar-pengguna terjaga",
    (crossUser.json() as { updated: number }).updated === 0 &&
      (await notifications(pimpinan.cookie)).unreadCount === pimpinanInboxBefore.unreadCount,
  );

  const markedAll = await post("/api/notifications/read", petugas.cookie, { all: true });
  check("semua notifikasi bisa ditandai dibaca", markedAll.statusCode === 200);
  const afterAll = await notifications(petugas.cookie);
  check("tidak ada notifikasi tersisa yang belum dibaca", afterAll.unreadCount === 0);

  const forbidden = ["payload", "webhook", "exception", "undefined", "http", "sql"];
  const allText = [
    ...afterAll.notifications.map((item) => `${item.title} ${item.body}`),
    ...pimpinanInboxBefore.notifications.map((item) => `${item.title} ${item.body}`),
  ]
    .join(" ")
    .toLowerCase();
  check(
    "pesan notifikasi bebas istilah mesin",
    forbidden.every((word) => !allText.includes(word)),
  );

  console.log("\n[4] Reset demo dan kelengkapan berkas M5");
  const reset = await post("/api/dev/reset", admin.cookie);
  check("admin bisa mereset demo", reset.statusCode === 200);
  const resetBody = reset.json() as { result: { notifications: number; incidents: number } };
  check(
    "reset mengembalikan 0 laporan dan 0 notifikasi",
    resetBody.result.incidents === 0 && resetBody.result.notifications === 0,
  );
  check(
    "database menyimpan 0 notifikasi setelah reset",
    (await prisma.notification.count()) === 0,
  );

  const shareScript = await readText("scripts/share.mjs");
  const packageJson = await readText("package.json");
  const viteConfig = await readText("apps/web/vite.config.ts");
  const themeCss = await readText("apps/web/src/styles/theme.css");
  const permitPage = await readText("apps/web/src/pages/pimpinan/PermitPage.tsx");
  const readme = await readText("README.md");
  const demoGuide = await readText("docs/panduan-demo.md");

  check("skrip npm run share tersedia", shareScript.includes("localtunnel") && packageJson.includes('"share"'));
  check("host tunnel diizinkan Vite", viteConfig.includes(".loca.lt"));
  check(
    "cetak A4 memakai ukuran kertas dan menyembunyikan menu",
    themeCss.includes("size: A4") &&
      themeCss.includes(".app-header") &&
      themeCss.includes(".print-document"),
  );
  check(
    "dokumen izin memuat catatan izin pengganti",
    permitPage.includes("Menggantikan izin"),
  );
  check(
    "README dan panduan demo 5 menit tersedia",
    readme.includes("npm run share") &&
      readme.includes("panduan-demo.md") &&
      demoGuide.includes("5 menit"),
  );

  console.log("\nRingkasan");
  console.log(`  ${passes.length} pemeriksaan lulus, ${failures.length} gagal`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error("\nPemeriksaan M5 gagal dijalankan.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await app.close();
  await prisma.$disconnect();
}
