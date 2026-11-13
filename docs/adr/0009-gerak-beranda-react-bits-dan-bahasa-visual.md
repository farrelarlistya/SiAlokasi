# ADR 0009 — Gerak Beranda React Bits & Bahasa Visual Tanpa Subjudul

**Tanggal:** 2026-11-10
**Status:** Diterima
**Tahap:** Revisi antarsesi setelah `M5`
**Terkait:** `NFR-06` (kenyamanan & aksesibilitas UI), `NFR-08` (performa muat), `NFR-10` (bahasa manusia), `FR-10` (beranda publik)

## Konteks

Tiga masalah muncul saat pemilik meninjau tampilan:

1. Terlalu banyak tagline dan kalimat penjelas dekoratif tepat di bawah judul (misalnya
   "Ruang kendali darurat", "Bisa ditutup kapan saja", "Tidak perlu masuk"). Informasi yang
   sama sering sudah terlihat dari judul atau tombol, sehingga layar terasa ramai.
2. Ilustrasi peta di halaman masuk diposisikan absolut dengan offset negatif dan rotasi. Bagian
   bawah gambar terpotong pada tinggi layar tertentu.
3. Beranda publik masih terasa statis. Pemilik meminta transisi, interaksi mikro, latar, dan
   animasi dari komponen gratis React Bits, tetapi hanya untuk halaman utama.

Pemilik juga meminta aturan bahasa visual ini menjadi standar proyek berikutnya.

## Keputusan

### 1. Judul berdiri sendiri

- `PageHeader` tidak lagi menerima atau menampilkan `description`. Metadata singkat yang masih
  penting (mis. kode laporan, jenis bencana, kecamatan) dipindahkan menjadi `eyebrow` **di atas**
  judul.
- Tagline merek, subjudul panel, dan paragraf pembuka yang hanya mengulang judul dihapus.
- Teks setelah judul hanya dipertahankan bila membantu tindakan: petunjuk kolom, syarat penting,
  privasi, status, konfirmasi, langkah pemulihan, atau penjelasan keadaan kosong.
- Aturan yang sama berlaku untuk seluruh halaman, bukan hanya Beranda.

### 2. Ilustrasi masuk tampil utuh

- Panel kiri halaman masuk memakai layout normal, bukan posisi absolut negatif atau rotasi.
- Ilustrasi berada di dalam bingkai ber-radius dengan lebar penuh dan rasio asli `800:520`
  (`h-auto w-full`). Bingkai berada di aliran flex yang dapat menyusut, sehingga tidak terpotong.
- Salinan pemasaran di panel kiri dihapus; merek dan ilustrasi sudah cukup menjelaskan konteks.

### 3. React Bits lewat shadcn, khusus Beranda

- Registry `@react-bits` ditulis di `components.json` dengan alamat
  `https://reactbits.dev/r/{name}.json`.
- Komponen gratis bervarian **TypeScript + CSS** diambil ke
  `apps/web/src/components/react-bits/`:
  - `AnimatedContent` — transisi panel dan rincian kejadian saat mount, bukan menunggu gulir.
  - `GlareHover` — kilau tipis pada kartu kejadian saat kursor masuk/keluar.
  - `Aurora` — latar biru lambat di blok ringkasan Beranda.
- Hanya `HomePage` yang mengimpor komponen tersebut. Halaman lain tidak memuat GSAP, WebGL,
  atau efek kilau.
- Aurora memakai token `--color-primary`, `--color-accent`, dan `--color-info`. Karena canvas
  tidak membaca `var(...)`, komponen menyelesaikan token lewat `getComputedStyle` sebelum
  dikirim ke shader.
- Lapisan `surface/85` di atas Aurora menjaga kontras teks. Bila WebGL tidak tersedia, latar
  kembali ke `surface`.
- `prefers-reduced-motion` mematikan gerak Aurora dan membuat konten langsung terlihat.
  `GlareHover` juga berhenti saat gerak minimal dipilih.

### 4. Dependensi ditempatkan di paket web

- `gsap` yang dibutuhkan `AnimatedContent` dicatat sebagai dependensi
  `@sialokasi/web`, bukan dependensi akar monorepo.
- `tsconfig.json` akar hanya menyediakan pemetaan `@/*` untuk alat shadcn; build aplikasi tetap
  memakai `apps/web/tsconfig.json`.

## Konsekuensi

- Layar lebih tenang dan judul mudah dipindai. Informasi yang benar-benar dibutuhkan untuk
  bertindak tetap tersedia sebagai petunjuk, status, konfirmasi, atau keadaan kosong.
- Halaman masuk tidak lagi kehilangan bagian ilustrasi pada 1024, 1280, 1440, maupun 390 px.
- Potongan `HomePage` bertambah sekitar 144 kB (56 kB gzip) karena GSAP dan komponen gerak.
  Potongan itu hanya diambil saat Beranda dibuka; bundel awal dan halaman peran tidak berubah.
- Aurora membutuhkan WebGL2. Tanpa dukungan WebGL, tampilan tetap benar dan terbaca.
- Pengambilan komponen membutuhkan Node/npm dan internet. Konfigurasi registry tidak memuat
  rahasia.
- Komponen Pro tidak dipakai. Semua komponen yang diambil berasal dari registry gratis.
- Bukti: `docs/bukti/revisi-beranda/` berisi 6 tangkapan layar dan `hasil-uji.json` dengan
  **14 pemeriksaan lulus** (termasuk ilustrasi utuh, rasio asli, tanpa gulir horizontal,
  gerak minimal, serta 0 kesalahan konsol/halaman).
