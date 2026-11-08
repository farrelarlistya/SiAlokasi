# Rencana Sprint — SiAlokasi

> Papan status ini adalah memori proyek. Perbarui setiap kali sebuah tahap dimulai atau selesai. Format tanggal: `YYYY-MM-DD`.

## Papan Status

| Tahap | Nama | Status | Bukti |
| :--- | :--- | :--- | :--- |
| `D1` | Perencanaan & Desain | ✅ Selesai — 2026-11-07 | `docs/prd/prd.md`, `docs/desain/design.md`, `AGENTS.md`, `docs/adr/0001..0003`, `SiAlokasi.figcraft` (9 board) |
| `M1` | Pondasi + UI Matang + Seed Bersih | ✅ Selesai — 2026-11-08 | `docs/bukti/m1.md`, `apps/web`, `apps/api`, `packages/shared` |
| `M2` | Akun Semua Peran & Data Master | ✅ Selesai — 2026-11-08 | `docs/bukti/m2.md`, `docs/adr/0004-autentikasi-otp-dan-sesi-cookie.md`, halaman A1/A2/T1/D1–D5 |
| `M3` | Alur Kerja Utama (`FR-11`–`FR-18`) | ⏳ Belum dimulai | — |
| `M4` | Kasus Khusus, Rekap, Admin, Demo | ⏳ Belum dimulai | — |
| `M5` | Uji Lintas Perangkat & Siap Pamer | ⏳ Belum dimulai | — |

Legenda: ✅ selesai · 🚧 sedang dikerjakan · ⏳ belum dimulai · ⛔ terhambat

---

## D1 — Perencanaan & Desain (Selesai 2026-11-07)

**Hasil:**
- Profil proyek di `AGENTS.md` (lokal).
- PRD 10 bagian: `docs/prd/prd.md` — termasuk `FR-01`–`FR-27` dan `NFR-01`–`NFR-15`.
- Panduan desain: `docs/desain/design.md`.
- Keputusan teknis: ADR 0001 (arsitektur & stack), 0002 (model estimasi), 0003 (peta & cadangan tile).
- Berkas desain: `SiAlokasi.figcraft` — halaman `01 · Fondasi & Layar Inti` berisi 9 board: Fondasi (warna, tipografi, komponen), P1 Beranda Publik, T2 Buat Laporan, T3 Faktor & Estimasi, L1 Dasbor Pimpinan, L2 Tinjau Rekomendasi, L3 Izin Distribusi, P2 Lacak Status, dan State & Dialog.
- `.gitignore` sudah memuat `AGENTS.md` dan `*.figcraft`.

**Kriteria selesai:**
- [x] 1 persona utama terkunci (Rina, petugas lapangan).
- [x] 1 referensi visual terkunci (gelap + peta terang + aksen biru).
- [x] Peran, alur inti, status, dan batas lingkup disetujui pemilik.
- [x] `FR`/`NFR` punya tahap dan cara pembuktian.
- [x] Arsitektur & tech stack dikunci.

---

## M1 — Pondasi + UI Matang + Seed Bersih

**Tujuan:** aplikasi bisa dijalankan dari nol, komponen dasar siap dipakai, data master bersih tersedia.

**Rencana kerja:**
1. `packages/shared`: tipe, skema Zod (incident, recommendation, decision, permit), status machine, haversine, format angka/tanggal + unit test.
2. `apps/api`: Prisma schema, migrasi awal, seed 10 bantuan + 8 kecamatan + 3 posko + 3 akun, `ClockService`, `verify-m1.ts`.
3. `apps/web`: token `@theme`, 6 komponen UI, halaman `/ui`, `AppHeader`/`BottomNav`, layout dasar.
4. Skrip: `db:start`, `db:stop`, `db:migrate`, `db:seed`, `demo:reset`, `dev`, `build`, `test`.
5. `docs/bukti/m1.md` + perbarui papan status.

**Kriteria selesai:**
- `npm run build` & `npm test` bersih.
- `npm run db:seed` → 0 laporan, data master lengkap.
- `/ui` menampilkan 6 komponen tanpa pelanggaran aksesibilitas kritis.
- Tidak ada `window.alert/confirm/prompt`.

**Commit:** `feat(shared): ...` → `feat(api): ...` → `feat(web): ...` → `docs(m1): ...`

---

## M1 — Pondasi + UI Matang + Seed Bersih (Selesai 2026-11-08)

**Hasil:**
- Monorepo npm workspaces: `packages/shared`, `apps/api`, `apps/web`.
- `packages/shared`: tipe domain, skema Zod, alur status, Haversine, format angka/jarak/tanggal — **36 unit test lulus**.
- `apps/api`: Fastify + Prisma, migrasi awal seluruh entitas PRD §6.1, seed bersih, `ClockService`, `verify-m1` (18 pemeriksaan lulus).
- `apps/web`: token `@theme`, 6 komponen wajib (Modal/Confirm/Prompt, Toast, Skeleton, EmptyState, Field, AppHeader/BottomNav), halaman `/ui`, beranda pondasi, halaman 404.
- Skrip: `db:start`, `db:stop`, `db:status`, `db:migrate`, `db:seed`, `db:studio`, `demo:reset`, `dev`, `build`, `test`, `verify:m1`.
- Bukti: `docs/bukti/m1.md` + 11 tangkapan layar di `docs/bukti/m1/`.

**Kriteria selesai:**
- [x] `npm run build` dan `npm test` lulus bersih.
- [x] `npm run db:seed` → 10 bantuan, 8 kecamatan, 3 posko, 3 akun, 0 laporan.
- [x] `/ui` menampilkan 6 komponen; tidak ada teks <16 px dan target sentuh <44 px.
- [x] Tidak ada `window.alert/confirm/prompt` dan tidak ada hex lepas di halaman.
- [x] Uji 360/390/768/1366/1920 px tanpa gulir horizontal.
- [x] Reset demo kembali ke 0 transaksi dalam < 1 detik.

**Catatan:** `FR-04` baru selesai sebagian (ClockService + reset). Tombol majukan waktu lewat `/dev` adalah bagian M4 sesuai PRD §10.

---

## M2 — Akun Semua Peran & Data Master

**Tujuan:** semua peran bisa masuk; admin bisa mengelola data tanpa merusak riwayat.

**Rencana kerja:**
1. `shared`: skema auth, user, aid item, region, posko.
2. `api`: OTP demo `123456`, sesi cookie, RBAC, pendaftaran petugas + aktivasi, CRUD data master, `verify-m2.ts`.
3. `web`: halaman `A1`, `A2`, `T1`, `D1`–`D5`.
4. `docs/bukti/m2.md`.

**Kriteria selesai:**
- 3 akun demo bisa masuk dan melihat menu sesuai peran.
- Menonaktifkan jenis bantuan tidak menghapus data laporan lama.
- Panggilan API lintas peran ditolak 403.

**Commit:** `feat(shared): ...` → `feat(api): ...` → `feat(web): ...` → `docs(m2): ...`

---

## M2 — Akun Semua Peran & Data Master (Selesai 2026-11-08)

**Hasil:**
- `packages/shared`: skema auth/pendaftaran/peran/filter publik, 18 nama ikon bantuan, validasi posko di area Surabaya — **44 unit test lulus**.
- `apps/api`: tabel `Session`, `User.regionId`, `Region.isActive`, OTP `123456`, cookie httpOnly, RBAC 401/403, pendaftaran + aktivasi, CRUD akun/jenis bantuan/kecamatan/posko, audit perubahan, ringkasan admin/pimpinan/petugas, stok read-only, endpoint peta publik, `verify-m2` (49 pemeriksaan lulus).
- `apps/web`: A1 masuk dua langkah, A2 daftar petugas, T1 dasbor petugas, L1 kerangka dasbor pimpinan, D1 dasbor admin, D2 akun & peran, D3 jenis bantuan, D4 kecamatan & posko + peta pemilih, D5 stok, P1 peta publik + filter, peta Leaflet + fallback tile.
- Seed: petugas demo terhubung ke Kecamatan Gubeng; reset mengembalikan 3 akun / 10 bantuan / 8 kecamatan / 3 posko / 0 transaksi / 0 sesi.
- Bukti: `docs/bukti/m2.md` + 17 tangkapan layar di `docs/bukti/m2/`.

**Kriteria selesai:**
- [x] 3 akun demo bisa masuk dan melihat menu sesuai peran.
- [x] Menonaktifkan jenis bantuan tidak menghapus data laporan lama (diuji dengan baris rekomendasi).
- [x] Panggilan API lintas peran ditolak 403; tanpa sesi 401.
- [x] `npm run build` dan `npm test` lulus bersih.
- [x] Uji 360/390/768/1024/1280/1366/1920 px tanpa gulir horizontal.

**Catatan:** P1 sudah punya peta dan filter, tetapi belum ada data kejadian sampai M3 membuat laporan. T1/L1 masih berupa kerangka dasbor; tombol buat laporan dan tinjauan keputusan menyusul di M3. Constraint/trigger append-only audit dan panel `/dev` tetap dijadwalkan M4.

---

## M3 — Alur Kerja Utama

**Tujuan:** laporan lengkap dari lapangan sampai izin distribusi terbit.

**Rencana kerja:**
1. `shared`: skema laporan + 8 faktor, prediksi model, penjelasan, state machine.
2. `api`: endpoint laporan, estimasi, pengajuan, keputusan, izin, kode lacak; kunci idempoten persetujuan.
3. `web`: `T2`, `T3`, `T4`, `L1`, `L2`, `L3`, `P1`, `P2`.
4. `docs/bukti/m3.md` + ADR bila ada keputusan baru.

**Kriteria selesai:**
- Skenario demo 5 menit berjalan penuh tanpa error.
- Persetujuan ganda ditolak.
- Laporan terkunci setelah diajukan.
- Kode lacak menampilkan status tanpa data pribadi.

**Commit:** `feat(shared): ...` → `feat(api): ...` → `feat(web): ...` → `docs(m3): ...`

---

## M4 — Kasus Khusus, Rekap, Admin, & Demo

**Tujuan:** aplikasi tahan terhadap skenario tidak ideal dan siap dipamerkan berulang.

**Rencana kerja:**
1. Pembatalan, penolakan, koreksi pasca-persetujuan.
2. Ringkasan stok per posko + aturan stok tidak minus.
3. Rekap per kecamatan/jenis/bulan + ekspor CSV.
4. Panel `/dev`: majukan waktu, reset, isi contoh.
5. `docs/bukti/m4.md`.

**Kriteria selesai:**
- `demo:reset` < 30 detik dan mengembalikan 0 transaksi.
- Audit log menampilkan seluruh perubahan.
- Tidak ada stok negatif pada uji bersamaan.

**Commit:** `feat(shared): ...` → `feat(api): ...` → `feat(web): ...` → `docs(m4): ...`

---

## M5 — Uji Lintas Perangkat & Siap Pamer

**Tujuan:** orang lain bisa menjalankan dan mendemokan tanpa didampingi.

**Rencana kerja:**
1. `npm run share` (tunnel) + uji 360/768/1366/1920 px.
2. Notifikasi simulasi (lonceng + log).
3. Cetak izin A4.
4. `README.md` + panduan demo 5 menit.
5. `docs/bukti/m5.md`.

**Kriteria selesai:**
- Semua halaman lulus uji 4 lebar perangkat.
- README bisa diikuti dari nol.
- Tidak ada istilah teknis di layar.

**Commit:** `feat(shared): ...` → `feat(api): ...` → `feat(web): ...` → `docs(m5): ...`

---

## Keputusan Terkunci

| Tanggal | Keputusan | Alasan | Catatan |
| :--- | :--- | :--- | :--- |
| 2026-11-07 | Wilayah demo: **Kota Surabaya**, peta OpenStreetMap + cadangan tile lokal | Nama kota nyata & mudah dikenali | ADR 0003 |
| 2026-11-07 | Peran: Petugas, Pimpinan, Admin, Tamu | Menutup alur kerja + transparansi publik | — |
| 2026-11-07 | Tanda wilayah: **lingkaran radius** 100 m–5 km | Cepat dipakai saat panik | — |
| 2026-11-07 | Estimasi: **regresi lokal + aturan**, dilatih offline dari data sintetis | Deterministik, tanpa internet, mudah dijelaskan | ADR 0002 |
| 2026-11-07 | Persetujuan **satu tingkat** oleh Pimpinan | Alur demo ringkas & jelas | — |
| 2026-11-07 | Status: `BARU → DIPERIKSA → MENUNGGU_PERSETUJUAN → DISETUJUI → SELESAI` + `DITOLAK`/`DIBATALKAN` | Cukup detail, tidak membingungkan | — |
| 2026-11-07 | 10 jenis bantuan & 8 faktor masukan | Sesuai kebutuhan demo | PRD §6 |
| 2026-11-07 | **PostgreSQL 17 tanpa PostGIS** | Nol instalasi baru, paling aman saat demo | ADR 0001 |
| 2026-11-07 | Peta: **Leaflet** | Radius & marker langsung tersedia | ADR 0003 |
| 2026-11-07 | Visual: panel gelap + peta terang + aksen biru | Sesuai referensi pemilik | `design.md` |
| 2026-11-07 | Ikon bantuan = **SVG**, bukan foto | Barang logistik, bukan produk pajangan | `CREDITS.md` |
| 2026-11-08 | Masuk tanpa kata sandi: **OTP demo + sesi cookie httpOnly** | Demo cepat, tetap memeriksa peran di server | ADR 0004 |
| 2026-11-07 | Tanpa WA/SMS asli, tanpa pelacakan armada, tanpa mobile native, stok ringkas | Menjaga fokus & waktu | PRD §1.4 |

---

## Risiko Aktif

| Risiko | Dampak | Mitigasi | Pemilik |
| :--- | :--- | :--- | :--- |
| Internet demo lemah | Tile peta tidak muncul | Cache tile + cadangan batas wilayah | Dev |
| PostgreSQL lokal mati | Aplikasi tidak terbuka | `db:start` + pemeriksaan otomatis | Dev |
| Scope melebar | Tahap tertunda | Batas lingkup PRD §1.4 | Pemilik |
| Model terasa "kotak hitam" | Kredibilitas turun | Penjelasan per baris + unit test | Dev |

---

## Catatan Sesi Berikutnya

Saat memulai sesi baru, baca berurutan: `AGENTS.md` → dokumen ini → bagian PRD yang relevan dengan tahap aktif → `docs/desain/design.md` bila menyentuh UI → `docs/adr/` bila menyentuh teknis.

**Titik mulai M3 (Alur Kerja Utama):**
1. Lengkapi `packages/shared`: model estimasi deterministik + penjelasan, skema laporan 8 faktor, pembuatan kode lacak `SIA-XXXXX`.
2. Tambah modul `incidents`, `recommendations`, `decisions`, `permits` di API; pakai `assertTransition` dan `ClockService`, kunci persetujuan ganda.
3. Bangun `T2` (peta + radius), `T3` (8 faktor + estimasi), `T4` (ajukan), `L1` antrian nyata, `L2` tinjau + ubah jumlah, `L3` izin, `P2` lacak status.
4. Ganti kerangka T1/L1 dengan data nyata; pastikan peta P1 langsung menampilkan laporan yang baru dibuat.
5. Tulis `verify-m3.ts` dan `docs/bukti/m3.md`; buktikan persetujuan ganda ditolak dan laporan terkunci setelah diajukan.
