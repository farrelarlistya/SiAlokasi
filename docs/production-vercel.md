# Deployment Vercel — SiAlokasi

Repo ini disiapkan untuk **satu proyek Vercel**: web statis dari `apps/web/dist` dan API Fastify sebagai Node Function di `api/[...path].ts`. Database PostgreSQL tetap di layanan terkelola (Neon, Supabase, Railway, atau RDS).

## Arsitektur

```
Browser
  └─ https://<project>.vercel.app
       ├─ /            → apps/web/dist (SPA)
       ├─ /assets/*    → cache 1 tahun
       └─ /api/*       → api/[...path].ts → server/api-app.mjs (Fastify)
                                └─ PostgreSQL terkelola
```

`api/[...path].ts` meneruskan seluruh permintaan ke Fastify setelah `app.ready()`; tidak ada `listen()` di serverless. Prisma dibiarkan eksternal; berkas `.prisma/client` disertakan otomatis oleh bundel esbuild di `scripts/build-vercel-api.mjs`.

Dua hal yang wajib ada di `vercel.json`:

- **Rewrite** `{ "source": "/api/:path*", "destination": "/api/[...path]" }` — tanpa ini, fungsi catch-all hanya cocok untuk satu segmen (`/api/health`) dan jalur bersarang (`/api/auth/me`) dijawab 404 oleh Vercel sebelum fungsi dipanggil.
- **`regions: ["sin1"]`** — samakan dengan region database. Fungsi di `iad1` (Amerika) dengan database di Singapura membuat setiap kueri menempuh ±230 ms; reset demo yang biasanya 70 kueri memakan 21 detik dan gagal karena batas transaksi. Setelah berada di region yang sama, reset selesai 0,3 detik.

`apps/api/src/prisma.ts` memberi batas waktu transaksi lebih longgar (`maxWait` 15 detik, `timeout` 20 detik) karena instans serverless yang baru "dingin" butuh beberapa detik untuk koneksi pertama.

## 1. Siapkan database

Pakai PostgreSQL 15+ terkelola. Untuk Vercel + Prisma, gunakan **connection pooler**:

- Neon: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require&pgbouncer=true&connection_limit=1`
- Supabase: port `6543` (pooler) untuk aplikasi, port `5432` untuk migrasi.

Kalau memakai Neon CLI, `neon init` sudah menuliskan `DATABASE_URL` (pooler) dan `DATABASE_URL_UNPOOLED` (langsung) ke `.env.local`. Berkas itu tidak di-commit.

Migrasi dijalankan sekali dari mesin lokal dengan URL **direct** (bukan pooler):

```bash
cd apps/api
$env:DATABASE_URL="postgresql://...direct..."   # PowerShell
npx prisma migrate deploy
npx prisma db seed
```

Seed membuat 10 jenis bantuan, 31 kecamatan, 3 posko, dan 3 akun demo. Tidak ada transaksi contoh, sesuai aturan demo bersih.

## 2. Siapkan proyek Vercel

```bash
npm i -g vercel
vercel link
```

Di **Project → Settings → Environment Variables** (Production dan Preview), isi:

| Variabel | Nilai |
| :--- | :--- |
| `DATABASE_URL` | URL pooler PostgreSQL |
| `DEMO_MODE` | `true` untuk demo, `false` untuk produksi nyata |
| `WEB_ORIGIN` | `https://<project>.vercel.app` |
| `LOG_LEVEL` | `info` |
| `TRUST_PROXY` | `true` |
| `NODE_ENV` | `production` (biasanya sudah diisi Vercel) |

Jangan menaruh `DATABASE_URL` di `vercel.json` atau commit. Tidak ada `.env` yang ikut ter-deploy.

## 3. Deploy

```bash
vercel --prod
```

`vercel.json` menjalankan:

1. `prisma generate` (mesin Linux dibuat saat build),
2. `node scripts/build-vercel-api.mjs` (Fastify + paket `shared` dibundel ke `server/api-app.mjs`),
3. `vite build` ke `apps/web/dist`.

Kalau build gagal karena Prisma, pastikan `DATABASE_URL` tersedia saat build dan `node_modules/.prisma/client` tidak dihapus oleh cache.

## 4. Verifikasi setelah deploy

```bash
curl https://<project>.vercel.app/api/health
curl https://<project>.vercel.app/api/auth/me      # harus 200, bukan 404
```

Lalu buka halaman masuk, gunakan akun demo (`petugas@sialokasi.demo`, kata sandi `Sialokasi#2026` bila `DEMO_MODE=true`), dan cek:

- peta memuat tile OSM (CSP mengizinkan `*.tile.openstreetmap.org`),
- cookie sesi `Secure; HttpOnly; SameSite=Lax` terpasang,
- `/api/auth/me` mengembalikan pengguna,
- unggah/ubah data master berhasil (uji tulis ke database).

## 5. Catatan produksi

- **Migrasi tidak otomatis.** Jalankan `prisma migrate deploy` sebelum deploy yang mengubah skema. Jangan menaruhnya di build Vercel agar dua deployment bersamaan tidak berlomba.
- **Demo mode.** Saat `DEMO_MODE=true`, panel `/api/dev` aktif dan seed memakai kata sandi demo `Sialokasi#2026` (tertulis di README). Matikan untuk produksi nyata, lalu ganti kata sandi akun lewat seed atau basis data.
- **Serverless.** Setiap instans fungsi punya memori sendiri; rate limit in-memory tidak lintas instans. Bila perlu, tambahkan rate limit di edge/WAF.
- **Koneksi.** Gunakan pooler + `connection_limit=1` agar tidak menghabiskan koneksi PostgreSQL saat banyak fungsi dingin.
- **Region.** Tempatkan fungsi di region yang sama dengan database (`regions` di `vercel.json`). Beda benua membuat setiap kueri lambat dan transaksi bisa melewati batas waktu.
- **Print A4** memakai `window.print()` di browser; tidak butuh layanan tambahan.
- **Rollback.** Vercel menyimpan deployment sebelumnya; rollback lewat dashboard. Migrasi database bersifat maju (tidak otomatis mundur).
