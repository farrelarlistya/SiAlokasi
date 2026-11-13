# Kredit & Lisensi Aset — SiAlokasi

Semua aset yang dipakai aplikasi wajib tercatat di sini beserta lisensinya.

## Lambang

| Aset | Sumber | Lisensi | Catatan |
| :--- | :--- | :--- | :--- |
| Lambang SiAlokasi | Disediakan pemilik proyek | Hak milik proyek | Berkas asli `logo-sialokasi-sumber.jpg`; versi bersih `logo-sialokasi.png` (512 px, latar transparan) dan `apps/web/public/favicon.png` (64 px) |
| Lambang aplikasi | Berkas turunan dari lambang di atas | Hak milik proyek | Dipakai lewat komponen `BrandMark` di header dan halaman masuk |

## Ikon

| Aset | Sumber | Lisensi | Catatan |
| :--- | :--- | :--- | :--- |
| Ikon antarmuka | [Lucide](https://lucide.dev) | ISC | Dapat dipakai bebas, termasuk komersial |
| Ikon jenis bantuan (18 pilihan) | Lucide langsung | ISC | Nama ikon disimpan di kolom `icon` data master, dirender oleh web |

Daftar ikon bantuan: tenda keluarga, air bersih, makanan siap saji, obat & P3K, selimut, sanitasi, susu bayi, pembalut, genset, tenda pleton.

## Komponen Gerak

| Aset | Sumber | Lisensi | Catatan |
| :--- | :--- | :--- | :--- |
| `AnimatedContent`, `Aurora`, `GlareHover` | [React Bits](https://reactbits.dev) melalui registry shadcn `@react-bits` | MIT + Commons Clause | Komponen gratis, diambil versi TypeScript + CSS pada 2026-11-10; hanya dipakai di Beranda |
| GSAP | [GreenSock](https://gsap.com) | GSAP Standard License | Dipakai oleh `AnimatedContent` untuk transisi yang menghormati gerak minimal |

## Font

| Aset | Sumber | Lisensi |
| :--- | :--- | :--- |
| Plus Jakarta Sans | Google Fonts / Tokotype | SIL Open Font License 1.1 |
| IBM Plex Mono | IBM / Google Fonts | SIL Open Font License 1.1 |

Font dimuat lokal lewat paket `@fontsource` (`@fontsource-variable/plus-jakarta-sans`, `@fontsource/ibm-plex-mono`) dan ikut dibundel saat build, sehingga tampilan tetap sama tanpa internet.

## Peta & Data Geografis

| Aset | Sumber | Lisensi | Kewajiban |
| :--- | :--- | :--- | :--- |
| Tile peta | OpenStreetMap contributors | ODbL 1.0 | Atribusi "© OpenStreetMap contributors" wajib tampil di peta |
| Batas 31 kecamatan Surabaya | [OpenStreetMap](https://www.openstreetmap.org/copyright) lewat Overpass API (relasi `admin_level=6`) | ODbL 1.0 | Berkas `packages/shared/src/geo/kecamatan-surabaya.json`; skrip pembuat `tools/build-region-boundaries.mjs`; atribusi "© kontributor OpenStreetMap" wajib tetap tampil di peta |
| Pustaka peta | Leaflet | BSD-2-Clause | Cantumkan lisensi di `THIRD-PARTY.md` |

## Foto

**Tidak ada foto** yang dipakai pada versi ini. Sesuai keputusan Sesi 1, jenis bantuan direpresentasikan dengan ikon SVG karena merupakan barang logistik, bukan produk yang dipajang. Bila nanti ditambahkan foto, setiap berkas wajib:
- Format WebP, lebar maksimal 1200 px.
- Nama berkas sesuai isi (contoh `tenda-keluarga.webp`).
- Mencantumkan sumber dan lisensi di tabel baru pada dokumen ini.

## Suara

Tidak ada aset suara.
