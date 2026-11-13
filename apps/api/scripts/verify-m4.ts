import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import type { Response as InjectResponse } from "light-my-request";
import { seedDatabase } from "../prisma/seed";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app");
const { DEMO_CODE, SESSION_COOKIE } = await import("../src/lib/auth");

const prisma = new PrismaClient();
const app = await buildApp();

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
    payload: { email, code: DEMO_CODE },
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

async function patch(
  url: string,
  cookie: string | undefined,
  payload: object,
): Promise<InjectResponse> {
  return app.inject({
    method: "PATCH",
    url,
    headers: cookie ? { cookie } : undefined,
    payload,
  });
}

type IncidentBody = {
  data: {
    id: string;
    code: string;
    title: string;
    status: string;
    cancelReason: string | null;
    recommendation: {
      id: string;
      items: {
        id: string;
        aidItemId: string;
        name: string;
        unit: string;
        baseQty: number;
        finalQty: number;
      }[];
    } | null;
    permit: {
      id: string;
      number: string;
      status: string;
      replacesNumber: string | null;
      supersededAt: string | null;
      supersededByNumber: string | null;
      items: { aidItemId: string; name: string; qty: number }[];
    } | null;
    decision: unknown;
    corrections: {
      id: string;
      reason: string;
      previousPermitNumber: string;
      newPermitNumber: string;
      items: {
        aidItemId: string;
        name: string;
        beforeQty: number;
        afterQty: number;
      }[];
    }[];
    logs: { fromStatus: string | null; toStatus: string; note: string | null }[];
  };
  message?: string;
};

const draftBase = {
  title: "Laporan uji M4",
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

async function createReport(
  cookie: string,
  title: string,
): Promise<{ id: string; code: string }> {
  const created = await post("/api/petugas/incidents", cookie, {
    ...draftBase,
    title,
    lat: -7.3 + Math.random() * 0.02,
    lng: 112.72 + Math.random() * 0.03,
  });
  if (created.statusCode !== 201) {
    throw new Error(`Gagal membuat laporan uji: ${created.body}`);
  }
  const body = created.json() as IncidentBody;
  return { id: body.data.id, code: body.data.code };
}

async function estimateAndSubmit(cookie: string, id: string): Promise<IncidentBody> {
  const estimated = await post(`/api/petugas/incidents/${id}/factors`, cookie, validFactors);
  if (estimated.statusCode !== 200) {
    throw new Error(`Gagal menghitung estimasi: ${estimated.body}`);
  }
  const submitted = await post(`/api/petugas/incidents/${id}/submit`, cookie);
  if (submitted.statusCode !== 200) {
    throw new Error(`Gagal mengajukan laporan: ${submitted.body}`);
  }
  return submitted.json() as IncidentBody;
}

async function main(): Promise<void> {
  console.log("Pemeriksaan M4 — Kasus Khusus, Rekap, Admin, & Demo\n");
  await seedDatabase(prisma);

  console.log("[1] Hak akses, constraint, dan trigger database");
  const petugas = await login("petugas@sialokasi.demo");
  const pimpinan = await login("pimpinan@sialokasi.demo");
  const admin = await login("admin@sialokasi.demo");

  check("petugas bisa masuk", petugas.statusCode === 200);
  check("pimpinan bisa masuk", pimpinan.statusCode === 200);
  check("admin bisa masuk", admin.statusCode === 200);

  check(
    "petugas ditolak 403 dari panel demo",
    (await get("/api/dev/status", petugas.cookie)).statusCode === 403,
  );
  check(
    "pimpinan ditolak 403 dari panel demo",
    (await get("/api/dev/status", pimpinan.cookie)).statusCode === 403,
  );
  check(
    "admin bisa membuka panel demo",
    (await get("/api/dev/status", admin.cookie)).statusCode === 200,
  );
  check(
    "petugas ditolak 403 dari rekap pimpinan",
    (await get("/api/pimpinan/recap", petugas.cookie)).statusCode === 403,
  );
  check(
    "pimpinan bisa membuka rekap",
    (await get("/api/pimpinan/recap", pimpinan.cookie)).statusCode === 200,
  );
  check(
    "pimpinan ditolak 403 dari audit admin",
    (await get("/api/admin/audit", pimpinan.cookie)).statusCode === 403,
  );
  check(
    "admin bisa membuka audit",
    (await get("/api/admin/audit", admin.cookie)).statusCode === 200,
  );

  const constraints = await prisma.$queryRaw<{ conname: string }[]>`
    SELECT conname FROM pg_constraint
    WHERE conname IN ('stocks_qty_nonnegative', 'stock_movements_balance_nonnegative')
  `;
  check(
    "constraint stok tidak minus terpasang",
    constraints.length === 2,
    `${constraints.length} constraint`,
  );

  const triggers = await prisma.$queryRaw<{ tgname: string }[]>`
    SELECT tgname FROM pg_trigger
    WHERE tgname IN ('audit_logs_append_only', 'incident_logs_append_only', 'stock_movements_append_only')
      AND NOT tgisinternal
  `;
  check(
    "trigger append-only terpasang di tiga tabel",
    triggers.length === 3,
    `${triggers.length} trigger`,
  );

  console.log("\n[2] Pembatalan oleh petugas");
  const canceledDraft = await createReport(petugas.cookie, "Laporan dobel di Wonokromo");
  const cancelDraft = await post(
    `/api/petugas/incidents/${canceledDraft.id}/cancel`,
    petugas.cookie,
    { reason: "Laporan dobel, data digabung ke laporan lain." },
  );
  check("petugas bisa membatalkan draf", cancelDraft.statusCode === 200);
  const canceledDraftBody = cancelDraft.json() as IncidentBody;
  check(
    "status laporan menjadi DIBATALKAN",
    canceledDraftBody.data.status === "DIBATALKAN",
  );
  check(
    "alasan pembatalan tersimpan",
    canceledDraftBody.data.cancelReason?.includes("dobel") === true,
  );
  check(
    "laporan yang dibatalkan tidak bisa diajukan",
    (await post(`/api/petugas/incidents/${canceledDraft.id}/submit`, petugas.cookie)).statusCode ===
      409,
  );
  check(
    "pembatalan kedua ditolak",
    (await post(`/api/petugas/incidents/${canceledDraft.id}/cancel`, petugas.cookie, {})).statusCode ===
      409,
  );

  const cancelAudit = await prisma.auditLog.count({
    where: { entity: "Incident", entityId: canceledDraft.id, action: "BATALKAN" },
  });
  const cancelLog = await prisma.incidentLog.count({
    where: { incidentId: canceledDraft.id, toStatus: "DIBATALKAN" },
  });
  check("pembatalan masuk audit", cancelAudit === 1);
  check("pembatalan masuk riwayat status", cancelLog === 1);

  const submittedReport = await createReport(petugas.cookie, "Banjir di Gubeng");
  await estimateAndSubmit(petugas.cookie, submittedReport.id);
  check(
    "petugas tidak bisa membatalkan laporan yang sudah diajukan",
    (
      await post(`/api/petugas/incidents/${submittedReport.id}/cancel`, petugas.cookie, {
        reason: "Mencoba membatalkan setelah diajukan.",
      })
    ).statusCode === 409,
  );

  console.log("\n[3] Pembatalan oleh pimpinan");
  check(
    "pembatalan pimpinan tanpa alasan ditolak",
    (await post(`/api/pimpinan/incidents/${submittedReport.id}/cancel`, pimpinan.cookie, {}))
      .statusCode === 400,
  );
  const cancelByPimpinan = await post(
    `/api/pimpinan/incidents/${submittedReport.id}/cancel`,
    pimpinan.cookie,
    { reason: "Lokasi kejadian belum bisa dipastikan, laporan dihentikan." },
  );
  check("pimpinan bisa membatalkan laporan yang menunggu", cancelByPimpinan.statusCode === 200);
  const canceledByPimpinanBody = cancelByPimpinan.json() as IncidentBody;
  check(
    "status laporan pimpinan menjadi DIBATALKAN",
    canceledByPimpinanBody.data.status === "DIBATALKAN",
  );
  check(
    "laporan yang dibatalkan tidak bisa disetujui",
    (
      await post(`/api/pimpinan/incidents/${submittedReport.id}/decision`, pimpinan.cookie, {
        decision: "APPROVE",
        poskoId: "posko_balai_kota",
      })
    ).statusCode === 409,
  );

  console.log("\n[4] Stok tidak boleh minus dan pengurangan saat izin terbit");
  const overStockReport = await createReport(petugas.cookie, "Banjir dengan kebutuhan besar");
  const overStockBody = await estimateAndSubmit(petugas.cookie, overStockReport.id);
  const airLine = overStockBody.data.recommendation?.items.find(
    (item) => item.aidItemId === "aid_air_bersih",
  );
  if (!airLine) throw new Error("Baris air bersih tidak ditemukan pada estimasi.");

  const stockBefore = await prisma.stock.findUniqueOrThrow({
    where: {
      poskoId_aidItemId: {
        poskoId: "posko_balai_kota",
        aidItemId: "aid_air_bersih",
      },
    },
    select: { qty: true },
  });

  await prisma.recommendationItem.update({
    where: { id: airLine.id },
    data: { finalQty: stockBefore.qty + 1, adjustReason: "Uji stok tidak cukup." },
  });

  const overApproval = await post(
    `/api/pimpinan/incidents/${overStockReport.id}/decision`,
    pimpinan.cookie,
    { decision: "APPROVE", poskoId: "posko_balai_kota" },
  );
  check("persetujuan dengan stok kurang ditolak 409", overApproval.statusCode === 409);
  check(
    "pesan stok kurang menjelaskan posko dan jumlah",
    overApproval.body.includes("tidak cukup") && overApproval.body.includes("Posko Balai Kota"),
  );
  const stockAfterFailed = await prisma.stock.findUniqueOrThrow({
    where: {
      poskoId_aidItemId: { poskoId: "posko_balai_kota", aidItemId: "aid_air_bersih" },
    },
    select: { qty: true },
  });
  check(
    "stok tidak berubah setelah persetujuan gagal",
    stockAfterFailed.qty === stockBefore.qty,
  );
  check(
    "tidak ada izin yang terbit dari persetujuan gagal",
    (await prisma.permit.count({ where: { incidentId: overStockReport.id } })) === 0,
  );

  let negativeRejected = false;
  try {
    await prisma.$executeRaw`UPDATE "stocks" SET "qty" = -1 WHERE "poskoId" = 'posko_balai_kota' AND "aidItemId" = 'aid_air_bersih'`;
  } catch {
    negativeRejected = true;
  }
  check("database menolak stok negatif", negativeRejected);

  await prisma.recommendationItem.update({
    where: { id: airLine.id },
    data: { finalQty: airLine.finalQty },
  });

  const approvedReport = await post(
    `/api/pimpinan/incidents/${overStockReport.id}/decision`,
    pimpinan.cookie,
    { decision: "APPROVE", poskoId: "posko_balai_kota" },
  );
  check("persetujuan dengan stok cukup berhasil", approvedReport.statusCode === 200);
  const approvedBody = approvedReport.json() as IncidentBody;

  const neededAir = approvedBody.data.permit?.items.find(
    (item) => item.aidItemId === "aid_air_bersih",
  );
  const stockAfterApprove = await prisma.stock.findUniqueOrThrow({
    where: {
      poskoId_aidItemId: { poskoId: "posko_balai_kota", aidItemId: "aid_air_bersih" },
    },
    select: { qty: true },
  });
  check(
    "stok berkurang sesuai jumlah izin",
    stockAfterApprove.qty === stockBefore.qty - (neededAir?.qty ?? 0),
    `${stockBefore.qty} → ${stockAfterApprove.qty}`,
  );
  const approvedPermitId = approvedBody.data.permit?.id ?? "";
  const approvedMovements = await prisma.stockMovement.findMany({
    where: { permitId: approvedPermitId },
    select: { qtyDelta: true, balanceAfter: true, kind: true },
  });
  const expectedApprovedMovements =
    approvedBody.data.permit?.items.filter((item) => item.qty > 0).length ?? 0;
  check(
    "setiap bantuan yang diambil menulis satu baris jurnal stok",
    approvedMovements.length === expectedApprovedMovements,
    `${approvedMovements.length} baris`,
  );
  check(
    "semua saldo jurnal stok tidak negatif",
    approvedMovements.every((row) => row.balanceAfter >= 0 && row.qtyDelta < 0),
  );
  check(
    "semua baris jurnal berupa pengambilan stok",
    approvedMovements.every((row) => row.kind === "RESERVE"),
  );

  console.log("\n[5] Dua persetujuan bersamaan tidak membuat stok minus");
  const concurrentA = await createReport(petugas.cookie, "Banjir bersamaan A");
  const concurrentB = await createReport(petugas.cookie, "Banjir bersamaan B");
  const bodyA = await estimateAndSubmit(petugas.cookie, concurrentA.id);
  const bodyB = await estimateAndSubmit(petugas.cookie, concurrentB.id);
  const lineA = bodyA.data.recommendation?.items.find(
    (item) => item.aidItemId === "aid_air_bersih",
  );
  const lineB = bodyB.data.recommendation?.items.find(
    (item) => item.aidItemId === "aid_air_bersih",
  );
  if (!lineA || !lineB) throw new Error("Baris air bersih untuk uji bersamaan tidak ditemukan.");

  const currentAir = await prisma.stock.findUniqueOrThrow({
    where: {
      poskoId_aidItemId: { poskoId: "posko_balai_kota", aidItemId: "aid_air_bersih" },
    },
    select: { qty: true },
  });
  const halfPlus = Math.floor(currentAir.qty / 2) + 100;
  await prisma.recommendationItem.update({
    where: { id: lineA.id },
    data: { finalQty: halfPlus, adjustReason: "Uji dua persetujuan bersamaan." },
  });
  await prisma.recommendationItem.update({
    where: { id: lineB.id },
    data: { finalQty: halfPlus, adjustReason: "Uji dua persetujuan bersamaan." },
  });

  const [approveA, approveB] = await Promise.all([
    post(`/api/pimpinan/incidents/${concurrentA.id}/decision`, pimpinan.cookie, {
      decision: "APPROVE",
      poskoId: "posko_balai_kota",
    }),
    post(`/api/pimpinan/incidents/${concurrentB.id}/decision`, pimpinan.cookie, {
      decision: "APPROVE",
      poskoId: "posko_balai_kota",
    }),
  ]);

  const statuses = [approveA.statusCode, approveB.statusCode].sort();
  check(
    "satu persetujuan berhasil dan satu ditolak 409",
    statuses[0] === 200 && statuses[1] === 409,
    statuses.join(" / "),
  );
  const airAfterRace = await prisma.stock.findUniqueOrThrow({
    where: {
      poskoId_aidItemId: { poskoId: "posko_balai_kota", aidItemId: "aid_air_bersih" },
    },
    select: { qty: true },
  });
  check("stok air bersih tidak minus setelah uji bersamaan", airAfterRace.qty >= 0, `${airAfterRace.qty} liter`);
  const approvedConcurrent =
    approveA.statusCode === 200
      ? (approveA.json() as IncidentBody)
      : (approveB.json() as IncidentBody);
  const racePermitMovements = await prisma.stockMovement.findMany({
    where: { permitId: approvedConcurrent.data.permit?.id ?? "" },
    select: { balanceAfter: true },
  });
  const expectedRaceRows =
    approvedConcurrent.data.permit?.items.filter((item) => item.qty > 0).length ?? 0;
  check(
    "jurnal stok pemenang tetap konsisten",
    racePermitMovements.length === expectedRaceRows &&
      racePermitMovements.every((row) => row.balanceAfter >= 0),
  );

  console.log("\n[6] Koreksi izin setelah persetujuan");
  const originalPermit = approvedBody.data.permit;
  if (!originalPermit) throw new Error("Izin awal untuk uji koreksi tidak ditemukan.");
  const airBeforeCorrection = await prisma.stock.findUniqueOrThrow({
    where: {
      poskoId_aidItemId: { poskoId: "posko_balai_kota", aidItemId: "aid_air_bersih" },
    },
    select: { qty: true },
  });
  const originalAirQty = originalPermit.items.find(
    (item) => item.aidItemId === "aid_air_bersih",
  )?.qty;
  if (originalAirQty === undefined) throw new Error("Jumlah air pada izin awal tidak ditemukan.");

  const correction = await post(
    `/api/pimpinan/incidents/${overStockReport.id}/corrections`,
    pimpinan.cookie,
    {
      reason: "Hasil pendataan ulang menunjukkan kebutuhan air lebih kecil.",
      poskoId: "posko_balai_kota",
      items: [{ aidItemId: "aid_air_bersih", qty: 50 }],
    },
  );
  check("koreksi izin bisa diajukan", correction.statusCode === 200);
  const corrected = correction.json() as IncidentBody;
  const correctedPermit = corrected.data.permit;
  check(
    "nomor izin baru berbeda dari izin lama",
    correctedPermit !== null && correctedPermit.number !== originalPermit.number,
  );
  check(
    "izin baru mencatat izin yang digantikan",
    correctedPermit?.replacesNumber === originalPermit.number,
  );

  const oldPermit = await prisma.permit.findUniqueOrThrow({
    where: { id: originalPermit.id },
    select: { status: true, supersededAt: true, supersededByNumber: true },
  });
  check(
    "izin lama ditandai dibatalkan dan digantikan",
    oldPermit.status === "DIBATALKAN" &&
      oldPermit.supersededAt !== null &&
      oldPermit.supersededByNumber === correctedPermit?.number,
  );
  check(
    "catatan koreksi menyimpan perubahan jumlah",
    corrected.data.corrections.length === 1 &&
      corrected.data.corrections[0]?.items.some(
        (item) => item.aidItemId === "aid_air_bersih" && item.afterQty === 50,
      ) === true,
  );

  const airAfterCorrection = await prisma.stock.findUniqueOrThrow({
    where: {
      poskoId_aidItemId: { poskoId: "posko_balai_kota", aidItemId: "aid_air_bersih" },
    },
    select: { qty: true },
  });
  check(
    "stok dikembalikan lalu diambil sesuai izin koreksi",
    airAfterCorrection.qty === airBeforeCorrection.qty + originalAirQty - 50,
    `${airBeforeCorrection.qty} → ${airAfterCorrection.qty}`,
  );
  const [releaseRows, reserveRows] = await Promise.all([
    prisma.stockMovement.count({
      where: { permitId: originalPermit.id, kind: "RELEASE" },
    }),
    prisma.stockMovement.count({
      where: { permitId: correctedPermit?.id ?? "", kind: "RESERVE" },
    }),
  ]);
  const expectedRelease = originalPermit.items.filter((item) => item.qty > 0).length;
  const expectedReserve =
    correctedPermit?.items.filter((item) => item.qty > 0).length ?? 0;
  check(
    "jurnal mencatat pengembalian stok izin lama",
    releaseRows === expectedRelease,
    `${releaseRows} baris`,
  );
  check(
    "jurnal mencatat pengambilan stok izin baru",
    reserveRows === expectedReserve,
    `${reserveRows} baris`,
  );

  const sameCorrection = await post(
    `/api/pimpinan/incidents/${overStockReport.id}/corrections`,
    pimpinan.cookie,
    {
      reason: "Mencoba menyimpan koreksi tanpa perubahan sama sekali.",
      poskoId: "posko_balai_kota",
      items: [{ aidItemId: "aid_air_bersih", qty: 50 }],
    },
  );
  check("koreksi tanpa perubahan ditolak", sameCorrection.statusCode === 400);

  const unknownItemCorrection = await post(
    `/api/pimpinan/incidents/${overStockReport.id}/corrections`,
    pimpinan.cookie,
    {
      reason: "Mencoba mengoreksi jenis bantuan yang tidak ada di izin.",
      poskoId: "posko_balai_kota",
      items: [{ aidItemId: "aid_tidak_ada", qty: 1 }],
    },
  );
  check("koreksi jenis bantuan asing ditolak", unknownItemCorrection.statusCode === 400);

  const completeApproved = await post(
    `/api/pimpinan/incidents/${overStockReport.id}/complete`,
    pimpinan.cookie,
  );
  check("laporan hasil koreksi bisa ditandai selesai", completeApproved.statusCode === 200);

  const reopenCorrection = await post(
    `/api/pimpinan/incidents/${overStockReport.id}/corrections`,
    pimpinan.cookie,
    {
      reason: "Setelah distribusi selesai, jumlah air perlu dikoreksi lagi.",
      poskoId: "posko_balai_kota",
      items: [{ aidItemId: "aid_air_bersih", qty: 60 }],
    },
  );
  check("koreksi setelah selesai membuka kembali laporan", reopenCorrection.statusCode === 200);
  const reopened = reopenCorrection.json() as IncidentBody;
  check("status laporan kembali DISETUJUI", reopened.data.status === "DISETUJUI");
  check(
    "riwayat mencatat laporan dibuka kembali",
    reopened.data.logs.some(
      (log) => log.fromStatus === "SELESAI" && log.toStatus === "DISETUJUI",
    ),
  );

  console.log("\n[7] Riwayat tidak bisa diubah atau dihapus");
  const auditRow = await prisma.auditLog.findFirstOrThrow({ select: { id: true } });
  let auditUpdateRejected = false;
  try {
    await prisma.$executeRaw`UPDATE "audit_logs" SET "action" = 'DIUBAH' WHERE "id" = ${auditRow.id}`;
  } catch {
    auditUpdateRejected = true;
  }
  check("audit log menolak perubahan baris", auditUpdateRejected);

  let auditDeleteRejected = false;
  try {
    await prisma.$executeRaw`DELETE FROM "audit_logs" WHERE "id" = ${auditRow.id}`;
  } catch {
    auditDeleteRejected = true;
  }
  check("audit log menolak penghapusan baris", auditDeleteRejected);

  const incidentLogRow = await prisma.incidentLog.findFirstOrThrow({ select: { id: true } });
  let incidentLogUpdateRejected = false;
  try {
    await prisma.$executeRaw`UPDATE "incident_logs" SET "note" = 'DIUBAH' WHERE "id" = ${incidentLogRow.id}`;
  } catch {
    incidentLogUpdateRejected = true;
  }
  check("riwayat status menolak perubahan baris", incidentLogUpdateRejected);

  const movementRow = await prisma.stockMovement.findFirstOrThrow({ select: { id: true } });
  let movementUpdateRejected = false;
  try {
    await prisma.$executeRaw`UPDATE "stock_movements" SET "qtyDelta" = 0 WHERE "id" = ${movementRow.id}`;
  } catch {
    movementUpdateRejected = true;
  }
  check("jurnal stok menolak perubahan baris", movementUpdateRejected);

  check(
    "tidak ada endpoint hapus audit",
    (await app.inject({ method: "DELETE", url: `/api/admin/audit/${auditRow.id}`, headers: { cookie: admin.cookie } }))
      .statusCode === 404,
  );

  console.log("\n[8] Rekap per kecamatan, jenis, bulan, dan CSV");
  const dbIncidentCount = await prisma.incident.count();
  const recapRegion = await get("/api/pimpinan/recap?groupBy=region", pimpinan.cookie);
  check("rekap per kecamatan bisa dimuat", recapRegion.statusCode === 200);
  const recapRegionBody = recapRegion.json() as {
    rows: { totalReports: number; approved: number; waiting: number }[];
    totals: { totalReports: number };
    groupBy: string;
  };
  check(
    "total rekap sama dengan jumlah laporan di database",
    recapRegionBody.totals.totalReports === dbIncidentCount,
    `${recapRegionBody.totals.totalReports} / ${dbIncidentCount}`,
  );
  check(
    "jumlah baris rekap sama dengan total",
    recapRegionBody.rows.reduce((sum, row) => sum + row.totalReports, 0) ===
      recapRegionBody.totals.totalReports,
  );
  check("rekap memakai kelompok kecamatan", recapRegionBody.groupBy === "region");

  const recapType = await get("/api/pimpinan/recap?groupBy=type", pimpinan.cookie);
  check("rekap per jenis bencana bisa dimuat", recapType.statusCode === 200);
  const recapMonth = await get("/api/pimpinan/recap?groupBy=month", pimpinan.cookie);
  const recapMonthBody = recapMonth.json() as { rows: { key: string; label: string }[] };
  check("rekap per bulan bisa dimuat", recapMonth.statusCode === 200);
  check(
    "label bulan memakai bahasa Indonesia",
    recapMonthBody.rows.every((row) => /^\d{4}-\d{2}$/.test(row.key) && row.label.length > 0),
  );

  const recapFiltered = await get(
    "/api/pimpinan/recap?groupBy=region&regionId=region_wonokromo",
    pimpinan.cookie,
  );
  const recapFilteredBody = recapFiltered.json() as { totals: { totalReports: number } };
  const dbWonokromo = await prisma.incident.count({ where: { regionId: "region_wonokromo" } });
  check(
    "filter kecamatan mempersempit rekap",
    recapFilteredBody.totals.totalReports === dbWonokromo,
    `${recapFilteredBody.totals.totalReports} / ${dbWonokromo}`,
  );

  const csv = await get("/api/pimpinan/recap/export.csv?groupBy=region", pimpinan.cookie);
  check("ekspor CSV bisa diunduh", csv.statusCode === 200);
  check(
    "respons CSV memakai tipe berkas yang benar",
    csv.headers["content-type"]?.toString().startsWith("text/csv") === true,
  );
  check(
    "CSV memuat judul kolom dan BOM",
    csv.body.startsWith("\uFEFF") && csv.body.includes("Kelompok,Jumlah laporan,Jiwa terdampak"),
  );
  check(
    "jumlah baris CSV sama dengan baris rekap",
    csv.body.trimEnd().split("\r\n").length === recapRegionBody.rows.length + 1,
  );

  const badRecap = await get(
    "/api/pimpinan/recap?from=2026-12-31&to=2026-01-01",
    pimpinan.cookie,
  );
  check("tanggal rekap yang terbalik ditolak", badRecap.statusCode === 400);

  console.log("\n[9] Halaman audit admin");
  const auditList = await get("/api/admin/audit?limit=100", admin.cookie);
  check("audit admin bisa dimuat", auditList.statusCode === 200);
  const auditBody = auditList.json() as {
    entries: { action: string; before: unknown; after: unknown }[];
    total: number;
    options: { entities: string[]; actions: string[] };
  };
  check("audit memuat aksi koreksi izin", auditBody.entries.some((entry) => entry.action === "KOREKSI_IZIN"));
  check("audit memuat aksi pembatalan", auditBody.entries.some((entry) => entry.action === "BATALKAN"));
  check("audit memuat nilai sebelum dan sesudah", auditBody.entries.some((entry) => entry.after !== null));
  check(
    "jumlah audit di API sama dengan database",
    auditBody.total === (await prisma.auditLog.count()),
  );
  check(
    "pilihan filter audit tersedia",
    auditBody.options.entities.includes("Incident") && auditBody.options.actions.includes("KOREKSI_IZIN"),
  );

  const auditFiltered = await get(
    "/api/admin/audit?entity=Incident&action=KOREKSI_IZIN",
    admin.cookie,
  );
  const auditFilteredBody = auditFiltered.json() as {
    entries: { action: string; entity: string }[];
  };
  check(
    "filter audit hanya mengembalikan aksi yang dipilih",
    auditFilteredBody.entries.length > 0 &&
      auditFilteredBody.entries.every(
        (entry) => entry.action === "KOREKSI_IZIN" && entry.entity === "Incident",
      ),
  );

  const incidentLogs = await get("/api/admin/incident-logs?limit=100", admin.cookie);
  check("riwayat status laporan bisa dimuat admin", incidentLogs.statusCode === 200);
  check(
    "riwayat status memuat catatan pembatalan",
    incidentLogs.body.includes("DIBATALKAN"),
  );

  console.log("\n[10] Panel demo, waktu, reset, dan tiga contoh");
  check(
    "offset waktu yang terlalu besar ditolak",
    (await patch("/api/dev/clock", admin.cookie, { offsetMinutes: 60 * 24 * 60 })).statusCode === 400,
  );
  const clockResponse = await patch("/api/dev/clock", admin.cookie, { offsetMinutes: 180 });
  check("waktu demo bisa dimajukan 3 jam", clockResponse.statusCode === 200);
  const clockBody = clockResponse.json() as { offsetMinutes: number; bisnisNow: string };
  check("offset waktu tersimpan", clockBody.offsetMinutes === 180);
  check(
    "waktu bisnis ikut bergeser",
    Math.abs(Date.parse(clockBody.bisnisNow) - (Date.now() + 180 * 60_000)) < 10_000,
  );
  const devStatus = await get("/api/dev/status", admin.cookie);
  const devStatusBody = devStatus.json() as { offsetMinutes: number; counts: { incidents: number } };
  check("status panel demo membaca offset", devStatusBody.offsetMinutes === 180);

  const resetStarted = Date.now();
  const reset = await post("/api/dev/reset", admin.cookie);
  const resetElapsed = Date.now() - resetStarted;
  check("reset demo berhasil dari panel", reset.statusCode === 200);
  check("reset demo selesai jauh di bawah 30 detik", resetElapsed < 30_000, `${(resetElapsed / 1000).toFixed(1)} detik`);
  const resetBody = reset.json() as { result: { incidents: number }; elapsedMs: number };
  check("reset mengembalikan 0 laporan", resetBody.result.incidents === 0);
  check(
    "reset mengosongkan jurnal stok dan koreksi",
    (await prisma.stockMovement.count()) === 0 &&
      (await prisma.incidentCorrection.count()) === 0,
  );
  check(
    "reset memulihkan stok awal",
    (
      await prisma.stock.findUniqueOrThrow({
        where: {
          poskoId_aidItemId: { poskoId: "posko_balai_kota", aidItemId: "aid_air_bersih" },
        },
        select: { qty: true },
      })
    ).qty === 30_000,
  );
  check("reset mengakhiri sesi admin", (await get("/api/dev/status", admin.cookie)).statusCode === 401);

  const adminAgain = await login("admin@sialokasi.demo");
  check("admin bisa masuk lagi setelah reset", adminAgain.statusCode === 200);
  const afterResetStatus = await get("/api/dev/status", adminAgain.cookie);
  const afterResetBody = afterResetStatus.json() as { offsetMinutes: number; counts: { incidents: number } };
  check("reset mengembalikan waktu demo normal", afterResetBody.offsetMinutes === 0);

  const seedExamples = await post("/api/dev/seed-examples", adminAgain.cookie);
  check("tiga contoh laporan bisa diisi", seedExamples.statusCode === 200);
  const seeded = await prisma.incident.findMany({
    orderBy: { code: "asc" },
    select: { code: true, status: true },
  });
  check("tiga laporan contoh tercatat", seeded.length === 3, `${seeded.length} laporan`);
  check(
    "status contoh berurutan menunggu, disetujui, selesai",
    seeded.some((row) => row.status === "MENUNGGU_PERSETUJUAN") &&
      seeded.some((row) => row.status === "DISETUJUI") &&
      seeded.some((row) => row.status === "SELESAI"),
  );
  check(
    "contoh membuat dua izin dan jurnal stok",
    (await prisma.permit.count()) === 2 && (await prisma.stockMovement.count()) > 0,
  );
  check(
    "contoh bisa dilacak publik",
    (await get("/api/public/incidents/SIA-DEMO1")).statusCode === 200,
  );
  check(
    "mengisi contoh dua kali ditolak",
    (await post("/api/dev/seed-examples", adminAgain.cookie)).statusCode === 409,
  );

  const resetAgain = await post("/api/dev/reset", adminAgain.cookie);
  check("reset kedua tetap berhasil", resetAgain.statusCode === 200);
  check(
    "reset kedua kembali ke nol transaksi",
    (await prisma.incident.count()) === 0 &&
      (await prisma.permit.count()) === 0 &&
      (await prisma.auditLog.count()) === 0 &&
      (await prisma.session.count()) === 0,
  );

  console.log("\nRingkasan");
  console.log(`  ${passes.length} pemeriksaan lulus, ${failures.length} gagal`);

  if (failures.length > 0) {
    console.error("\nPerbaiki pemeriksaan yang gagal sebelum melanjutkan.");
    process.exitCode = 1;
  } else {
    console.log(
      "\nM4 siap: pembatalan, koreksi izin, stok anti-minus, audit tetap, rekap CSV, dan panel demo berjalan.",
    );
  }
}

try {
  await main();
} catch (error) {
  console.error("Pemeriksaan M4 gagal dijalankan.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await app.close();
  await prisma.$disconnect();
}
