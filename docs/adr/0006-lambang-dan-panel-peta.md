# ADR 0006 — Lambang Baru dan Panel Peta yang Bisa Ditutup

- **Tanggal:** 2026-11-08
- **Status:** Diterima
- **Konteks tahap:** Revisi antarsesi, sebelum `M4`

## Konteks

Pemilik proyek meminta dua perubahan tampilan sebelum melanjutkan ke M4:

1. Lambang aplikasi diganti dengan logo baru: pin bantuan di atas lipatan peta, dikelilingi gelombang, api, dan gunung berapi, dengan jalur bantuan oranye.
2. Formulir dan daftar kejadian tidak boleh lagi menutupi peta. Panel harus bisa dibuka dan ditutup dengan leluasa.

Pada desain D1, panel kiri mengapung 24 px di atas peta. Di layar 1366 px panel 400 px menutupi hampir sepertiga peta, dan di ponsel panel menutupi sebagian besar peta. Formulir buat laporan juga belum punya cara untuk menyembunyikan diri saat petugas ingin melihat seluruh wilayah.

## Keputusan

### 1. Lambang memakai berkas gambar asli dari pemilik

- Berkas asli disimpan di `docs/desain/gambar/logo-sialokasi-sumber.jpg`; versi bersih 512 px untuk dokumen ada di `docs/desain/gambar/logo-sialokasi.png`, dan versi 256 px untuk aplikasi ada di `apps/web/src/assets/brand/sialokasi-logo.png`.
- Latar hitam di luar ubin dan bayangan putih di bawah ubin dipotong, sehingga lambang menyatu dengan header gelap tanpa kotak hitam.
- Alasan: detail gelombang, api, gunung, pin, dan kotak bantuan tetap persis seperti gambar yang diberikan pemilik.
- Lambang dipakai di `AppHeader`, `AuthLayout`, dan `apps/web/public/favicon.png` (64 px).
- Teks "SiAlokasi" tetap menjadi nama yang dibaca pembaca layar; gambar ditandai dekoratif saat berada di samping teks.

### 2. Panel peta menjadi bagian tata letak, bukan lapisan mengapung

- Komponen baru `MapWorkspace` menempatkan panel dan peta dalam satu baris fleksibel:
  - Desktop: panel 420–440 px di kiri, peta mengisi sisa lebar.
  - Ponsel: peta 45% area kerja, panel 55% sebagai lembar bawah yang bisa digulir.
- Panel bisa ditutup lewat tombol "Tutup" dan dibuka lewat "Tampilkan panel". Pilihan disimpan di `localStorage` per halaman (`sialokasi.panel.peta-publik`, `sialokasi.panel.laporan-baru`).
- Saat panel ditutup, peta mengisi seluruh area kerja; saat dibuka, formulir yang sudah diisi tidak hilang karena hanya dirender ulang secara visual, bukan di-reset.
- Panel memakai `aria-label`, tombol pembuka/penutup memakai `aria-expanded` dan `aria-controls`.

### 3. Dua layar peta memakai pola ini

- **P1 Beranda publik**: filter, statistik, daftar kejadian, dan detail terpilih berada di panel.
- **T2 Buat laporan**: peta menjadi kanvas utama; titik, radius, detail laporan, dan tombol simpan berada di panel. Peta pemilih tetap bisa diklik dan digeser saat panel terbuka maupun tertutup.
- Layar tinjau pimpinan dan dasbor pimpinan belum diubah karena petanya berada di dalam kartu dan tidak menutupi formulir. Pola ini bisa diterapkan menyusul bila diminta.

### 4. Peta menghitung ulang ukuran setelah panel berubah

- `MapCanvas` memasang `ResizeObserver` dan memanggil `map.invalidateSize()` setelah ukuran berubah.
- Tanpa ini, Leaflet bisa menampilkan ubin kosong atau titik yang bergeser saat panel ditutup.

### 5. Tata letak penuh layar untuk halaman peta

- `AppShell` menerima prop `fullBleed`: tanpa `max-width`, tanpa padding halaman, dan tinggi mengikuti `100dvh`.
- Di ponsel, area kerja menyisakan 64 px untuk `BottomNav` agar tombol simpan tidak tertutup navigasi.
- Tombol "Tampilkan panel" diletakkan di kanan kontrol zoom agar tidak bertumpuk.

### 6. Aksesibilitas

- Setiap halaman peta tetap punya `h1` nyata (boleh `sr-only` saat panel tertutup).
- Semua tombol panel minimal 44×44 px dan punya nama aksesibel.
- Judul di dalam panel diturunkan menjadi `h2`/`h3` agar hierarki tetap benar.
- Tombol simpan pada ponsel tidak lagi menempel di bawah; ia mengikuti akhir formulir agar tidak menutupi isian.

## Konsekuensi

**Positif**
- Peta tidak lagi tertutup panel; pengguna bisa melihat seluruh wilayah kapan saja.
- Formulir dan isian draf tidak hilang saat panel ditutup.
- Lambang tampil tajam di header dan favicon karena sumber aplikasi 256 px dan favicon dibuat khusus 64 px.
- Satu komponen `MapWorkspace` dipakai dua layar, sehingga perilaku konsisten.

**Negatif / batasan**
- Pada ponsel, membuka panel mengurangi tinggi peta menjadi 45%; pengguna perlu menutup panel untuk melihat peta lebar.
- Pilihan buka/tutup disimpan per perangkat, bukan per akun.
- Lambang berupa gambar raster; bila nanti dipakai pada media cetak sangat besar, perlu berkas vektor dari pemilik.

**Mitigasi**
- Tombol "Tampilkan panel" selalu terlihat saat panel tertutup.
- Uji tangkapan layar 1440 px dan 390 px disimpan di `docs/bukti/revisi-peta-sidebar/`.
- Desain logo dicatat di `docs/desain/design.md` §10.

## Alternatif yang Ditolak

| Alternatif | Alasan ditolak |
| :--- | :--- |
| Tetap memakai panel mengapung | Tetap menutupi peta dan sulit dipakai di layar kecil |
| Panel dengan efek lipat (accordion) di dalam kartu | Peta tetap tertutup; hanya memindahkan masalah |
| Menggambar ulang logo sebagai SVG | Detail gelombang, api, dan gunung berisiko berbeda dari gambar yang diberikan pemilik |
| Memakai berkas asli tanpa dipotong | Latar hitam dan bayangan putih membuat kotak hitam terlihat di header gelap |
| Menghapus peta dari halaman formulir | Petugas kehilangan konteks titik dan radius |
| Menyimpan status panel di server | Tidak perlu; preferensi tampilan cukup di perangkat |
