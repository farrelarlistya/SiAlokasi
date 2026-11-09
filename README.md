# SiAlokasi

Ruang kendali tanggap darurat bencana: satu alur dari **laporan lapangan** → **estimasi bantuan yang bisa dijelaskan** → **keputusan pimpinan** → **izin distribusi bernomor**.

Wilayah demo: **Kota Surabaya**. Bahasa aplikasi: Indonesia.

> Status pengembangan: **M4 — Kasus Khusus, Rekap, Admin, & Demo** selesai (2026-11-09).
> Papan status lengkap ada di [`docs/rencana-sprint.md`](docs/rencana-sprint.md).

## Isi Repositori

```
apps/
  api/      Fastify + Prisma + PostgreSQL 17
  web/      React 18 + Vite + TypeScript + Tailwind v4 + Leaflet
packages/
  shared/   Tipe, skema Zod, alur status, Haversine, format angka/tanggal
docs/       PRD, desain, ADR, bukti pengujian
scripts/    Perintah database (start/stop/status)
```

## Prasyarat

- **Node.js 20.19+** (diuji dengan Node 24).
- **PostgreSQL 17** terpasang lokal. Di mesin demo lokasinya `C:\Users\farre\pgsql\17`.
- Port `5432` (PostgreSQL), `3001` (API), `5173` (web).

Jika PostgreSQL berada di folder lain, atur `PG_DIR` sebelum menjalankan perintah database:

```powershell
$env:PG_DIR = "D:\PostgreSQL\17"
```

## Menyiapkan dari Nol

1. **Pasang dependensi**

   ```bash
   npm install
   ```

2. **Siapkan berkas lingkungan**

   ```bash
   copy apps/api/.env.example apps/api/.env
   ```

   Sesuaikan `DATABASE_URL` bila nama pengguna atau kata sandi berbeda.

3. **Buat pengguna dan database** (sekali saja, dari `psql` sebagai superuser)

   ```sql
   CREATE ROLE sialokasi LOGIN PASSWORD 'sialokasi_dev';
   CREATE DATABASE sialokasi OWNER sialokasi;
   ALTER ROLE sialokasi CREATEDB; -- dibutuhkan Prisma untuk shadow database
   ```

4. **Nyalakan database, jalankan migrasi, isi data awal**

   ```bash
   npm run db:start
   npm run db:migrate
   npm run db:seed
   ```

5. **Jalankan aplikasi**

   ```bash
   npm run dev
   ```

   - Web: <http://localhost:5173>
   - Pemeriksaan komponen: <http://localhost:5173/ui>
   - API: <http://127.0.0.1:3001/api/health>

## Perintah Penting

| Perintah | Kegunaan |
| :--- | :--- |
| `npm run dev` | Menjalankan API dan web sekaligus |
| `npm run build` | Typecheck semua paket + build web produksi |
| `npm test` | Unit test `packages/shared` |
| `npm run verify:m1` | Memeriksa data master, kondisi bersih, dan aturan kode |
| `npm run verify:m2` | Memeriksa masuk semua peran, RBAC, pendaftaran, dan CRUD data master |
| `npm run verify:m3` | Memeriksa alur laporan, estimasi, persetujuan, izin, dan kode lacak |
| `npm run verify:m4` | Memeriksa pembatalan, koreksi, stok anti-minus, audit tetap, rekap, dan reset demo |
| `npm run db:start` / `db:stop` / `db:status` | Mengatur PostgreSQL lokal |
| `npm run db:migrate` | Menerapkan migrasi Prisma |
| `npm run db:seed` | Data master bersih (0 laporan) |
| `npm run demo:reset` | Mengembalikan kondisi demo ke 0 transaksi |
| `npm run db:studio` | Membuka Prisma Studio |

## Data Awal

`db:seed` menghasilkan:

- 10 jenis bantuan logistik, 8 kecamatan, 3 posko, 30 baris stok.
- 3 akun demo: `petugas@sialokasi.demo`, `pimpinan@sialokasi.demo`, `admin@sialokasi.demo`.
- **0 laporan, 0 rekomendasi, 0 keputusan, 0 izin, 0 riwayat, 0 sesi.**

Masuk lewat <http://localhost:5173/masuk>. Saat `DEMO_MODE=true`, kode masuk selalu **`123456`** dan tiga akun demo bisa dipilih langsung. Pendaftaran petugas menunggu aktivasi Admin. Panel `/dev` (khusus admin) bisa membuka `http://localhost:5173/dev` untuk mengatur waktu demo, mengisi 3 contoh laporan, atau reset transaksi.

## Pengujian Antarmuka

Bukti M1–M4 (tangkapan layar, hasil perintah, dan pemeriksaan aksesibilitas) ada di
[`docs/bukti/m1.md`](docs/bukti/m1.md), [`docs/bukti/m2.md`](docs/bukti/m2.md),
[`docs/bukti/m3.md`](docs/bukti/m3.md), dan [`docs/bukti/m4.md`](docs/bukti/m4.md).

## Catatan

- `AGENTS.md` adalah aturan kerja lokal dan **tidak di-commit**.
- Berkas desain mentah `*.figcraft` juga tidak di-commit; tangkapan layarnya ada di `docs/bukti/`.
- Semua warna tampilan memakai token `@theme`; lihat `apps/web/src/styles/theme.css` dan `docs/desain/design.md`.
