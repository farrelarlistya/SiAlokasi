# Bukti Revisi — Copy Panel Merek Halaman Masuk

**Tanggal:** 2026-11-11
**Lingkup:** revisi copy panel merek A1/A2 (bukan milestone baru)
**Sistem:** Rim (`docs/desain/design-rim.md`), Hallmark mode polish

## Masalah

Panel kiri halaman masuk menampilkan hitungan data awal: **3 peran pengguna**, **10 jenis bantuan**,
dan **8 kecamatan**. Angka itu menjelaskan isi basis data, bukan hal yang dicari orang saat akan
masuk. Akibatnya panel terasa seperti etalase data contoh, bukan penjelasan singkat tentang pekerjaan
yang dibantu aplikasi.

## Sebelum & Sesudah

**Sebelum**

- Judul: "Ruang kendali tanggap darurat."
- Keterangan: "Laporan lapangan, estimasi bantuan, dan izin distribusi dalam satu alur."
- Tiga angka: 3 peran pengguna, 10 jenis bantuan, 8 kecamatan.
- Catatan bawah: "BPBD Kota Surabaya. Data contoh."

**Sesudah**

- Judul: "Dari laporan lapangan ke izin distribusi."
- Tiga langkah alur:
  1. Catat kejadian dan tandai wilayah terdampak.
  2. Periksa estimasi bantuan dari kondisi lapangan.
  3. Setujui dan terbitkan izin distribusi.
- Catatan bawah tetap: "BPBD Kota Surabaya. Data contoh."

## Alasan Copy

- **Relevan dengan pekerjaan pengguna.** Tiga langkah memakai istilah yang sudah dipakai di layar
  lain: laporan lapangan, estimasi bantuan, izin distribusi. Petugas mengenali langkah pertama,
  pimpinan mengenali langkah terakhir.
- **Bukan angka karangan.** Tidak ada metrik baru. Hitungan data awal dihapus karena tidak membantu
  keputusan masuk; alur tiga langkah diambil dari alur status di PRD.
- **Judul berdiri sendiri.** Tidak ada tagline dekoratif di bawah judul. Tiga baris di bawahnya
  adalah langkah tindakan, bukan pengulangan judul.
- **Bahasa manusia.** Tidak ada istilah teknis, singkatan mesin, atau tanda pisah dekoratif.
  Judul 42 karakter (6 kata), tiga langkah 21 kata, total panel 32 kata.

## Perubahan Teknis

- `apps/web/src/pages/auth/AuthLayout.tsx`
  - Paragraf merek dan blok `<dl>` berisi tiga angka diganti `<ol>` tiga langkah.
  - Panel merek memakai `sticky top-0 h-dvh self-start` agar catatan bawah tetap terlihat saat
    formulir lebih tinggi dari layar, termasuk pada 1280×800.
  - Tidak ada perubahan pada formulir, tautan, akun demo, rute, atau logika masuk.

## Hasil Uji

| Pemeriksaan | Hasil |
| :--- | :--- |
| `npm run build` | Lulus: typecheck shared, typecheck api, build web |
| `npm test` | **91/91 unit test lulus** |
| `sloplint apps/web/src --scope app --genre modern-minimal` | **0 FAIL, 1 WARN F3** (disengaja, sudah ada sebelumnya); pemeriksaan `AuthLayout.tsx` saja: 0 FAIL, 0 REFLEX, 0 WARN |
| Lebar 390 px (CDP) | `innerWidth 390`, `documentElement.scrollWidth 390`, `body.scrollWidth 390`; tidak ada elemen melewati tepi |
| Tangkapan 1440×900 | Judul, tiga langkah, formulir, dan catatan bawah terlihat |
| Tangkapan 1280×800 | Aksi utama "Kirim kode masuk" terlihat; catatan bawah panel tetap di layar |
| Tangkapan 390×844 | Panel merek tersembunyi; formulir dan akun demo tidak terpotong |

Render tier `sloplint --render` tidak dijalankan karena `puppeteer-core` tidak tersedia di mesin ini.
Pemeriksaan visual dan overflow dilakukan lewat Chrome DevTools Protocol.

## Berkas Bukti

| Berkas | Isi |
| :--- | :--- |
| [`revisi-login/01-masuk-1440.png`](revisi-login/01-masuk-1440.png) | Halaman masuk desktop 1440×900 |
| [`revisi-login/02-masuk-1280.png`](revisi-login/02-masuk-1280.png) | Halaman masuk 1280×800 |
| [`revisi-login/03-masuk-390.png`](revisi-login/03-masuk-390.png) | Halaman masuk ponsel 390×844 |
| [`revisi-login/04-daftar-1440.png`](revisi-login/04-daftar-1440.png) | Halaman daftar yang memakai panel merek sama |
