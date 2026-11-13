# Rencana Sprint — SiAlokasi

> Papan status ini adalah memori proyek. Perbarui setiap kali sebuah tahap dimulai atau selesai. Format tanggal: `YYYY-MM-DD`.

## Papan Status

| Tahap | Nama | Status | Bukti |
| :--- | :--- | :--- | :--- |
| `D1` | Perencanaan & Desain | ✅ Selesai — 2026-11-07 | `docs/prd/prd.md`, `docs/desain/design.md`, `docs/adr/0001..0003`, `SiAlokasi.figcraft` (9 board) |
| `M1` | Pondasi + UI Matang + Seed Bersih | ✅ Selesai — 2026-11-08 | `docs/bukti/m1.md`, `apps/web`, `apps/api`, `packages/shared` |
| `M2` | Akun Semua Peran & Data Master | ✅ Selesai — 2026-11-08 | `docs/bukti/m2.md`, `docs/adr/0004-autentikasi-otp-dan-sesi-cookie.md`, halaman A1/A2/T1/D1–D5 |
| `M3` | Alur Kerja Utama (`FR-11`–`FR-18`) | ✅ Selesai — 2026-11-08 | `docs/bukti/m3.md`, `docs/adr/0005-alur-kerja-inti-dan-kunci-persetujuan.md`, halaman T2/T3/T4/L1/L2/L3/P2 |
| `M4` | Kasus Khusus, Rekap, Admin, Demo | ✅ Selesai — 2026-11-09 | `docs/bukti/m4.md`, `docs/adr/0007-stok-ledger-append-only-dan-koreksi-izin.md`, halaman L4/D6/D7 |
| `M5` | Uji Lintas Perangkat & Siap Pamer | ✅ Selesai — 2026-11-09 | `docs/bukti/m5.md`, `docs/adr/0008-notifikasi-cetak-a4-dan-akses-lintas-perangkat.md`, `docs/panduan-demo.md`, `README.md` |
| `R1` | Revisi Hierarki & Fokus Section | ✅ Selesai — 2026-11-10 | `docs/bukti/hierarki-fokus/`, `docs/adr/0011-hierarki-fokus.md`, `docs/desain/design-rim.md` §3–§10 |
| `R2` | Revisi Isi Laporan & Dasbor Pimpinan | ✅ Selesai — 2026-11-13 | `docs/bukti/revisi-2026-11-13.md`, `docs/adr/0013-kecamatan-otomatis-dan-isian-formulir.md` |

Legenda: ✅ selesai · 🚧 sedang dikerjakan · ⏳ belum dimulai · ⛔ terhambat

---

## D1 — Perencanaan & Desain (Selesai 2026-11-07)

**Hasil:**
- PRD 10 bagian: `docs/prd/prd.md` — termasuk `FR-01`–`FR-27` dan `NFR-01`–`NFR-15`.
- Panduan desain: `docs/desain/design.md`.
- Keputusan teknis: ADR 0001 (arsitektur & stack), 0002 (model estimasi), 0003 (peta & cadangan tile).
- Berkas desain: `SiAlokasi.figcraft` — halaman `01 · Fondasi & Layar Inti` berisi 9 board: Fondasi (warna, tipografi, komponen), P1 Beranda Publik, T2 Buat Laporan, T3 Faktor & Estimasi, L1 Dasbor Pimpinan, L2 Tinjau Rekomendasi, L3 Izin Distribusi, P2 Lacak Status, dan State & Dialog.
- `.gitignore` sudah memuat berkas aturan lokal dan `*.figcraft`.

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

## M3 — Alur Kerja Utama (Selesai 2026-11-08)

**Hasil:**
- `packages/shared`: model estimasi `sialokasi-ridge-1.1.0` (faktor penyesuaian di atas rumus dasar), alasan bahasa manusia per baris, kode lacak `SIA-XXXXX`, skema penyesuaian/keputusan, tipe detail laporan & lacak publik — **63 unit test lulus**.
- `tools/train-model`: pelatihan offline deterministik, R² 0,9986–0,9993 pada data sintetis.
- `apps/api`: migrasi `m3_alur_kerja_utama` (faktor nullable, `adjustReason`, unique decision, `permit_items`), endpoint laporan/estimasi/pengajuan, tinjauan/penyesuaian/keputusan/izin/selesai, lacak publik, advisory lock per laporan & nomor izin, `verify-m3` (80 pemeriksaan lulus).
- `apps/web`: T2 peta pemilih titik + slider radius + draf lokal + peringatan laporan dobel; T3 8 faktor + tabel estimasi; T4 pengajuan; L1 ringkasan antrian; L2 tinjau + ubah jumlah + stok posko; L3 dokumen izin + cetak A4 + tandai selesai; P2 lacak status + timeline; T1/P1 diperbarui.
- Seed: stok air bersih & makanan dinaikkan agar kejadian contoh 3 hari bisa dipenuhi satu posko; reset tetap 0 transaksi.
- Bukti: `docs/bukti/m3.md` + 21 tangkapan layar di `docs/bukti/m3/`; ADR 0005.

**Kriteria selesai:**
- [x] Skenario demo 5 menit berjalan penuh tanpa error; 0 kesalahan konsol dan 0 kesalahan halaman.
- [x] Persetujuan ganda ditolak `409`; hanya satu izin dan satu keputusan terbit.
- [x] Laporan terkunci setelah diajukan; sunting/estimasi ulang dijawab `409`.
- [x] Kode lacak menampilkan status & timeline tanpa nama/email/telepon pelapor.
- [x] `npm run build` dan `npm test` lulus bersih.
- [x] 8 halaman baru lulus uji 360/768/1366/1920 px: 0 gulir horizontal, 0 teks <16 px, 0 target <44 px (di luar tautan lompat `sr-only`).

**Catatan:** Stok masih dibaca dan dibandingkan, belum dikurangi. Ledger, invariant `qty >= 0`, pembatalan, koreksi, dan panel `/dev` tetap dijadwalkan M4.

---

## Revisi Antarsesi — Lambang Baru & Panel Peta (Selesai 2026-11-08)

**Permintaan pemilik:** ganti lambang aplikasi dengan logo baru, lalu tambahkan panel samping yang bisa dibuka/ditutup agar formulir tidak menutupi peta.

**Hasil:**
- Lambang baru `BrandMark` (berkas PNG asli dari pemilik, latar hitam dipotong) dipakai di header, halaman masuk, dan `favicon.png` — pin bantuan di atas lipatan peta dengan gelombang, api, gunung, dan jalur oranye.
- Komponen `MapWorkspace`: panel samping 420–440 px di desktop, lembar bawah 55% di ponsel, tombol "Tutup" / "Tampilkan panel", pilihan diingat per halaman.
- Beranda publik (P1) dan Buat Laporan (T2) memakai panel baru; peta tidak lagi tertutup dan mengisi seluruh area saat panel ditutup.
- Peta menghitung ulang ukuran (`invalidateSize`) setiap panel berubah; `AppShell` mendapat mode `fullBleed`; tombol simpan ponsel tidak lagi menutupi isian.
- ADR 0006, pembaruan `docs/desain/design.md` §5, §7, §10, §12, dan bukti di `docs/bukti/revisi-peta-sidebar.md`.
- Uji: 0 kesalahan konsol/halaman, 0 gulir horizontal pada 360/390/768/1440/1920 px, `npm run build` dan `npm test` lulus.

**Kriteria selesai:**
- [x] Logo baru tampil di header, halaman masuk, dan favicon.
- [x] Panel bisa ditutup/dibuka di Beranda dan Buat Laporan; isian formulir tidak hilang.
- [x] Peta tetap utuh dan dapat digeser setelah panel ditutup/dibuka.
- [x] Ponsel 360–390 px: peta/panel tidak tertutup navigasi bawah, tidak ada gulir horizontal pada 360/390/768/1440/1920 px.
- [x] `npm run build` dan `npm test` lulus bersih.

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

## M4 — Kasus Khusus, Rekap, Admin, & Demo (Selesai 2026-11-09)

**Hasil:**
- `packages/shared`: skema batal/koreksi/rekap/offset demo, aturan status kasus khusus, CSV rekap (BOM + CRLF), tipe koreksi izin & jurnal stok — **84 unit test lulus**.
- `apps/api`: migrasi `m4_kasus_khusus` (constraint `stocks_qty_nonnegative`, tabel `stock_movements` & `incident_corrections`, trigger append-only di audit/riwayat/jurnal), pengambilan stok atomik saat izin terbit, pembatalan petugas/pimpinan, koreksi izin dengan izin baru + penanda pengganti, rekap per kecamatan/jenis/bulan + CSV, audit admin, panel `/dev` (waktu, reset, 3 contoh), `verify-m4` (**99 pemeriksaan lulus**).
- `apps/web`: L4 rekap + unduh CSV, D7 audit + riwayat status, D6 panel demo, tombol batal di T3/L2, modal koreksi izin + riwayat di L3, jurnal stok di D5, navigasi peran diperbarui.
- Seed/reset: 3 akun, 10 bantuan, 8 kecamatan, 3 posko, 30 baris stok, **0 transaksi**; reset dari `/dev` 0,2–0,3 detik.
- Bukti: `docs/bukti/m4.md` + 17 tangkapan layar di `docs/bukti/m4/`; ADR 0007.

**Kriteria selesai:**
- [x] `demo:reset` < 30 detik dan mengembalikan 0 transaksi.
- [x] Audit log menampilkan seluruh perubahan (pelaku, waktu, sebelum→sesudah).
- [x] Tidak ada stok negatif pada uji dua persetujuan bersamaan; database menolak `qty < 0`.
- [x] Audit, riwayat status, dan jurnal stok menolak `UPDATE`/`DELETE` lewat trigger.
- [x] Pembatalan dan koreksi izin berjalan tanpa menghapus izin lama.
- [x] Rekap cocok dengan daftar laporan; CSV bisa diunduh.
- [x] `npm run build` dan `npm test` lulus bersih.
- [x] 5 halaman baru lulus uji 360/768/1366/1920 px: 0 gulir horizontal, 0 teks <16 px, 0 target <44 px.

**Catatan:** Panel `/dev` memakai `seedDatabase` yang sama dengan `demo:reset`, sehingga reset dari UI juga mengakhiri sesi dan pengguna perlu masuk lagi. Koreksi izin pada laporan `SELESAI` membuka kembali status ke `DISETUJUI` agar distribusi hasil koreksi bisa ditutup lagi.

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

## M5 — Uji Lintas Perangkat & Siap Pamer (Selesai 2026-11-09)

**Hasil:**
- `packages/shared`: pesan notifikasi untuk semua status + koreksi, skema tandai baca, label jenis — **91 unit test lulus**.
- `apps/api`: migrasi `m5_notifikasi` (tabel `notifications` per penerima), penulisan notifikasi di transaksi yang sama dengan perubahan status, endpoint daftar/tandai baca dengan isolasi `userId`, reset ikut membersihkan notifikasi, `verify-m5` (**40 pemeriksaan lulus**).
- `apps/web`: `NotificationBell` + halaman `/notifikasi`, notifikasi di header semua halaman ber-sesi, cetak A4 satu halaman (header aplikasi/nav/toast disembunyikan, kolom catatan hanya di layar), izin koreksi mencantumkan izin pengganti + alasan, halaman peta dimuat terpisah (`React.lazy`) dan bundel dipecah (`manualChunks`).
- `scripts/share.mjs`: `npm run share` lewat localtunnel; host tunnel diizinkan Vite; satu tunnel untuk web + API.
- `README.md` ditulis ulang dari nol + `docs/panduan-demo.md` berisi skenario demo 5 menit.
- Bukti: `docs/bukti/m5.md` + 16 tangkapan layar + 2 PDF A4 + `hasil-uji.json` di `docs/bukti/m5/`; ADR 0008.

**Kriteria selesai:**
- [x] Semua halaman lulus uji 360/768/1366/1920 px: **23 halaman × 4 lebar = 92 kombinasi**, 0 gulir horizontal, 0 teks <16 px, 0 target <44 px, 0 kesalahan konsol/halaman.
- [x] README bisa diikuti dari nol; panduan demo 5 menit tersedia.
- [x] Tidak ada istilah teknis di layar; unit test notifikasi menolak istilah mesin.
- [x] Setiap perubahan status menambah notifikasi; notifikasi hanya bisa dibaca pemiliknya.
- [x] Izin A4 dan izin koreksi tercetak rapi satu halaman, tanpa menu aplikasi.
- [x] `npm run share` diuji lewat tunnel: halaman 200 dan `/api/health` 200.
- [x] `npm test`, `npm run build`, dan `verify:m1`–`verify:m5` lulus bersih.
- [x] Reset demo tetap 0 laporan, 0 izin, dan 0 notifikasi.

**Catatan:** Localtunnel adalah dependensi pengembangan dan membutuhkan internet. Panduan demo
menyediakan alternatif cloudflared/ngrok. Kolom catatan perhitungan tetap tampil di layar; di
kertas hanya nomor izin, posko, daftar bantuan, dan tanda tangan yang dicetak agar dokumen muat
satu halaman.

---

## Revisi Antarsesi — Alur Ganti Akun (Selesai 2026-11-09)

**Temuan pemilik:** setelah masuk sebagai Pimpinan, keluar, lalu masuk sebagai Petugas, pengguna
diarahkan ke `/pimpinan` dan melihat "Halaman ini bukan untuk peran Anda".

**Perbaikan:**
- `nextPathForRole` memeriksa apakah alamat tujuan boleh dibuka peran yang baru masuk; bila tidak,
  pengguna diarahkan ke dasbor perannya sendiri. Alamat luar diabaikan.
- Proses keluar memakai penanda `logout-state`: `RequireRole` tidak menyimpan `next` saat pengguna
  memang baru keluar, dan `LogoutWatcher` menutup penanda setelah tiba di halaman publik.
- Alur keluar kini berakhir di beranda publik tanpa `?next=` lama.
- Pemeriksaan regresi `npm run verify:login` (8 langkah) lulus: keluar bersih, petugas ke
  `/petugas`, pimpinan tetap ke `/pimpinan`, tujuan lintas peran dan alamat luar diabaikan,
  `/notifikasi` yang diizinkan tetap terbuka.
- Bukti: `docs/bukti/perbaikan-ganti-akun.md`.

**Kriteria selesai:**
- [x] Ganti akun dari Pimpinan ke Petugas tidak lagi memunculkan halaman peran salah.
- [x] `npm run build` lulus.
- [x] `npm run verify:login` → 8 lulus, 0 gagal.

---

## Revisi Antarsesi — Bahasa Visual, Halaman Masuk, & Gerak Beranda (Selesai 2026-11-10)

**Permintaan pemilik:** kurangi subjudul/penjelasan dekoratif setelah judul, perbaiki ilustrasi
halaman masuk yang terpotong, lalu sambungkan React Bits lewat registry shadcn dan terapkan
transisi, interaksi mikro, latar, serta animasi gratis **hanya di Beranda**.

**Hasil:**
- Aturan "judul berdiri sendiri" berlaku di seluruh layar. `PageHeader` tidak lagi
  menampilkan keterangan; metadata penting dipindah ke `eyebrow`. Tagline header, subjudul panel,
  paragraf pembuka halaman masuk, dan kalimat "Tidak perlu masuk" dihapus.
- Halaman masuk memakai ilustrasi dalam aliran layout dengan rasio asli `800:520`, tanpa offset
  negatif/rotasi, sehingga gambar utuh pada 1024/1280/1440 px.
- Registry `@react-bits` terdaftar di `components.json`. Komponen gratis `AnimatedContent`, `GlareHover`, dan `Aurora` (TS + CSS)
  dipasang di `apps/web/src/components/react-bits/`.
- Aurora memakai token warna, diberi lapisan `surface/85` agar kontras, dan berhenti saat gerak
  minimal. `GlareHover` memberi fokus keyboard yang terlihat. Ketiga komponen hanya diimpor
  `HomePage`.
- `gsap` dicatat sebagai dependensi `@sialokasi/web`; `README.md`, `CREDITS.md`, `design.md`,
  ADR 0009, dan bukti uji diperbarui.

**Kriteria selesai:**
- [x] Tiga contoh subjudul dekoratif tidak lagi tampil.
- [x] Ilustrasi masuk utuh dan rasio asli terjaga; tidak ada gulir horizontal 390–1440 px.
- [x] Registry React Bits aktif dan komponen gratis berhasil dipasang.
- [x] Transisi, kilau kartu, dan latar Aurora berjalan hanya di Beranda.
- [x] Konten tetap terlihat dan latar berhenti dengan `prefers-reduced-motion`.
- [x] `npm run build` lulus; 14 pemeriksaan peramban lulus; 0 kesalahan konsol/halaman.
- [x] Bukti: [`docs/bukti/revisi-beranda.md`](bukti/revisi-beranda.md) + 6 tangkapan layar +
  `hasil-uji.json`; ADR [`0009`](adr/0009-gerak-beranda-react-bits-dan-bahasa-visual.md).

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
| 2026-11-08 | Estimasi memakai **faktor penyesuaian di atas rumus dasar**, dilatih offline | Stabil untuk 1–50.000 jiwa, alasan mudah dijelaskan | ADR 0005 |
| 2026-11-08 | **Advisory lock per laporan + unique decision**; persetujuan ganda `409` | Mencegah dua izin dari satu laporan | ADR 0005 |
| 2026-11-08 | **`permit_items` snapshot** + nomor `IZN-YYYYMMDD-XXX`, berlaku 7 hari | Dokumen izin lama tidak berubah saat koreksi M4 | ADR 0005 |
| 2026-11-08 | Kode lacak **`SIA-` + 5 karakter** (9 total, alfabet tanpa I/O/0/1) | Konsisten dengan pola PRD & mudah dibacakan | ADR 0005 |
| 2026-11-08 | Stok hanya **dibandingkan & diberi peringatan** di M3 | Ledger & invariant stok dibangun benar di M4 | ADR 0005 |
| 2026-11-08 | **Lambang baru (berkas asli) + panel peta bisa ditutup** | Formulir tidak menutupi peta; peta bisa dipakai lebar | ADR 0006 |
| 2026-11-09 | Stok diambil **atomik saat izin terbit** (`UPDATE ... WHERE qty >= jumlah`) + `CHECK qty >= 0` | Dua persetujuan bersamaan tidak bisa membuat stok minus | ADR 0007 |
| 2026-11-09 | **Jurnal stok append-only** (`stock_movements`) mencatat setiap pengambilan/pengembalian | Angka stok selalu bisa ditelusuri | ADR 0007 |
| 2026-11-09 | **Koreksi izin = izin baru**; izin lama ditandai `DIBATALKAN` + `supersededAt` | Dokumen lama tidak berubah; stok lama dikembalikan | ADR 0007 |
| 2026-11-09 | Koreksi pada laporan `SELESAI` **membuka kembali ke `DISETUJUI`** | Distribusi hasil koreksi bisa ditutup lagi dengan jejak status | ADR 0007 |
| 2026-11-09 | Trigger **append-only** untuk audit, riwayat status, jurnal stok; reset memakai setelan `allow_purge` | Riwayat tidak bisa diubah diam-diam, reset demo tetap cepat | ADR 0007 |
| 2026-11-09 | Rekap CSV memakai **koma + BOM UTF-8 + CRLF** | Rapi dibuka di Excel Indonesia | ADR 0007 |
| 2026-11-09 | Panel `/dev` memakai `seedDatabase` yang sama dengan `demo:reset` + 3 contoh asli | Satu sumber kebenaran; hasil demo deterministik | ADR 0007 |
| 2026-11-09 | Notifikasi **per penerima** ditulis di transaksi yang sama dengan perubahan status | Tidak ada kabar untuk perubahan yang gagal; isolasi antar-pengguna | ADR 0008 |
| 2026-11-09 | Cetak A4 menyembunyikan **header aplikasi**, bukan semua `header`; kolom catatan hanya di layar | Header dokumen izin ikut tercetak; dokumen muat satu halaman | ADR 0008 |
| 2026-11-09 | Akses lintas perangkat lewat **satu tunnel web** (API diproxy Vite) | Satu alamat untuk web + API; cookie tetap same-origin | ADR 0008 |
| 2026-11-09 | Halaman peta **React.lazy** + `manualChunks` | Bundel awal ~213 kB; Leaflet hanya saat halaman peta dibuka | ADR 0008 |
| 2026-11-09 | Tujuan setelah masuk (`next`) **divalidasi terhadap peran**; keluar tidak menyimpan alamat lama | Ganti akun tidak membawa ke halaman peran lain | `perbaikan-ganti-akun.md` |
| 2026-11-10 | **Judul tanpa subjudul dekoratif**; metadata penting menjadi `eyebrow`; teks pendukung hanya untuk tindakan/status/konfirmasi/keadaan kosong | Layar lebih tenang dan mudah dipindai | ADR 0009 |
| 2026-11-10 | Ilustrasi halaman masuk memakai **aliran layout + rasio asli** `800:520` | Gambar tidak terpotong pada tinggi layar mana pun | ADR 0009 |
| 2026-11-10 | **React Bits lewat registry shadcn**, komponen gratis TS+CSS, hanya di Beranda: `AnimatedContent`, `GlareHover`, `Aurora` | Transisi/interaksi/latar tanpa mengganggu halaman kerja | ADR 0009 |
| 2026-11-10 | Aurora memakai **token warna + lapisan `surface/85`** dan berhenti saat gerak minimal; tanpa WebGL kembali ke `surface` | Kontras teks dan aksesibilitas tetap aman | ADR 0009 |
| 2026-11-10 | **Tangga tipe 32 → 24 → 20 → 16** dan **satu blok fokus per keadaan** | Mata punya tujuan baca dan satu langkah berikutnya | ADR 0011 |
| 2026-11-10 | **Bilah keputusan L2 `fixed` di atas navigasi bawah**; alasan tolak di dialog | Keputusan selalu terlihat tanpa menggulir, bilah tetap ringkas di ponsel | ADR 0011 |
| 2026-11-10 | **`lowStockCount` ditambahkan ke ringkasan admin** untuk blok "Perlu tindakan" | Angka stok menipis tidak perlu query kedua di klien | ADR 0011 |
| 2026-11-10 | **Ponsel menyembunyikan wordmark & nama pengguna di header**; filter P1 dilipat | Header tidak bertumpuk; blok fokus tampil lebih dulu | ADR 0011 |
| 2026-11-11 | **Panel merek A1/A2 memakai alur tiga langkah**, bukan hitungan data awal | Angka seed tidak membantu keputusan masuk | `docs/bukti/revisi-login.md` |
| 2026-11-07 | Tanpa WA/SMS asli, tanpa pelacakan armada, tanpa mobile native, stok ringkas | Menjaga fokus & waktu | PRD §1.4 |

---

## Risiko Aktif

| Risiko | Dampak | Mitigasi | Pemilik |
| :--- | :--- | :--- | :--- |
| Internet demo lemah | Tile peta tidak muncul | Cache tile + cadangan batas wilayah | Dev |
| PostgreSQL lokal mati | Aplikasi tidak terbuka | `db:start` + pemeriksaan otomatis | Dev |
| Layanan tunnel diblokir jaringan | Akses lintas perangkat gagal | Panduan cloudflared/ngrok di README & `share.mjs` | Dev |
| Scope melebar | Tahap tertunda | Batas lingkup PRD §1.4 | Pemilik |
| Model terasa "kotak hitam" | Kredibilitas turun | Penjelasan per baris + unit test | Dev |
| Potongan Beranda bertambah karena GSAP/React Bits | Muat pertama Beranda lebih berat | `HomePage` tetap `React.lazy`; efek tidak dipakai di halaman lain | Dev |
| Peramban tanpa WebGL2 | Latar Aurora tidak muncul | Lapisan `surface/85` + latar `surface` menjadi cadangan; isi tetap terbaca | Dev |

---

## Catatan Sesi Berikutnya

Saat memulai sesi baru, baca berurutan: dokumen ini → bagian PRD yang relevan dengan tahap aktif → `docs/desain/design.md` bila menyentuh UI → `docs/adr/` bila menyentuh teknis.

**Status akhir:** semua tahap `D1` dan `M1`–`M5` selesai. Tidak ada pekerjaan milestone yang
menggantung. Untuk pengembangan lanjutan:

1. Ganti adapter notifikasi simulasi dengan WA/SMS asli bila kredensial tersedia
   (`apps/api/src/lib/notifications.ts`).
2. Tambahkan autentikasi tunnel berlapis bila aplikasi dipakai di luar demo lokal.
3. Perbarui dependensi Prisma/Zod secara terencana; `npm audit` saat ini menandai advisory
   pada `deepmerge-ts` (bawaan Prisma) dan `zod` versi 3, keduanya butuh upgrade besar.
4. Jalankan `npm run share` hanya saat demo; tutup tunnel setelah selesai.

---

## Revisi Redesign "Rim" (2026-11-10)

**Keputusan:** material **Rim** (kertas hitam hangat, oranye, garis 1 px, sudut 0, Geist Mono) menggantikan sistem gelap-biru lama. Catatan lengkap: `docs/adr/0010-redesign-rim.md`, `docs/desain/design-rim.md`.

**Aset desain:** `SiAlokasi-Redesign.figcraft` — halaman `00 · Sistem`, `01 · Alur inti` (P1, T2, T3, L1, L2, L3, P2), `02 · Admin & masuk` (A1, A2, D1–D7), `03 · Status & ponsel` (state & dialog, P1 ponsel). Pratinjau PNG: `docs/desain/redesign/`.

**Kode yang sudah dieksekusi:**
- Token, radius, font, dan peta gelap di `apps/web/src/styles/theme.css`.
- Komponen inti: Button, StatusChip, Field, AppHeader, BottomNav, StatCard, PageHeader, Modal, Toast, EmptyState, Alert, MapWorkspace.
- Halaman: Beranda publik, Buat laporan, Masuk/Daftar, Dasbor admin, Dasbor pimpinan, Lacak laporan. Halaman lain mewarisi token dan komponen; perincian layout menyusul.
- Logo 32 px ditampilkan di header semua halaman ber-sesi dan halaman masuk.

**Bukti:** `npm run build` lulus, `npm test` 91/91 lulus, tangkapan layar 1440/390 px diperiksa manual. Sisa pekerjaan: menyamakan layout T3/L2/L3/D2–D7 dengan board.

**Tindak lanjut (2026-11-10):**
- T3, L2, L3, D2–D7 dirapikan mengikuti board (judul pendek, tanpa kartu bertumpuk, badge status batang kiri).
- Audit tampilan otomatis pada `apps/web/src` + `http://localhost:5174`: **0 FAIL, 1 WARN F3** (disengaja). Bukti di `docs/bukti/redesign-rim/`.
- Siap Vercel: `vercel.json`, `api/[...path].ts`, bundel `server/api-app.mjs`, CSP/header keamanan, `TRUST_PROXY`, dan panduan `docs/production-vercel.md`.
- API serverless diuji lokal: `/api/health` 200 (`database: ok`) dan `POST /api/auth/request-code` 200.

**Rencana berikutnya:** revisi hierarki & fokus section — **selesai 2026-11-10**, lihat bagian
berikut dan ADR 0011.

---

## Revisi Hierarki & Fokus (Selesai 2026-11-10)

**Permintaan/rencana:** `docs/rencana-hierarki-fokus.md` — setiap layar punya satu blok fokus yang
berubah sesuai keadaan, dengan tangga tipe 32 → 24 → 20 → 16 dan satu aksi primer.

**Hasil:**
- Utility tipe baru di `apps/web/src/styles/theme.css`: `.text-page`, `.text-focus`, `.text-section`,
  `.text-figure`, `.focus-rule`.
- Komponen baru: `Section` (`focus`/`default`/`quiet`, `aria-labelledby`, judul fokus `tabIndex=-1`),
  `StepRail` (tiga langkah, penanda 8 px), `lib/focus.ts` (`focusSection`, hormati gerak minimal).
- `PageHeader` mendapat `brief` (maks. dua baris), judul 32/40. Tidak ada lagi judul 28 px.
- `StatCard` mendapat `size="sm"` (20 px) untuk metrik pendukung.
- Layar yang direstrukturisasi: P1 (kosong/terpilih), T2, T3 (faktor → hasil), T4, L1 (Perlu
  keputusan), L2 (tabel + bilah keputusan selalu terlihat; alasan tolak di dialog), L3 (pita nomor
  izin), P2 (kode → status/timeline), A1/A2 (formulir fokus), D1 (Perlu tindakan), D2–D7 (tabel
  fokus, filter 20), D6 (waktu 40, reset sekunder).
- P1 ponsel: filter dilipat, ringkasan di dalam gulungan; header ponsel menyembunyikan wordmark dan
  nama pengguna agar tidak bertumpuk.
- API `GET /api/admin/summary` menambahkan `lowStockCount` untuk blok "Perlu tindakan" D1.
- Bukti: `docs/bukti/hierarki-fokus/` — 38 tangkapan (1440/390), `hasil-uji.json`
  (**240/240 lulus**), audit tampilan (**0 FAIL, 1 WARN F3** disengaja). `npm run build` lulus,
  `npm test` 91/91 lulus, `verify:m2` 49/49, `verify:m4` 99/99. ADR 0011.

**Kriteria selesai:**
- [x] Satu judul halaman 32 dan satu judul fokus 24 per layar; tidak ada teks < 16 px.
- [x] Satu blok fokus per keadaan; perpindahan fokus hanya saat keadaan berubah.
- [x] Satu aksi primer per layar; L2 punya bilah keputusan yang terlihat tanpa menggulir.
- [x] Angka "menunggu keputusan" tidak lagi tampil dua kali di L1.
- [x] Ponsel: blok fokus tampil pertama di panel; filter P1 dilipat; tanpa gulir horizontal.
- [x] `npm run build`, `npm test`, dan audit tampilan lulus (0 FAIL).
- [x] ADR 0011 dan `design-rim.md` §3–§10 diperbarui.

**Catatan:** pemeriksaan render otomatis tidak berjalan karena `puppeteer-core` tidak tersedia di sesi ini;
tangkapan 1440/390 dilakukan lewat Chrome DevTools Protocol dan tetap memeriksa overflow, teks,
target sentuh, jumlah `<h1>`, dan jumlah blok fokus.

---

**Rencana berikutnya:** tidak ada yang menggantung. Revisi hierarki & fokus sudah dieksekusi dan
didokumentasikan di ADR 0011.

---

## Revisi Copy Halaman Masuk (Selesai 2026-11-11)

**Permintaan:** panel kiri halaman masuk memuat hitungan data awal yang tidak relevan; ganti dengan
copy yang menjelaskan pekerjaan yang dibantu aplikasi.

**Hasil:**
- Judul panel merek: "Dari laporan lapangan ke izin distribusi."
- Tiga angka data awal (3 peran, 10 jenis bantuan, 8 kecamatan) diganti tiga langkah alur: catat
  kejadian, periksa estimasi, setujui dan terbitkan izin.
- Panel merek dipasangi `sticky top-0 h-dvh self-start` agar catatan bawah tetap terlihat saat
  formulir lebih tinggi dari layar (1280×800).
- Tidak ada perubahan formulir, tautan, akun demo, rute, atau logika masuk.

**Bukti:** `docs/bukti/revisi-login.md` — tangkapan 1440/1280/390 dan halaman daftar; `npm run build`
lulus, `npm test` 91/91 lulus, audit tampilan 0 FAIL (1 WARN F3 disengaja). `design-rim.md` A1/A2 diperbarui.

**Kriteria selesai:**
- [x] Tidak ada hitungan data awal di halaman masuk.
- [x] Copy memakai istilah kamus proyek: laporan lapangan, estimasi bantuan, izin distribusi.
- [x] Tanpa tagline dekoratif, angka karangan, atau istilah teknis.
- [x] Formulir dan akun demo tetap berfungsi; tidak ada gulir horizontal di 390 px.

---

## Pembersihan Jejak Alat Internal (Selesai 2026-11-13)

**Permintaan:** repo tidak boleh memuat berkas atau catatan yang berkaitan dengan alat internal
proyek (konfigurasi asisten kode dan laporan audit tampilan bawaannya).

**Hasil:**
- Berkas konfigurasi asisten kode dan berkas aturan kerja lokal dikeluarkan dari repo serta masuk
  `.gitignore` (tetap tersimpan di mesin pengembang, tidak ikut dibagikan).
- Dua berkas keluaran audit tampilan baku di folder bukti dihapus; rujukannya diganti istilah
  netral "audit tampilan".
- ADR-0010 berganti nama menjadi `docs/adr/0010-redesign-rim.md`; semua tautan diperbarui.
- README, ADR 0009, ADR 0011, PRD, dan catatan bukti tidak lagi menyebut alat internal.

**Bukti:** `npm run build` lulus, `npm test` 91/91 lulus; pencarian kata kunci alat internal pada
berkas ter-track hanya menyisakan baris `.gitignore`.

---

## Deployment Produksi Vercel + Neon (Selesai 2026-11-13)

**Permintaan:** memasang aplikasi di hosting agar bisa dibuka lewat tautan, memakai database
terkelola, lalu memverifikasi seluruh alur kerja.

**Hasil:**
- Proyek Vercel `sialokasi` aktif di `https://sialokasi.vercel.app`; web statis dan API berada di
  origin yang sama sehingga cookie sesi bekerja tanpa konfigurasi CORS tambahan.
- Database Neon Postgres branch `production` (region `ap-southeast-1`); migrasi 5 berkas diterapkan
  dan seed bersih dijalankan (10 jenis bantuan, 8 kecamatan, 3 posko, 30 baris stok, 0 transaksi).
- Variabel lingkungan produksi: `DATABASE_URL` (pooler), `DEMO_MODE`, `WEB_ORIGIN`, `LOG_LEVEL`,
  `TRUST_PROXY`. Nilai rahasia tidak masuk repo.
- `vercel.json`: rewrite `/api/:path*` → `/api/[...path]` (memperbaiki 404 pada jalur bersarang),
  `regions: ["sin1"]` (menyamakan region dengan database), dan `maxDuration` 30 detik.
- `api/[...path].ts`: mengalirkan ulang badan permintaan dengan `content-length` yang benar dan
  menunggu `finish`/`close` sebelum selesai.
- `apps/api/src/prisma.ts`: `transactionOptions` (`maxWait` 15 detik, `timeout` 20 detik).
- Uji tulis penuh di produksi: laporan → 8 faktor & estimasi → pengajuan → persetujuan
  (`IZN-20261113-001`) → distribusi selesai → reset demo kembali 0 transaksi.

**Kriteria selesai:**
- [x] Halaman web dan seluruh jalur `/api/*` (termasuk bersarang) menjawab 200.
- [x] Masuk dengan tiga akun demo dan kode `123456` berhasil; pembatasan peran berjalan.
- [x] Alur kerja inti berjalan dari laporan sampai izin distribusi di database produksi.
- [x] Publikasi lacak menampilkan status tanpa data pribadi pelapor.
- [x] `POST /api/dev/reset` mengembalikan aplikasi ke 0 laporan, 0 izin, 0 notifikasi.
- [x] `npm run build` lulus dan `npm test` 91/91 lulus.

**Bukti:** `docs/bukti/deploy-vercel-2026-11-13.md`. Keputusan teknis: ADR 0012.

**Rencana berikutnya:** tidak ada yang menggantung. Untuk pemakaian nyata, ubah `DEMO_MODE=false`
dan jalankan migrasi dengan `DATABASE_URL_UNPOOLED` sebelum deploy yang mengubah skema.

---

## R2 — Revisi Isi Laporan & Dasbor Pimpinan (Selesai 2026-11-13)

**Permintaan:** pemilik proyek meminta delapan perbaikan setelah mencoba aplikasi di produksi
(titik tanpa versi gabungan, radius hanya geser, jenis bencana "Lainnya" bisa diketik, kecamatan
otomatis, daftar kecamatan lengkap, hapus "perkiraan lama penanganan", arti angka bantuan
menunggu, dan jalan masuk laporan yang sudah disetujui).

**Hasil:**
- Batas 31 kecamatan diambil dari OpenStreetMap (`tools/build-region-boundaries.mjs` →
  `packages/shared/src/geo/kecamatan-surabaya.json`) dan dipakai untuk menentukan kecamatan
  otomatis dari titik; seed berubah dari 8 menjadi **31 kecamatan** (Mulyorejo ikut terisi).
- Formulir laporan: hanya Lintang + Bujur, radius lewat geser, kolom keterangan untuk jenis
  bencana "Lainnya", kecamatan tampil baca-saja sebagai hasil deteksi.
- Kolom `handlingDays` dihapus dari skema, API, dan database; perhitungan memakai asumsi 3 hari.
- Kolom baru `disasterDetail` (migrasi `20261113130000_m6_revisi_laporan`).
- Dasbor pimpinan: angka campuran satuan diganti rincian per jenis bantuan, dan ditambah bagian
  **Menunggu distribusi** yang membuka laporan; halaman tinjau kini punya tombol
  **Tandai distribusi selesai**.
- Uji: `npm run build`, `npm test` 100/100, `verify:m1`—`verify:m5` (18/49/83/99/40 pemeriksaan),
  serta uji peramban `scripts/capture-revisi.mjs` 12/12 tanpa kesalahan konsol.

**Kriteria selesai:**
- [x] Titik hanya berupa Lintang/Bujur; radius hanya geser; kecamatan tidak dipilih manual.
- [x] Jenis bencana "Lainnya" menyimpan keterangan bebas dan tampil di semua halaman.
- [x] 31 kecamatan tersedia dan deteksi titik diuji (termasuk Mulyorejo).
- [x] Tidak ada kolom lama penanganan di formulir maupun API.
- [x] Dasbor menampilkan bantuan menunggu per jenis dan daftar laporan menunggu distribusi.
- [x] `npm run build`, `npm test`, `verify:m1`—`verify:m5` lulus; demo direset ke 0 transaksi.

**Bukti:** `docs/bukti/revisi-2026-11-13.md`. Keputusan teknis: ADR 0013.
