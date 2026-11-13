# ADR 0012 — Deployment Produksi: Vercel + Neon

**Tanggal:** 2026-11-13
**Status:** Diterima
**Tahap:** Pasca-`M5` (publikasi/demo daring)
**Terkait:** `NFR-09`, `NFR-12`, `NFR-13`, ADR 0001

## Konteks

Aplikasi sudah lulus `M1`–`M5` dan berjalan di komputer pengembang dengan PostgreSQL lokal. Agar
bisa diperlihatkan lewat tautan tanpa menginstal apa pun, aplikasi perlu dipasang di hosting.
Batasan yang dipegang: satu alamat untuk web dan API (agar cookie sesi `SameSite=Lax` tetap
bekerja), database terkelola, dan tanpa mengubah aturan bisnis di dalam kode.

## Keputusan

### 1. Satu proyek Vercel, satu fungsi catch-all

- Web statis dari `apps/web/dist` dan API Fastify dari `api/[...path].ts` berada di proyek yang sama,
  sehingga peramban melihat semuanya sebagai satu origin.
- `vercel.json` memuat rewrite `{ "source": "/api/:path*", "destination": "/api/[...path]" }`.
  Tanpa rewrite ini, fungsi catch-all hanya cocok untuk satu segmen (`/api/health` berhasil,
  `/api/auth/me` dijawab 404 oleh Vercel sebelum fungsi dipanggil).
- `scripts/build-vercel-api.mjs` membundel Fastify + `packages/shared` ke `server/api-app.mjs`
  (gitignored, dibuat saat build). Blok `includeFiles` dihapus karena skema Vercel menolak bentuk
  larik dan berkas Prisma sudah ikut lewat bundel.

### 2. Neon Postgres, pooler untuk aplikasi, koneksi langsung untuk migrasi

- `DATABASE_URL` = URL pooler (dipakai fungsi), `DATABASE_URL_UNPOOLED` = URL langsung (dipakai
  `prisma migrate deploy` dan `prisma db seed` dari mesin lokal).
- Nilai rahasia hanya ada di Environment Variables Vercel dan `.env.local` (gitignored); tidak
  pernah masuk `vercel.json` atau commit.

### 3. Fungsi dan database berada di region yang sama

- `vercel.json` menetapkan `regions: ["sin1"]`, sama dengan region Neon `ap-southeast-1`.
- Alasan terukur: saat fungsi masih di `iad1`, satu kueri menempuh ±230 ms. Reset demo (±70 kueri
  dalam satu transaksi) memakan 21 detik lalu gagal ("Transaction not found"). Setelah pindah ke
  `sin1`, reset selesai **0,3 detik** dan permintaan biasa turun ke ±0,4–0,6 detik.

### 4. Badan permintaan dan penyelesaian respons

- Vercel sudah membaca badan permintaan sebelum fungsi dipanggil, sehingga `api/[...path].ts`
  mengalirkannya kembali ke Fastify sebagai stream baru dengan `content-length` yang dihitung ulang
  dari isi sebenarnya. Tanpa penyesuaian itu, Fastify menolak dengan
  "Request body size did not match Content-Length".
- Handler menunggu peristiwa `finish`/`close` sebelum selesai. Tanpa itu, fungsi bisa berhenti lebih
  dulu dan POST terlihat sebagai 400 tanpa isi.

### 5. Batas waktu transaksi dilonggarkan

- `apps/api/src/prisma.ts` memakai `transactionOptions: { maxWait: 15_000, timeout: 20_000 }` karena
  instans serverless yang baru "dingin" butuh beberapa detik untuk koneksi pertama.

## Konsekuensi

- `vercel.json` menjadi bagian konfigurasi yang tidak boleh dihapus tanpa memahami rewrite dan
  `regions`; keduanya pernah menyebabkan 404 dan kegagalan transaksi.
- Region fungsi mengikuti region database. Kalau database dipindah, `regions` wajib disesuaikan.
- `NODE_ENV=production` membuat cookie sesi `Secure`; uji lokal tetap memakai `http` di
  `localhost` karena `NODE_ENV` berbeda.
- `DEMO_MODE=true` di produksi berarti OTP `123456` berlaku dan `/api/dev` aktif. Untuk pemakaian
  nyata, ubah menjadi `false` dan jalankan migrasi dengan URL langsung.
- Seed dan `demo:reset` tetap menghasilkan 0 laporan, 0 izin, 0 notifikasi.