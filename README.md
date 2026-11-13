# SiAlokasi

Ruang kendali tanggap darurat bencana: satu alur dari **laporan lapangan** → **estimasi bantuan yang bisa dijelaskan** → **keputusan pimpinan** → **izin distribusi bernomor**.

Wilayah demo: **Kota Surabaya**. Bahasa aplikasi: Indonesia.

> Status pengembangan: **M5 — Uji Lintas Perangkat & Siap Pamer** selesai (2026-11-09).
> Papan status lengkap ada di [`docs/rencana-sprint.md`](docs/rencana-sprint.md).

## Isi Repositori

```
apps/
  api/      Fastify + Prisma + PostgreSQL 17
  web/      React 18 + Vite + TypeScript + Tailwind v4 + Leaflet
packages/
  shared/   Tipe, skema Zod, alur status, Haversine, model estimasi, notifikasi
docs/       PRD, desain, ADR, panduan demo, bukti pengujian
scripts/    Perintah database, capture layar, dan tunnel `npm run share`
tools/      Pelatihan model estimasi offline
```

## Prasyarat

- **Node.js 20.19+** (diuji dengan Node 24).
- **PostgreSQL 17** terpasang lokal. Di mesin demo lokasinya `C:\Users\farre\pgsql\17`.
- Port `5432` (PostgreSQL), `3001` (API), `5173` (web).
- Chrome/Edge terbaru untuk mencetak izin dan menguji antarmuka.

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

   Sesuaikan `DATABASE_URL` bila nama pengguna atau kata sandi berbeda. Biarkan
   `DEMO_MODE=true` agar tiga akun contoh tampil di halaman masuk dan panel `/dev` aktif.

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
| `npm run verify:m5` | Memeriksa notifikasi, isolasi antar-pengguna, reset, dan kelengkapan berkas siap pamer |
| `npm run verify:login` | Memeriksa alur keluar lalu masuk dengan peran lain (butuh `npm run dev` + Chrome port 9222) |
| `npm run share` | Membuka akses lintas perangkat lewat localtunnel |
| `npm run share:cloudflare` | Membuka Cloudflare Quick Tunnel (`trycloudflare.com`) |
| `npm run db:start` / `db:stop` / `db:status` | Mengatur PostgreSQL lokal |
| `npm run db:migrate` | Menerapkan migrasi Prisma |
| `npm run db:seed` | Data master bersih (0 laporan, 0 notifikasi) |
| `npm run demo:reset` | Mengembalikan kondisi demo ke 0 transaksi |
| `npm run db:studio` | Membuka Prisma Studio |

## Data Awal

`db:seed` dan `demo:reset` menghasilkan kondisi yang sama:

- 10 jenis bantuan logistik, 31 kecamatan, 3 posko, 30 baris stok.
- 3 akun demo: `petugas@sialokasi.demo`, `pimpinan@sialokasi.demo`, `admin@sialokasi.demo`.
- **0 laporan, 0 rekomendasi, 0 keputusan, 0 izin, 0 riwayat, 0 jurnal stok, 0 notifikasi, 0 sesi.**

Masuk lewat <http://localhost:5173/masuk> memakai **email dan kata sandi**. Ketiga akun
demo memakai kata sandi **`Sialokasi#2026`** (ditampilkan juga di halaman masuk selama
`DEMO_MODE=true`); `npm run db:seed`/`demo:reset` selalu mengembalikan kata sandi ini.
Pendaftaran petugas memakai kata sandi pilihannya sendiri dan menunggu aktivasi Admin.
Panel `/dev` (khusus admin) bisa membuka <http://localhost:5173/dev> untuk mengatur
waktu demo, mengisi 3 contoh laporan, atau reset transaksi.

## Notifikasi Simulasi

Lonceng di header menampilkan kabar yang belum dibaca. Setiap perubahan status penting
(disimpan, dihitung, diajukan, disetujui, ditolak, selesai, dibatalkan, atau dikoreksi)
menambah satu baris di **halaman Notifikasi** (`/notifikasi`). Notifikasi hanya tersimpan di
aplikasi; **tidak ada WA atau SMS asli yang dikirim**. Notifikasi milik satu pengguna tidak
bisa dibaca atau ditandai oleh pengguna lain.

## Cetak Izin Distribusi

Buka izin dari antrian pimpinan, lalu tekan **Cetak**. Tata letak memakai kertas **A4**,
menyembunyikan menu aplikasi, dan tetap menampilkan nomor izin, posko tujuan, daftar bantuan,
serta tanda tangan penerbit. Izin hasil koreksi mencantumkan nomor izin yang digantikan.
Gunakan dialog cetak peramban dan pilih ukuran A4; simpan sebagai PDF bila perlu arsip.

## Akses Lintas Perangkat (`npm run share`)

Jalankan dua terminal:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run share
```

`npm run share` membuka tunnel ke web Vite. Vite mem-proxy `/api` ke server lokal, jadi satu
alamat tunnel cukup untuk web dan API. Buka alamat `https://....loca.lt` yang tercetak di
terminal dari HP/laptop lain. Bila muncul halaman pengingat localtunnel, masukkan kata sandi
yang ikut tercetak (alamat IP publik komputer demo).

- Tunnel membutuhkan internet. Bila localtunnel diblokir jaringan, jalankan
  `npm run share:cloudflare` (Cloudflare Quick Tunnel, tautan `https://....trycloudflare.com`)
  atau `ngrok http 5173`.
- `npm run share:cloudflare` mengunduh `cloudflared` ke `storage/` bila belum ada, lalu membuka
  tunnel ke `http://localhost:5173`. Set `WEB_URL=http://localhost:5174` bila Vite memakai port lain.
- Halaman web mengizinkan host `.loca.lt`, `.trycloudflare.com`, dan `.ngrok-free.app`.
- Perubahan kode memicu muat ulang otomatis; bila tautan HMR terputus, muat ulang halaman.

## Panduan Demo 5 Menit

Skenario lengkap ada di [`docs/panduan-demo.md`](docs/panduan-demo.md): persiapan, urutan
demo dari kondisi nol transaksi, akun tiap peran, cetak izin, dan pembersihan setelah demo.

## Komponen Gerak

Beranda memakai tiga komponen gratis dari registry **React Bits**:
`AnimatedContent` (transisi panel), `GlareHover` (kilau kartu), dan `Aurora` (latar ringkasan).
Sumber dan lisensi dicatat di [`docs/desain/gambar/CREDITS.md`](docs/desain/gambar/CREDITS.md).

- Registry React Bits terdaftar di `components.json`.
- Menambah komponen lain (pilih varian **TS-CSS** dan hanya komponen gratis):

  ```bash
  npx shadcn@latest add @react-bits/NamaKomponen-TS-CSS
  ```

- Komponen hasil unduhan disimpan di `apps/web/src/components/react-bits/`. Jangan menambah
  efek ke halaman selain Beranda tanpa persetujuan pemilik. Semua efek wajib menghormati
  `prefers-reduced-motion`.

## Pengujian Antarmuka

Bukti M1–M5 (tangkapan layar, hasil perintah, dan pemeriksaan aksesibilitas) ada di
[`docs/bukti/m1.md`](docs/bukti/m1.md), [`docs/bukti/m2.md`](docs/bukti/m2.md),
[`docs/bukti/m3.md`](docs/bukti/m3.md), [`docs/bukti/m4.md`](docs/bukti/m4.md), dan
[`docs/bukti/m5.md`](docs/bukti/m5.md). Tangkapan layar M5 beserta hasil uji tata letak
tersimpan di [`docs/bukti/m5/`](docs/bukti/m5/).

Untuk memeriksa alur ganti akun (keluar dari halaman pimpinan lalu masuk sebagai petugas),
jalankan `npm run dev` dan Chrome dengan `--remote-debugging-port=9222`, lalu
`npm run verify:login`. Hasilnya dicatat di
[`docs/bukti/perbaikan-ganti-akun.md`](docs/bukti/perbaikan-ganti-akun.md).

## Deploy ke Vercel

Repo ini siap untuk satu proyek Vercel: web statis + API Fastify sebagai Node Function, dengan PostgreSQL terkelola (Neon/Supabase). Panduan langkah demi langkah ada di [`docs/production-vercel.md`](docs/production-vercel.md).

Contoh hasil pemasangan: **https://sialokasi.vercel.app** (Neon Postgres, region `sin1`).

```bash
vercel link
vercel --prod
```

Variabel minimum di dashboard: `DATABASE_URL` (pooler), `DEMO_MODE`, `WEB_ORIGIN`, `TRUST_PROXY=true`. Migrasi dijalankan manual dengan `npx prisma migrate deploy` memakai URL direct sebelum deploy.

Dua pengaturan yang mudah terlewat: rewrite `/api/:path*` → `/api/[...path]` (jalur API bersarang) dan `regions` yang sama dengan region database (kalau berbeda benua, transaksi bisa melewati batas waktu).

## Catatan

- Berkas desain mentah `*.figcraft` tidak di-commit; tangkapan layarnya ada di `docs/bukti/`.
- Semua warna tampilan memakai token `@theme`; lihat `apps/web/src/styles/theme.css` dan
  `docs/desain/design.md`.
- Bundel peta Leaflet dipisah dari bundel awal; halaman peta dimuat saat dibuka.
