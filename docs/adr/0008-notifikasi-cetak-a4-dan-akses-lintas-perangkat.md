# ADR 0008 — Notifikasi Simulasi, Cetak A4, dan Akses Lintas Perangkat

**Tanggal:** 2026-11-09
**Status:** Diterima
**Tahap:** `M5` — Uji Lintas Perangkat & Siap Pamer
**Terkait:** `FR-24`, `FR-25`, `FR-26`, `FR-27`, `NFR-07`, `NFR-10`, `NFR-11`, `NFR-15`

## Konteks

M4 sudah menutup alur kasus khusus, stok, rekap, dan panel demo. Menjelang demo, tiga hal masih
kurang agar orang lain bisa memakai aplikasi tanpa didampingi:

1. Perubahan status hanya terlihat jika pengguna membuka halaman yang tepat. Belum ada kabar
   in-app yang bisa dibaca ulang.
2. Dokumen izin sudah bisa dicetak, tetapi stylesheet lama menyembunyikan **semua** elemen
   `header`, termasuk header dokumen izin. Toaster juga masih ikut tercetak, dan dokumen
   cenderung terpotong ke beberapa halaman.
3. Belum ada perintah resmi untuk membuka aplikasi dari perangkat lain, dan bundel awal masih
   memuat Leaflet sehingga peringatan ukuran chunk muncul.

## Keputusan

### 1. Notifikasi disimpan per penerima

- Tabel `notifications` menyimpan `userId`, jenis, judul, isi, laporan/izin terkait, `readAt`,
  dan waktu. Satu peristiwa status dapat menghasilkan beberapa baris (satu per penerima).
- Notifikasi ditulis **di dalam transaksi yang sama** dengan perubahan status, sehingga tidak ada
  kabar yang muncul untuk perubahan yang akhirnya gagal.
- Penerima:
  - pelapor selalu menerima kabar setiap perpindahan status;
  - saat laporan diajukan, seluruh akun pimpinan aktif menerima kabar antrian;
  - saat koreksi izin, pelapor dan pimpinan lain (selain pelaku) menerima kabar.
- Semua pesan disusun di `packages/shared/src/notifications.ts` agar bahasa manusia, kode laporan,
  nomor izin, dan alasan penolakan konsisten di API dan pengujian.
- `GET /api/notifications` hanya mengembalikan baris milik pengguna yang sedang masuk.
  `POST /api/notifications/read` memakai `userId` yang sama pada klausa `UPDATE`, sehingga
  pengguna tidak bisa menandai notifikasi orang lain.
- Adapter notifikasi masih **mode simulasi**: data masuk ke database dan halaman `/notifikasi`.
  Titik sambung WA/SMS asli nanti cukup mengganti isi `src/lib/notifications.ts`.

### 2. Lonceng in-app dan log terpisah

- Lonceng di header menampilkan jumlah belum dibaca, membuka 8 kabar terbaru dalam `Modal`, dan
  menyediakan tautan ke halaman `/notifikasi` untuk log lengkap.
- Halaman notifikasi punya saringan "Hanya yang belum dibaca", tombol "Tandai semua dibaca",
  `Skeleton`, `EmptyState`, dan tautan ke laporan/izin terkait.
- Polling 20–30 detik dan muat ulang saat jendela kembali fokus. Tidak ada websocket agar demo
  tetap sederhana dan tahan jaringan buruk.

### 3. Cetak A4 yang tidak terpotong

- `@page` memakai ukuran **A4** dengan margin 12 mm.
- Yang disembunyikan saat cetak hanya `.app-header`, `nav`, `.print-hidden`, dan wadah toast —
  bukan semua `header`, karena dokumen izin memakai elemen `header` sendiri.
- Tabel bantuan di layar tetap menampilkan alasan perhitungan. Di kertas, kolom catatan
  disembunyikan agar dokumen ringkas dan muat **satu halaman**; alasan koreksi tetap dicetak pada
  catatan "Menggantikan izin".
- Izin koreksi mencantumkan nomor izin lama, nomor izin baru, dan alasan koreksi. Izin lama tetap
  tersimpan dan tidak berubah.
- Halaman izin tetap memakai token warna; warna dokumen diambil dari token `paper`, `ink`, dan
  `paper-border`.

### 4. Akses lintas perangkat lewat satu tunnel

- `npm run share` menjalankan `scripts/share.mjs` yang membuka **localtunnel** ke port web Vite.
- Vite mem-proxy `/api` ke server lokal, jadi satu alamat tunnel cukup untuk web dan API. Cookie
  sesi tetap bekerja karena dari sudut peramban semuanya same-origin.
- `server.allowedHosts` di Vite mengizinkan `.loca.lt`, `.trycloudflare.com`, dan
  `.ngrok-free.app` agar tidak muncul "Invalid Host header".
- Skrip memeriksa kesehatan web/API lebih dahulu, mencetak kata sandi halaman pengingat
  localtunnel, menutup tunnel dengan Ctrl+C, dan menyediakan petunjuk cloudflared/ngrok bila
  localtunnel diblokir.
- Localtunnel hanya dependensi pengembangan; build produksi tidak memuatnya.

### 5. Bundel peta dipisah

- Halaman yang memuat Leaflet dimuat dengan `React.lazy` + `Suspense`.
- Vite `manualChunks` memisahkan `leaflet`, `react-vendor`, `query`, dan `icons`.
- Hasil build: bundel awal turun dari sekitar 705 kB menjadi sekitar 213 kB; Leaflet menjadi
  potongan terpisah sekitar 155 kB yang baru diambil saat halaman peta dibuka.

## Konsekuensi

- Notifikasi bertambah banyak saat panel demo mengisi tiga contoh laporan; halaman log dirancang
  untuk itu dan bell hanya menampilkan 8 terbaru.
- Membaca notifikasi mengubah `readAt`, sehingga tabel ini **bukan** tabel append-only. Isi
  notifikasi tidak disunting; hanya status baca yang berubah.
- Menghapus laporan (reset demo) ikut menghapus notifikasi terkait lewat `onDelete: Cascade`.
- Dokumen cetak tidak lagi menampilkan kolom alasan perhitungan; alasan tetap tersedia di layar
  T3/L2 dan halaman lacak.
- Tunnel membutuhkan internet dan bergantung pada layanan pihak ketiga. Untuk demo luring, buka
  aplikasi langsung di komputer atau jaringan lokal.
- `verify:m5` memeriksa 40 hal, termasuk isolasi notifikasi, setiap perpindahan status, reset
  bersih, keberadaan berkas share/README/panduan, dan aturan cetak. Uji peramban memeriksa
  **23 halaman × 4 lebar = 92 kombinasi** dengan 0 gulir horizontal, 0 teks <16 px, 0 target
  <44 px, serta 0 kesalahan konsol/halaman.
