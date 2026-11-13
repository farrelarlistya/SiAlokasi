# ADR 0013 — Kecamatan Otomatis dari Titik & Penyederhanaan Isian Laporan

- **Tanggal:** 2026-11-13
- **Status:** Diterapkan
- **Tahap:** Revisi pasca-deploy (mengikuti M5)

## Konteks

Umpan balik pemilik proyek setelah aplikasi berjalan di produksi:

1. Titik kejadian masih menampilkan versi gabungan ("`-7.3002, 112.7382`") di samping kolom Lintang/Bujur.
2. Radius bisa diisi lewat kolom ketikan, padahal geser (slider) sudah cukup.
3. Pilihan kecamatan kurang lengkap (Mulyorejo tidak ada) dan masih harus dipilih manual, walau kecamatan sebenarnya bisa ditentukan dari titik.
4. "Perkiraan lama penanganan" membingungkan dan tidak bisa dipastikan petugas.
5. Jenis bencana "Lainnya" tidak bisa ditulis bebas.
6. Dasbor pimpinan menampilkan angka **Bantuan menunggu 31.804** yang tidak bermakna.
7. Setelah persetujuan, laporan sulit ditemukan lagi untuk ditandai selesai (hanya lewat notifikasi).

## Keputusan

### 1. Kecamatan ditentukan dari titik, bukan dari pilihan

- Batas resmi 31 kecamatan Kota Surabaya diambil dari OpenStreetMap (relasi `admin_level=6`) lewat Overpass API, disederhanakan menjadi `packages/shared/src/geo/kecamatan-surabaya.json` (31 kecamatan, ±1.600 titik, ±35 KB).
- Pembuat berkas: `tools/build-region-boundaries.mjs` (bisa diulang kapan saja dari data mentah).
- Logika di `packages/shared/src/geo/regions.ts`:
  - `findRegionAt()` — uji titik di dalam batas (ray casting).
  - `nearestRegionTo()` — cadangan bila titik tepat di garis batas atau sedikit di luar (maksimal 3 km).
  - `resolveRegionForPoint()` — gabungan keduanya; `null` bila jauh di luar kota.
- Server yang menentukan `regionId` saat laporan dibuat (`resolveIncidentRegionId` di `apps/api/src/lib/incident.ts`). Bila titik berada di luar Surabaya, permintaan ditolak dengan pesan yang menyuruh menggeser titik.
- Formulir hanya menampilkan hasil deteksi secara baca-saja, sehingga petugas tidak memilih kecamatan.
- `regionId` tetap opsional di skema bersama agar skrip impor dan verifikasi lama tetap berjalan; UI tidak pernah mengirimnya.

### 2. Daftar kecamatan jadi satu sumber kebenaran

- `SURABAYA_REGIONS` (shared) dipakai bersama oleh seed, deteksi titik, dan tampilan admin.
- Seed berubah dari 8 menjadi **31 kecamatan**; posko demo tetap menunjuk ke kecamatan yang sama.

### 3. "Perkiraan lama penanganan" dihapus dari isian

- Kolom `handlingDays` dihapus dari skema Prisma dan dari seluruh formulir.
- Perhitungan memakai asumsi awal `DEFAULT_HANDLING_DAYS = 3` hari lewat `resolveHandlingDays()`, dan angka ini tetap disebut di alasan setiap baris estimasi supaya hasilnya bisa dijelaskan.
- Model tetap sama (fitur model hanya `damage`, `road`, `weather`, `density`).

### 4. Jenis bencana "Lainnya" punya keterangan bebas

- Kolom baru `incidents.disasterDetail` (opsional, maksimal 80 karakter).
- Skema `incidentDraftSchema`/`incidentPatchSchema` mewajibkan isi minimal 3 karakter saat `disasterType = LAINNYA`.
- Layar memakai `disasterLabel(tipe, keterangan)` sehingga yang tampil adalah nama yang ditulis petugas.

### 5. Radius hanya lewat geser

- Kolom ketikan radius dihapus dari formulir; geser 100 m – 5 km dengan langkah 100 m tetap menjadi satu-satunya cara mengatur.

### 6. Angka "Bantuan menunggu" dipecah per jenis

- `GET /api/pimpinan/summary` tidak lagi menjumlahkan `finalQty` lintas satuan (liter + paket + unit tidak bisa dijumlahkan).
- Gantinya: `waitingAid.itemCount` dan daftar `waitingAid.items` (`name`, `unit`, `qty`) yang ditampilkan sebagai rincian di dasbor.

### 7. Laporan yang disetujui selalu terlihat di dasbor

- Payload summary kini memuat `approved` (maksimal 10 laporan berstatus `DISETUJUI`) lengkap dengan nomor izin dan nama posko.
- Dasbor menampilkan bagian **Menunggu distribusi** yang mengarah ke halaman tinjau laporan.
- Halaman tinjau laporan kini menyediakan tombol **Tandai distribusi selesai** (sebelumnya hanya ada di dokumen izin).

## Konsekuensi

- Positif: langkah pelaporan lebih pendek, data wilayah konsisten, dan alur persetujuan → selesai bisa ditemukan dari dasbor.
- Perlu dijaga: bila batas wilayah OSM diperbarui, jalankan ulang `tools/build-region-boundaries.mjs` lalu perbarui JSON-nya; atribusi ODbL wajib tetap ada di peta dan `docs/desain/gambar/CREDITS.md`.
- Migrasi `20261113130000_m6_revisi_laporan` menambah `disasterDetail` dan membuang `handlingDays`.
