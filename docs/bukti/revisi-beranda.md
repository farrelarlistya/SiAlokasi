# Bukti Revisi — Bahasa Visual, Halaman Masuk, & Gerak Beranda

**Tanggal:** 2026-11-10
**Lingkup:** revisi antarsesi setelah `M5` (bukan milestone baru)
**ADR:** [`0009-gerak-beranda-react-bits-dan-bahasa-visual.md`](../adr/0009-gerak-beranda-react-bits-dan-bahasa-visual.md)

## Yang Diubah

1. **Judul tanpa subjudul dekoratif**
   - `PageHeader` tidak lagi menampilkan keterangan di bawah judul.
   - Tagline "Ruang kendali darurat", subjudul panel "Bisa ditutup kapan saja", deskripsi
     halaman masuk, dan kalimat "Tidak perlu masuk" di halaman lacak dihapus.
   - Metadata penting tetap ada: kode laporan/jenis bencana/kecamatan menjadi `eyebrow` di atas
     judul; petunjuk kolom, konfirmasi, status, privasi, dan keadaan kosong tetap dipertahankan.
2. **Ilustrasi halaman masuk utuh**
   - Bingkai ilustrasi dipindahkan ke aliran layout, memakai lebar penuh dan rasio asli `800:520`.
   - Posisi absolut negatif dan rotasi dihapus agar gambar tidak terpotong di bawah.
3. **React Bits di Beranda**
   - MCP `shadcn` lokal proyek dan registry `@react-bits` aktif.
   - `AnimatedContent`: panel Beranda dan rincian kejadian masuk dengan fade + geser.
   - `GlareHover`: kilau tipis pada kartu kejadian.
   - `Aurora`: latar biru lambat di blok ringkasan, diberi lapisan `surface/85` untuk kontras.
   - Efek hanya diimpor oleh Beranda. `prefers-reduced-motion` membuat konten langsung terlihat
     dan latar berhenti bergerak.

## Hasil Uji

Perintah:

```bash
npm run build
npm test
npm run verify:m1
node scripts/capture-revisi-beranda.mjs
```

- Build TypeScript + Vite lulus. Potongan `HomePage` berisi GSAP/Aurora/Glare sekitar
  **144 kB (56 kB gzip)** dan hanya dimuat saat Beranda dibuka.
- `npm test`: **91 unit test lulus**.
- `verify:m1`: **18 pemeriksaan lulus, 0 gagal**, termasuk aturan tanpa warna hex lepas di
  halaman setelah komponen React Bits memakai token/`black`/`white`.
- Skrip peramban: **14 pemeriksaan lulus, 0 gagal**.
  - Aurora terpasang dan transisi konten selesai.
  - Tiga teks subjudul yang dihapus tidak muncul lagi.
  - Ilustrasi masuk **utuh di dalam panel** pada 1280×800; rasio 1,5385 sesuai asli.
  - Tangkapan 1440, 1024, 390 px tidak memiliki gulir horizontal.
  - Konten tetap terlihat dengan `prefers-reduced-motion: reduce`.
  - **0 kesalahan konsol dan 0 kesalahan halaman.**

## Berkas Bukti

| Berkas | Isi |
| :--- | :--- |
| [`revisi-beranda/01-beranda-1440.png`](revisi-beranda/01-beranda-1440.png) | Beranda desktop, Aurora + transisi panel |
| [`revisi-beranda/02-beranda-390.png`](revisi-beranda/02-beranda-390.png) | Beranda ponsel |
| [`revisi-beranda/03-masuk-1280.png`](revisi-beranda/03-masuk-1280.png) | Halaman masuk desktop, ilustrasi utuh |
| [`revisi-beranda/04-masuk-1024.png`](revisi-beranda/04-masuk-1024.png) | Halaman masuk tablet |
| [`revisi-beranda/05-masuk-390.png`](revisi-beranda/05-masuk-390.png) | Halaman masuk ponsel |
| [`revisi-beranda/06-beranda-gerak-minimal.png`](revisi-beranda/06-beranda-gerak-minimal.png) | Beranda dengan gerak minimal |
| [`revisi-beranda/hasil-uji.json`](revisi-beranda/hasil-uji.json) | Hasil mentah 14 pemeriksaan |

## Cara Mengulang

1. Jalankan `npm run dev` dan pastikan API serta web terbuka.
2. Jalankan Chrome dengan `--remote-debugging-port=9222`.
3. Jalankan `node scripts/capture-revisi-beranda.mjs`.
