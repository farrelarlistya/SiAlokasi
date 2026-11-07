# ADR 0001 — Monorepo, Stack, dan PostgreSQL Tanpa PostGIS

- **Tanggal:** 2026-11-07
- **Status:** Diterima
- **Konteks tahap:** Sesi 1 (`D1`)

## Konteks

SiAlokasi memerlukan satu basis kode yang memuat aplikasi web, server API, dan aturan bersama (validasi, rumus jarak, model estimasi). Peta membutuhkan data koordinat dan radius, sehingga muncul pertanyaan apakah perlu ekstensi spasial database.

Kondisi mesin demo:
- PostgreSQL 17 sudah terpasang di `C:\Users\farre\pgsql\17`, dengan folder data siap.
- **PostGIS belum terpasang.**
- **Docker tidak tersedia.**

## Keputusan

1. Memakai **monorepo npm workspaces** dengan struktur `apps/web`, `apps/api`, `packages/shared`, dan `tools/train-model`.
2. Stack: **React 18 + Vite + TypeScript**, **Fastify + Prisma**, **PostgreSQL 17**, **Tailwind v4 (`@theme`)**, **Leaflet**, **TanStack Query**, **Zod**.
3. **Tidak memakai PostGIS pada tahap ini.**
   - Koordinat disimpan sebagai kolom `lat` dan `lng` (desimal).
   - Radius disimpan sebagai `radiusM` (integer meter).
   - Perhitungan jarak memakai **Haversine** di `packages/shared`, diuji unit test.
   - Penyaringan "laporan dalam radius" dilakukan di server setelah query area kasar (bounding box) agar tetap efisien.

## Alasan

- **Nol instalasi baru** mengurangi titik gagal saat demo. PostGIS memerlukan ekstensi tambahan yang harus cocok dengan versi PostgreSQL.
- Kebutuhan spasial saat ini sederhana: titik, radius, dan tampilan lingkaran. Penggambaran lingkaran adalah tugas Leaflet, bukan database.
- Jumlah data demo hanya puluhan laporan, sehingga perhitungan di kode jauh lebih cepat dari kebutuhan.
- Rumus di `shared` dapat dipakai web dan api sekaligus, sehingga tidak ada dua sumber kebenaran.

## Konsekuensi

**Positif**
- Setup lebih cepat; satu perintah `db:start` dan migrasi.
- Tidak ada ketergantungan pada ekstensi database.
- Aturan jarak mudah diuji tanpa database.

**Negatif / batasan**
- Query spasial kompleks (irisan poligon, titik terdekat) harus dilakukan di kode.
- Bila data tumbuh menjadi puluhan ribu, perlu indeks spasial khusus.

**Rencana bila kebutuhan berubah**
- Tambahkan PostGIS lewat StackBuilder atau layanan cloud, buat ADR baru, lalu migrasikan kolom `lat`/`lng` menjadi `geography(Point)`.
- API tetap kompatibel karena bentuk respons tidak berubah.

## Alternatif yang Ditolak

| Alternatif | Alasan ditolak |
| :--- | :--- |
| PostgreSQL + PostGIS via Docker | Docker belum terpasang; menambah beban instalasi besar |
| PostgreSQL + PostGIS via StackBuilder | Menambah satu proses instalasi yang bisa gagal sebelum demo |
| MySQL | Tidak memberi keuntungan dibanding PostgreSQL yang sudah ada |
| SQLite | Lebih sederhana, tetapi kurang cocok untuk uji konkurensi stok yang menjadi salah satu `NFR` |
