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

async function login(email: string): Promise<{ cookie: string; statusCode: number; body: unknown }> {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, code: DEMO_CODE },
  });

  return {
    cookie: cookieFrom(response),
    statusCode: response.statusCode,
    body: response.json(),
  };
}

async function get(url: string, cookie?: string): Promise<InjectResponse> {
  return app.inject({
    method: "GET",
    url,
    headers: cookie ? { cookie } : undefined,
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

async function post(
  url: string,
  cookie: string | undefined,
  payload: object,
): Promise<InjectResponse> {
  return app.inject({
    method: "POST",
    url,
    headers: cookie ? { cookie } : undefined,
    payload,
  });
}

async function main(): Promise<void> {
  console.log("Pemeriksaan M2 — Akun Semua Peran & Data Master\n");
  await seedDatabase(prisma);

  console.log("[1] Masuk dengan kode demo dan sesi cookie");
  const adminLogin = await login("admin@sialokasi.demo");
  const petugasLogin = await login("petugas@sialokasi.demo");
  const pimpinanLogin = await login("pimpinan@sialokasi.demo");

  check("akun admin bisa masuk dengan kode 123456", adminLogin.statusCode === 200);
  check("akun petugas bisa masuk dengan kode 123456", petugasLogin.statusCode === 200);
  check("akun pimpinan bisa masuk dengan kode 123456", pimpinanLogin.statusCode === 200);
  check("cookie sesi dipasang saat masuk", adminLogin.cookie.length > 0);

  const me = await get("/api/auth/me", adminLogin.cookie);
  const meBody = me.json() as { user?: { role?: string } };
  check("sesi mengembalikan akun yang sedang masuk", meBody.user?.role === "ADMIN");

  const anonymousMe = await get("/api/auth/me");
  check("tanpa sesi, pengguna dianggap tamu", anonymousMe.json().user === null);

  console.log("\n[2] Hak akses diperiksa di server");
  check(
    "admin boleh membuka daftar akun",
    (await get("/api/admin/users", adminLogin.cookie)).statusCode === 200,
  );
  check(
    "tanpa sesi ditolak 401",
    (await get("/api/admin/users")).statusCode === 401,
  );
  check(
    "petugas ditolak 403 dari halaman admin",
    (await get("/api/admin/users", petugasLogin.cookie)).statusCode === 403,
  );
  check(
    "pimpinan ditolak 403 dari halaman admin",
    (await get("/api/admin/users", pimpinanLogin.cookie)).statusCode === 403,
  );
  check(
    "petugas ditolak 403 dari ringkasan pimpinan",
    (await get("/api/pimpinan/summary", petugasLogin.cookie)).statusCode === 403,
  );
  check(
    "ringkasan pimpinan bisa dibuka pimpinan",
    (await get("/api/pimpinan/summary", pimpinanLogin.cookie)).statusCode === 200,
  );
  check(
    "stok bisa dibaca pimpinan",
    (await get("/api/stock/summary", pimpinanLogin.cookie)).statusCode === 200,
  );
  check(
    "stok ditolak untuk petugas",
    (await get("/api/stock/summary", petugasLogin.cookie)).statusCode === 403,
  );

  console.log("\n[3] Pendaftaran petugas dan aktivasi admin");
  const registration = await post("/api/auth/register", undefined, {
    name: "Calon Petugas Uji",
    email: "calon.petugas@sialokasi.demo",
    regionId: "region_gubeng",
  });
  check("pendaftaran petugas diterima", registration.statusCode === 201);

  const beforeActivation = await login("calon.petugas@sialokasi.demo");
  check("akun baru belum bisa masuk sebelum diaktifkan", beforeActivation.statusCode === 403);

  const pendingUser = await prisma.user.findUnique({
    where: { email: "calon.petugas@sialokasi.demo" },
    select: { id: true, isActive: true, role: true },
  });
  check(
    "akun baru tersimpan sebagai petugas nonaktif",
    pendingUser?.isActive === false && pendingUser?.role === "PETUGAS",
  );

  const activation = await patch(
    `/api/admin/users/${pendingUser?.id}`,
    adminLogin.cookie,
    { isActive: true },
  );
  check("admin bisa mengaktifkan akun", activation.statusCode === 200);

  const afterActivation = await login("calon.petugas@sialokasi.demo");
  check("akun yang sudah aktif bisa masuk", afterActivation.statusCode === 200);

  const roleChange = await patch(
    `/api/admin/users/${pendingUser?.id}`,
    adminLogin.cookie,
    { role: "PIMPINAN" },
  );
  check("admin bisa mengubah peran", roleChange.statusCode === 200);
  check(
    "sesi lama langsung mengikuti peran baru",
    (await get("/api/pimpinan/summary", afterActivation.cookie)).statusCode === 200,
  );
  check(
    "menu lama langsung ditolak setelah peran berubah",
    (await get("/api/petugas/dashboard", afterActivation.cookie)).statusCode === 403,
  );

  const adminSelfDeactivate = await patch(
    "/api/admin/users/user_admin",
    adminLogin.cookie,
    { isActive: false },
  );
  check("admin tidak bisa menonaktifkan akun sendiri", adminSelfDeactivate.statusCode === 400);

  console.log("\n[4] Data master jenis bantuan");
  const createItem = await post("/api/admin/aid-items", adminLogin.cookie, {
    name: "Masker medis uji",
    unit: "kotak",
    icon: "pill",
    standardPerPerson: 0.2,
  });
  check("admin bisa menambah jenis bantuan", createItem.statusCode === 201);
  const createdItem = createItem.json().data as { id: string; name: string };

  const duplicateItem = await post("/api/admin/aid-items", adminLogin.cookie, {
    name: "Masker medis uji",
    unit: "kotak",
    icon: "pill",
    standardPerPerson: 0.2,
  });
  check("nama jenis bantuan dobel ditolak", duplicateItem.statusCode === 409);

  const petugasId = await prisma.user.findUniqueOrThrow({
    where: { email: "petugas@sialokasi.demo" },
    select: { id: true },
  });
  const tempIncident = await prisma.incident.create({
    data: {
      code: "SIA-M2TST",
      title: "Laporan uji M2",
      disasterType: "BANJIR",
      lat: -7.33,
      lng: 112.78,
      radiusM: 1_200,
      regionId: "region_gubeng",
      occurredAt: new Date("2026-11-08T03:00:00.000Z"),
      status: "BARU",
      reporterId: petugasId.id,
      affectedPeople: 120,
      damageLevel: "SEDANG",
      vulnerableBabies: 2,
      vulnerableElderly: 4,
      vulnerablePregnant: 1,
      vulnerableDisabled: 1,
      handlingDays: 3,
      roadAccess: "TERBATAS",
      weather: "HUJAN",
      density: "TINGGI",
    },
  });
  const tempRecommendation = await prisma.recommendation.create({
    data: {
      incidentId: tempIncident.id,
      modelVersion: "uji-m2",
      totalPeople: 120,
    },
  });
  await prisma.recommendationItem.create({
    data: {
      recommendationId: tempRecommendation.id,
      aidItemId: createdItem.id,
      baseQty: 24,
      finalQty: 24,
      unit: "kotak",
      reason: "Kebutuhan uji M2.",
    },
  });

  const deactivateItem = await patch(
    `/api/admin/aid-items/${createdItem.id}`,
    adminLogin.cookie,
    { isActive: false },
  );
  check("jenis bantuan bisa dinonaktifkan", deactivateItem.statusCode === 200);

  const options = await get("/api/master/options");
  const optionItems = options.json().aidItems as { id: string }[];
  check(
    "item nonaktif hilang dari pilihan formulir baru",
    !optionItems.some((item) => item.id === createdItem.id),
  );

  const adminItems = await get("/api/admin/aid-items", adminLogin.cookie);
  const adminItemList = adminItems.json().items as { id: string; isActive: boolean }[];
  const inactiveItem = adminItemList.find((item) => item.id === createdItem.id);
  check("item nonaktif tetap tampil di kelola admin", inactiveItem?.isActive === false);

  const historicalItems = await prisma.recommendationItem.count({
    where: { aidItemId: createdItem.id },
  });
  check("riwayat rekomendasi lama tidak terhapus", historicalItems === 1, `${historicalItems} baris`);

  console.log("\n[5] Wilayah, posko, dan koordinat");
  const createRegion = await post("/api/admin/regions", adminLogin.cookie, {
    name: "Kecamatan Uji M2",
  });
  check("admin bisa menambah kecamatan", createRegion.statusCode === 201);
  const regionId = (createRegion.json().data as { id: string }).id;

  const createPosko = await post("/api/admin/poskos", adminLogin.cookie, {
    name: "Posko Uji M2",
    regionId,
    lat: -7.26,
    lng: 112.76,
  });
  check("admin bisa menambah posko", createPosko.statusCode === 201);
  const poskoId = (createPosko.json().data as { id: string }).id;

  const outsidePosko = await post("/api/admin/poskos", adminLogin.cookie, {
    name: "Posko Luar Surabaya",
    regionId,
    lat: -6.2,
    lng: 106.8,
  });
  check("posko di luar Surabaya ditolak", outsidePosko.statusCode === 400);

  const blockRegion = await patch(`/api/admin/regions/${regionId}`, adminLogin.cookie, {
    isActive: false,
  });
  check("kecamatan dengan posko aktif tidak bisa dinonaktifkan", blockRegion.statusCode === 409);

  const deactivatePosko = await patch(`/api/admin/poskos/${poskoId}`, adminLogin.cookie, {
    isActive: false,
  });
  check("posko bisa dinonaktifkan", deactivatePosko.statusCode === 200);

  const deactivateRegion = await patch(`/api/admin/regions/${regionId}`, adminLogin.cookie, {
    isActive: false,
  });
  check("kecamatan bisa dinonaktifkan setelah poskonya nonaktif", deactivateRegion.statusCode === 200);

  console.log("\n[6] Peta publik dan data pribadi");
  const publicAll = await get("/api/public/incidents");
  check("peta publik bisa dibuka tanpa masuk", publicAll.statusCode === 200);
  const publicBody = publicAll.json() as { incidents: Record<string, unknown>[] };
  const firstIncident = publicBody.incidents[0] ?? {};
  check(
    "respons publik tidak memuat identitas pelapor",
    !("reporter" in firstIncident) && !("reporterId" in firstIncident) && !("phone" in firstIncident),
  );

  const filteredRegion = await get("/api/public/incidents?regionId=region_gubeng");
  check(
    "filter kecamatan menyaring daftar kejadian",
    (filteredRegion.json().incidents as unknown[]).length === 1,
  );
  const filteredOtherRegion = await get("/api/public/incidents?regionId=region_rungkut");
  check(
    "kecamatan lain menghasilkan daftar kosong",
    (filteredOtherRegion.json().incidents as unknown[]).length === 0,
  );
  const badFilter = await get("/api/public/incidents?disasterType=TSUNAMI");
  check("filter jenis bencana yang tidak dikenal ditolak", badFilter.statusCode === 400);

  console.log("\n[7] Keluar dan kebersihan demo");
  const logout = await post("/api/auth/logout", afterActivation.cookie, {});
  check("keluar berhasil", logout.statusCode === 200);
  const afterLogout = await get("/api/auth/me", afterActivation.cookie);
  check("sesi tidak berlaku setelah keluar", afterLogout.json().user === null);

  await seedDatabase(prisma);
  const [users, aidItems, regions, poskos, incidents, sessions, audit] = await Promise.all([
    prisma.user.count(),
    prisma.aidItem.count(),
    prisma.region.count(),
    prisma.posko.count(),
    prisma.incident.count(),
    prisma.session.count(),
    prisma.auditLog.count(),
  ]);
  check("reset demo mengembalikan 3 akun demo", users === 3, `${users} akun`);
  check("reset demo mengembalikan 10 jenis bantuan", aidItems === 10, `${aidItems} item`);
  check("reset demo mengembalikan 8 kecamatan", regions === 8, `${regions} kecamatan`);
  check("reset demo mengembalikan 3 posko", poskos === 3, `${poskos} posko`);
  check("reset demo mengembalikan 0 laporan", incidents === 0, `${incidents} laporan`);
  check("reset demo mengakhiri semua sesi", sessions === 0, `${sessions} sesi`);
  check("reset demo membersihkan riwayat audit", audit === 0, `${audit} baris`);

  console.log("\nRingkasan");
  console.log(`  ${passes.length} pemeriksaan lulus, ${failures.length} gagal`);

  if (failures.length > 0) {
    console.error("\nPerbaiki pemeriksaan yang gagal sebelum melanjutkan.");
    process.exitCode = 1;
  } else {
    console.log("\nM2 siap: semua peran bisa masuk, hak akses dijaga, data master aman.");
  }
}

try {
  await main();
} catch (error) {
  console.error("Pemeriksaan M2 gagal dijalankan.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await app.close();
  await prisma.$disconnect();
}
