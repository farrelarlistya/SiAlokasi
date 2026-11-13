import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import type { Response as InjectResponse } from "light-my-request";
import { SURABAYA_REGION_COUNT } from "@sialokasi/shared";
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
    radiusM: number;
    status: string;
    affectedPeople: number | null;
    recommendation: {
      modelVersion: string;
      items: { id: string; aidItemId: string; name: string; baseQty: number; finalQty: number; reason: string }[];
    } | null;
    permit: { number: string; items: { name: string; qty: number }[] } | null;
    decision: { decision: string; reason: string | null } | null;
  };
  message?: string;
};

const validFactors = {
  affectedPeople: 420,
  damageLevel: "BERAT",
  vulnerableBabies: 12,
  vulnerableElderly: 30,
  vulnerablePregnant: 4,
  vulnerableDisabled: 6,
  roadAccess: "TERBATAS",
  weather: "HUJAN",
  density: "TINGGI",
};

const draftPayload = {
  title: "Banjir di Wonokromo",
  disasterType: "BANJIR",
  occurredAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  lat: -7.3002,
  lng: 112.7382,
  radiusM: 1_200,
  regionId: "region_wonokromo",
};

async function main(): Promise<void> {
  console.log("Pemeriksaan M3 — Alur Kerja Utama\n");
  await seedDatabase(prisma);

  console.log("[1] Masuk dan hak akses peran");
  const petugas = await login("petugas@sialokasi.demo");
  const pimpinan = await login("pimpinan@sialokasi.demo");
  const admin = await login("admin@sialokasi.demo");

  check("petugas bisa masuk", petugas.statusCode === 200);
  check("pimpinan bisa masuk", pimpinan.statusCode === 200);
  check("admin bisa masuk", admin.statusCode === 200);

  const forbiddenCreate = await post("/api/petugas/incidents", pimpinan.cookie, draftPayload);
  check("pimpinan ditolak 403 saat membuat laporan", forbiddenCreate.statusCode === 403);

  const forbiddenDecision = await get(
    "/api/pimpinan/incidents/laporan-tidak-ada",
    petugas.cookie,
  );
  check("petugas ditolak 403 dari tinjauan pimpinan", forbiddenDecision.statusCode === 403);

  console.log("\n[2] Membuat laporan dan kode lacak");
  const createdResponse = await post("/api/petugas/incidents", petugas.cookie, draftPayload);
  check("petugas bisa membuat laporan", createdResponse.statusCode === 201);
  const created = createdResponse.json() as IncidentBody;
  const incidentId = created.data.id;
  const trackingCode = created.data.code;

  check("kode lacak memakai pola SIA- diikuti 5 karakter", /^SIA-[A-Z0-9]{5}$/.test(trackingCode), trackingCode);
  check("laporan baru berstatus BARU", created.data.status === "BARU");
  check("laporan baru belum punya estimasi", created.data.recommendation === null);

  const codes = new Set<string>([trackingCode]);
  for (let index = 0; index < 8; index += 1) {
    const extra = await post("/api/petugas/incidents", petugas.cookie, {
      ...draftPayload,
      title: `Laporan uji kode ${index + 1}`,
      lat: -7.3 + index * 0.002,
      lng: 112.74 + index * 0.002,
    });
    if (extra.statusCode === 201) {
      codes.add((extra.json() as IncidentBody).data.code);
    }
  }
  check("sembilan kode lacak semuanya unik", codes.size === 9, `${codes.size} kode`);

  const publicList = await get("/api/public/incidents");
  check(
    "laporan baru muncul di peta publik",
    (publicList.json().incidents as { code: string }[]).some(
      (incident) => incident.code === trackingCode,
    ),
  );

  console.log("\n[3] Menyunting draf dan menghitung estimasi");
  const patched = await patch(`/api/petugas/incidents/${incidentId}`, petugas.cookie, {
    title: "Banjir di Wonokromo RW 03",
    radiusM: 1_500,
  });
  check("petugas bisa menyunting draf BARU", patched.statusCode === 200);
  const patchedBody = patched.json() as IncidentBody;
  check(
    "judul dan radius draf berubah",
    patchedBody.data.title === "Banjir di Wonokromo RW 03" && patchedBody.data.radiusM === 1_500,
  );

  const invalidFactors = await post(
    `/api/petugas/incidents/${incidentId}/factors`,
    petugas.cookie,
    {
      ...validFactors,
      affectedPeople: 10,
      vulnerableBabies: 8,
      vulnerableElderly: 5,
    },
  );
  check("faktor dengan kelompok rentan berlebih ditolak", invalidFactors.statusCode === 400);

  const estimate = await post(
    `/api/petugas/incidents/${incidentId}/factors`,
    petugas.cookie,
    validFactors,
  );
  check("estimasi berhasil dihitung", estimate.statusCode === 200);
  const estimated = estimate.json() as IncidentBody;
  const recommendation = estimated.data.recommendation;

  check("status laporan menjadi DIPERIKSA", estimated.data.status === "DIPERIKSA");
  check("estimasi berisi 10 jenis bantuan", recommendation?.items.length === 10);
  check(
    "versi perhitungan tercatat",
    Boolean(recommendation?.modelVersion.startsWith("sialokasi-ridge-")),
    recommendation?.modelVersion,
  );
  check(
    "semua jumlah bantuan bilangan bulat tidak negatif",
    (recommendation?.items ?? []).every(
      (item) => Number.isInteger(item.baseQty) && item.baseQty >= 0,
    ),
  );
  check(
    "setiap baris bantuan punya alasan",
    (recommendation?.items ?? []).every((item) => item.reason.length > 10),
  );

  const firstQuantities = (recommendation?.items ?? []).map((item) => item.baseQty);
  const recompute = await post(
    `/api/petugas/incidents/${incidentId}/factors`,
    petugas.cookie,
    validFactors,
  );
  const recomputed = recompute.json() as IncidentBody;
  check(
    "perhitungan ulang dengan input sama menghasilkan angka sama",
    JSON.stringify((recomputed.data.recommendation?.items ?? []).map((item) => item.baseQty)) ===
      JSON.stringify(firstQuantities),
  );

  const activeRecommendations = await prisma.recommendation.count({
    where: { incidentId, isActive: true },
  });
  check("hanya satu perhitungan aktif per laporan", activeRecommendations === 1);

  console.log("\n[4] Lacak publik sebelum persetujuan");
  const trackingBefore = await get(`/api/public/incidents/${trackingCode}`);
  check("kode lacak bisa dibuka tanpa masuk", trackingBefore.statusCode === 200);
  const trackingBeforeBody = trackingBefore.json() as {
    incident: { status: string };
    timeline: unknown[];
    aid: unknown;
    permit: unknown;
  };
  check("status lacak menunjukkan DIPERIKSA", trackingBeforeBody.incident.status === "DIPERIKSA");
  check("timeline publik berisi riwayat status", trackingBeforeBody.timeline.length >= 2);
  check("bantuan belum ditampilkan sebelum disetujui", trackingBeforeBody.aid === null);
  check("izin belum tampil sebelum disetujui", trackingBeforeBody.permit === null);
  check(
    "respons lacak tidak memuat identitas pelapor",
    !JSON.stringify(trackingBeforeBody).includes("Rina") &&
      !JSON.stringify(trackingBeforeBody).includes("petugas@sialokasi.demo"),
  );

  const badCode = await get("/api/public/incidents/SIA-123");
  check("kode lacak yang tidak sesuai pola ditolak", badCode.statusCode === 400);
  const missingCode = await get("/api/public/incidents/SIA-ZZZZZ");
  check("kode lacak yang tidak ditemukan dijawab 404", missingCode.statusCode === 404);

  console.log("\n[5] Pengajuan ke pimpinan dan penguncian laporan");
  const submit = await post(`/api/petugas/incidents/${incidentId}/submit`, petugas.cookie);
  check("laporan bisa diajukan", submit.statusCode === 200);
  check(
    "status laporan menjadi MENUNGGU_PERSETUJUAN",
    (submit.json() as IncidentBody).data.status === "MENUNGGU_PERSETUJUAN",
  );

  const editAfterSubmit = await patch(`/api/petugas/incidents/${incidentId}`, petugas.cookie, {
    title: "Judul yang tidak boleh tersimpan",
  });
  check("laporan terkunci dari penyuntingan setelah diajukan", editAfterSubmit.statusCode === 409);

  const estimateAfterSubmit = await post(
    `/api/petugas/incidents/${incidentId}/factors`,
    petugas.cookie,
    validFactors,
  );
  check("estimasi tidak bisa dihitung ulang setelah diajukan", estimateAfterSubmit.statusCode === 409);

  const submitAgain = await post(`/api/petugas/incidents/${incidentId}/submit`, petugas.cookie);
  check("pengajuan ganda ditolak", submitAgain.statusCode === 409);

  console.log("\n[6] Tinjauan pimpinan dan penyesuaian jumlah");
  const summary = await get("/api/pimpinan/summary", pimpinan.cookie);
  const summaryBody = summary.json() as {
    summary: { waitingCount: number };
    waitingAid: { itemCount: number; items: { name: string; unit: string; qty: number }[] };
    queue: { id: string }[];
    approved: { id: string; permitNumber: string | null }[];
  };
  check("antrian pimpinan memuat laporan", summaryBody.queue.some((item) => item.id === incidentId));
  check("ringkasan menunggu keputusan terisi", summaryBody.summary.waitingCount >= 1);
  check(
    "ringkasan bantuan menunggu terisi per jenis dan satuan",
    summaryBody.waitingAid.items.length > 0 &&
      summaryBody.waitingAid.itemCount === summaryBody.waitingAid.items.length &&
      summaryBody.waitingAid.items.every((item) => item.qty > 0 && item.unit !== ""),
    `${summaryBody.waitingAid.itemCount} jenis`,
  );
  check("laporan yang disetujui belum muncul sebelum keputusan", summaryBody.approved.length === 0);

  const detailResponse = await get(`/api/pimpinan/incidents/${incidentId}`, pimpinan.cookie);
  check("pimpinan bisa membuka rincian laporan", detailResponse.statusCode === 200);
  const detail = detailResponse.json() as {
    data: {
      recommendation: { items: { id: string; name: string; finalQty: number }[] };
      poskos: { id: string; name: string }[];
    };
  };
  const firstItem = detail.data.recommendation.items[0];
  check("rincian memuat daftar posko tujuan", detail.data.poskos.length === 3);

  const shortReason = await patch(
    `/api/pimpinan/incidents/${incidentId}/items/${firstItem?.id}`,
    pimpinan.cookie,
    { finalQty: (firstItem?.finalQty ?? 0) + 5, reason: "ok" },
  );
  check("alasan perubahan yang terlalu pendek ditolak", shortReason.statusCode === 400);

  const adjust = await patch(
    `/api/pimpinan/incidents/${incidentId}/items/${firstItem?.id}`,
    pimpinan.cookie,
    {
      finalQty: (firstItem?.finalQty ?? 0) + 5,
      reason: "Stok posko tujuan perlu disesuaikan dengan kondisi lapangan.",
    },
  );
  check("pimpinan bisa menyesuaikan jumlah bantuan", adjust.statusCode === 200);
  const adjusted = adjust.json() as {
    data: { recommendation: { items: { id: string; finalQty: number; adjustReason: string | null }[] } };
  };
  const adjustedItem = adjusted.data.recommendation.items.find(
    (item) => item.id === firstItem?.id,
  );
  check(
    "jumlah akhir dan alasan perubahan tercatat",
    adjustedItem?.finalQty === (firstItem?.finalQty ?? 0) + 5 &&
      Boolean(adjustedItem?.adjustReason),
  );

  const auditCount = await prisma.auditLog.count({
    where: { entity: "RecommendationItem", action: "UBAH_JUMLAH" },
  });
  check("perubahan jumlah masuk riwayat audit", auditCount === 1);

  const sameQty = await patch(
    `/api/pimpinan/incidents/${incidentId}/items/${firstItem?.id}`,
    pimpinan.cookie,
    {
      finalQty: (firstItem?.finalQty ?? 0) + 5,
      reason: "Mencoba menyimpan angka yang sama.",
    },
  );
  check("jumlah yang tidak berubah ditolak", sameQty.statusCode === 400);

  console.log("\n[7] Persetujuan, izin distribusi, dan kunci ganda");
  const approveWithoutPosko = await post(
    `/api/pimpinan/incidents/${incidentId}/decision`,
    pimpinan.cookie,
    { decision: "APPROVE" },
  );
  check("persetujuan tanpa posko ditolak", approveWithoutPosko.statusCode === 400);

  const approveUnknownPosko = await post(
    `/api/pimpinan/incidents/${incidentId}/decision`,
    pimpinan.cookie,
    { decision: "APPROVE", poskoId: "posko_tidak_ada", reason: "Sesuai kondisi lapangan." },
  );
  check("posko yang tidak dikenal ditolak", approveUnknownPosko.statusCode === 400);

  const posko = await prisma.posko.findFirstOrThrow({ where: { id: "posko_balai_kota" } });
  const approveReal = await post(
    `/api/pimpinan/incidents/${incidentId}/decision`,
    pimpinan.cookie,
    { decision: "APPROVE", poskoId: posko.id, reason: "Sesuai kondisi lapangan." },
  );
  check("pimpinan bisa menyetujui laporan", approveReal.statusCode === 200);
  const approved = approveReal.json() as IncidentBody;
  const permitNumber = approved.data.permit?.number ?? "";

  check("status laporan menjadi DISETUJUI", approved.data.status === "DISETUJUI");
  check("nomor izin memakai format IZN-YYYYMMDD-XXX", /^IZN-\d{8}-\d{3}$/.test(permitNumber), permitNumber);
  check("izin memuat 10 baris bantuan", approved.data.permit?.items.length === 10);

  const summaryAfterApprove = await get("/api/pimpinan/summary", pimpinan.cookie);
  const approvedList = (
    summaryAfterApprove.json() as {
      approved: { id: string; permitNumber: string | null; poskoName: string | null }[];
    }
  ).approved;
  check(
    "laporan disetujui masuk daftar menunggu distribusi",
    approvedList.some(
      (item) =>
        item.id === incidentId &&
        item.permitNumber === permitNumber &&
        item.poskoName !== null,
    ),
    `${approvedList.length} laporan`,
  );

  const approveAgain = await post(
    `/api/pimpinan/incidents/${incidentId}/decision`,
    pimpinan.cookie,
    { decision: "APPROVE", poskoId: posko.id },
  );
  check("persetujuan ganda ditolak", approveAgain.statusCode === 409);

  const [permitCount, decisionCount] = await Promise.all([
    prisma.permit.count({ where: { incidentId } }),
    prisma.decision.count({
      where: { recommendation: { incidentId } },
    }),
  ]);
  check("hanya satu izin terbit", permitCount === 1, `${permitCount} izin`);
  check("hanya satu keputusan aktif", decisionCount === 1, `${decisionCount} keputusan`);

  console.log("\n[8] Lacak publik setelah disetujui");
  const trackingAfter = await get(`/api/public/incidents/${trackingCode}`);
  const trackingAfterBody = trackingAfter.json() as {
    incident: { status: string };
    aid: { items: { name: string; qty: number }[] } | null;
    permit: { number: string; poskoName: string } | null;
  };
  check("status lacak menjadi DISETUJUI", trackingAfterBody.incident.status === "DISETUJUI");
  check("ringkasan bantuan tampil setelah disetujui", trackingAfterBody.aid?.items.length === 10);
  check("nomor izin tampil di halaman lacak", trackingAfterBody.permit?.number === permitNumber);
  check(
    "halaman lacak tetap tanpa data pribadi",
    !JSON.stringify(trackingAfterBody).includes("Rina") &&
      !JSON.stringify(trackingAfterBody).includes("petugas@sialokasi.demo"),
  );

  console.log("\n[9] Menandai distribusi selesai");
  const complete = await post(`/api/pimpinan/incidents/${incidentId}/complete`, pimpinan.cookie);
  check("pimpinan bisa menandai distribusi selesai", complete.statusCode === 200);
  check(
    "status laporan menjadi SELESAI",
    (complete.json() as IncidentBody).data.status === "SELESAI",
  );
  const completeAgain = await post(
    `/api/pimpinan/incidents/${incidentId}/complete`,
    pimpinan.cookie,
  );
  check("menandai selesai dua kali ditolak", completeAgain.statusCode === 409);

  const summaryAfterComplete = await get("/api/pimpinan/summary", pimpinan.cookie);
  const approvedAfterComplete = (
    summaryAfterComplete.json() as { approved: { id: string }[] }
  ).approved;
  check(
    "laporan selesai keluar dari daftar menunggu distribusi",
    !approvedAfterComplete.some((item) => item.id === incidentId),
    `${approvedAfterComplete.length} laporan`,
  );

  console.log("\n[10] Jalur penolakan");
  const secondCreate = await post("/api/petugas/incidents", petugas.cookie, {
    ...draftPayload,
    title: "Kebakaran di Tambaksari",
    disasterType: "KEBAKARAN",
    lat: -7.245,
    lng: 112.771,
    regionId: "region_tambaksari",
  });
  const secondId = (secondCreate.json() as IncidentBody).data.id;
  await post(`/api/petugas/incidents/${secondId}/factors`, petugas.cookie, {
    ...validFactors,
    affectedPeople: 150,
    roadAccess: "TERBUKA",
    weather: "CERAH",
    density: "SEDANG",
  });
  await post(`/api/petugas/incidents/${secondId}/submit`, petugas.cookie);

  const rejectWithoutReason = await post(
    `/api/pimpinan/incidents/${secondId}/decision`,
    pimpinan.cookie,
    { decision: "REJECT" },
  );
  check("penolakan tanpa alasan ditolak", rejectWithoutReason.statusCode === 400);

  const reject = await post(
    `/api/pimpinan/incidents/${secondId}/decision`,
    pimpinan.cookie,
    { decision: "REJECT", reason: "Lokasi kejadian belum bisa dipastikan petugas." },
  );
  check("pimpinan bisa menolak dengan alasan", reject.statusCode === 200);
  const rejected = reject.json() as IncidentBody;
  check("status laporan menjadi DITOLAK", rejected.data.status === "DITOLAK");
  check("penolakan tidak menerbitkan izin", rejected.data.permit === null);
  check(
    "alasan penolakan tersimpan",
    rejected.data.decision?.decision === "REJECT" &&
      Boolean(rejected.data.decision.reason),
  );

  const rejectedCode = (await prisma.incident.findUniqueOrThrow({
    where: { id: secondId },
    select: { code: true },
  })).code;
  const rejectedTracking = await get(`/api/public/incidents/${rejectedCode}`);
  const rejectedTrackingBody = rejectedTracking.json() as {
    incident: { status: string };
    aid: unknown;
  };
  check("status lacak menjadi DITOLAK", rejectedTrackingBody.incident.status === "DITOLAK");
  check("bantuan tidak ditampilkan pada laporan yang ditolak", rejectedTrackingBody.aid === null);

  console.log("\n[11] Kebersihan setelah reset demo");
  await seedDatabase(prisma);
  const [users, aidItems, regions, poskos, incidents, recommendations, decisions, permits, permitItems, logs, audit, sessions] =
    await Promise.all([
      prisma.user.count(),
      prisma.aidItem.count(),
      prisma.region.count(),
      prisma.posko.count(),
      prisma.incident.count(),
      prisma.recommendation.count(),
      prisma.decision.count(),
      prisma.permit.count(),
      prisma.permitItem.count(),
      prisma.incidentLog.count(),
      prisma.auditLog.count(),
      prisma.session.count(),
    ]);

  check("reset mengembalikan 3 akun demo", users === 3, `${users} akun`);
  check("reset mengembalikan 10 jenis bantuan", aidItems === 10, `${aidItems} item`);
  check(
    `reset mengembalikan ${SURABAYA_REGION_COUNT} kecamatan`,
    regions === SURABAYA_REGION_COUNT,
    `${regions} kecamatan`,
  );
  check("reset mengembalikan 3 posko", poskos === 3, `${poskos} posko`);
  check("reset mengembalikan 0 laporan", incidents === 0, `${incidents} laporan`);
  check("reset mengembalikan 0 rekomendasi", recommendations === 0, `${recommendations} baris`);
  check("reset mengembalikan 0 keputusan", decisions === 0, `${decisions} baris`);
  check("reset mengembalikan 0 izin", permits === 0, `${permits} baris`);
  check("reset mengembalikan 0 baris izin", permitItems === 0, `${permitItems} baris`);
  check("reset mengembalikan 0 riwayat status", logs === 0, `${logs} baris`);
  check("reset membersihkan audit", audit === 0, `${audit} baris`);
  check("reset mengakhiri semua sesi", sessions === 0, `${sessions} sesi`);

  console.log("\nRingkasan");
  console.log(`  ${passes.length} pemeriksaan lulus, ${failures.length} gagal`);

  if (failures.length > 0) {
    console.error("\nPerbaiki pemeriksaan yang gagal sebelum melanjutkan.");
    process.exitCode = 1;
  } else {
    console.log(
      "\nM3 siap: laporan lapangan, estimasi, persetujuan, izin distribusi, dan kode lacak berjalan.",
    );
  }
}

try {
  await main();
} catch (error) {
  console.error("Pemeriksaan M3 gagal dijalankan.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await app.close();
  await prisma.$disconnect();
}
