# ADR-0010 — Redesign "Rim" untuk antarmuka web

Tanggal: 10 November 2026
Status: diterima, diimplementasikan di `apps/web`

## Konteks

Sistem visual lama (gelap-biru `#0B0D11`/`#2563EB`, sudut 16 px, panel mengapung) berasal dari referensi GIS dan sudah dipakai di seluruh halaman. Pemilik meminta redesign yang tidak terasa "AI-generated", dengan design system + atomic design di FigCraft, lalu dieksekusi ke kode.

## Keputusan

1. Material **Rim** (night) yang dipakai, dengan penyesuaian font: Switzer tidak tersedia di font store FigCraft, jadi display memakai **Plus Jakarta Sans 500**; angka memakai **Geist Mono**.
2. Token baru di `apps/web/src/styles/theme.css`:
   - `canvas #131110`, `surface #1B1815`, `elevated #211D19`, `sunken #0C0A09`
   - `text #F2EDE6`, `text-muted #AAA39A`, `text-disabled #77716A`
   - `border #3A3530`, `border-strong #6A635A`
   - `primary/accent #F0763A`, `primary-ink #1A1008`, `primary-hover #FF8A4F`
   - `info #7CA6E0`, `danger #E4572E`, `warning #F0A53A`
   - `paper #F4EFE5`, `ink #1A1510` (dokumen izin)
   - `radius-* = 0`, `shadow-panel = none`
3. Komponen inti disesuaikan: `Button` (oranye persegi, sekunder garis), `StatusChip` (teks + batang kiri, tanpa pil/titik), `Field` (48 px, `border-strong`), `AppHeader` (logo 32 px + wordmark 20 px, nav teks dengan garis aktif), `BottomNav` (teks + garis atas), `StatCard` (angka mono 40 px, tanpa kartu/ikon-koin), `PageHeader` tanpa eyebrow dekoratif, `Modal`/`Toast` tanpa sudut dan bayangan.
4. Peta tetap OpenStreetMap, tetapi tile dibalik lewat filter CSS (`.leaflet-tile-pane`) agar menjadi peta instrumen gelap tanpa ketergantungan API key. Atribusi OSM tetap terlihat.
5. Halaman yang direstrukturisasi mengikuti board FigCraft: Beranda publik (P1), Buat laporan (T2), Masuk/Daftar (A1/A2), Dasbor admin (D1), Dasbor pimpinan (L1), Lacak laporan (P2). Halaman lain mewarisi token + komponen; perincian layout menyusul bila diminta.
6. Efek React Bits (Aurora/Glare) dilepas dari Beranda karena bertentangan dengan aturan visual Rim (tanpa glow/wash) dan material Rim yang tenang. Berkas komponen tetap ada, tidak dipakai.

## Konsekuensi

- Semua halaman otomatis berubah warna, radius, dan tipografi; halaman yang belum direstrukturisasi tetap memakai susunan lama.
- `docs/desain/design.md` (sistem lama) tidak dihapus. Sistem yang berlaku sekarang didokumentasikan di `docs/desain/design-rim.md`.
- `@fontsource/geist-mono` ditambahkan. Bundle CSS naik sedikit; tidak ada permintaan jaringan baru saat runtime.
- Peta memakai filter CSS; bila tile gagal, latar `--color-map-land` dan daftar kejadian tetap terbaca.
- Pratinjau: `npm run dev` dan board `SiAlokasi-Redesign.figcraft`.

## Tindak lanjut (2026-11-10)

- T3, L2, L3, D2–D7 dirapikan: judul pendek, kartu dihapus menjadi garis pemisah, badge status memakai teks + batang, tabel admin tanpa bingkai kartu, D6 tanpa kartu merah.
- Audit tampilan otomatis dijalankan pada `apps/web/src` + `http://localhost:5174`: **0 FAIL, 1 WARN** (F3, disengaja). Bukti di `docs/bukti/redesign-rim/`.
- Deployment: satu proyek Vercel, web statis + API Fastify sebagai Node Function (`api/[...path].ts`) yang mengimpor bundel `server/api-app.mjs`. Prisma eksternal dengan `includeFiles` mesin query. Panduan: `docs/production-vercel.md`.
- `vercel.json` menambahkan CSP, header keamanan, cache aset, SPA fallback, dan `maxDuration`.
- `TRUST_PROXY` ditambahkan ke env API; cookie sesi tetap `HttpOnly`, `Secure` di produksi, `SameSite=Lax`.
