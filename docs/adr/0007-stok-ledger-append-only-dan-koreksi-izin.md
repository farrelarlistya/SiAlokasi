# ADR 0007 — Stok, Jurnal Append-Only, dan Koreksi Izin

**Tanggal:** 2026-11-09
**Status:** Diterima
**Tahap:** `M4` — Kasus Khusus, Rekap, Admin, & Demo
**Terkait:** `FR-19`, `FR-20`, `FR-21`, `FR-22`, `FR-23`, `NFR-02`, `NFR-03`, `NFR-04`

## Konteks

Sampai M3, stok hanya dibandingkan dan ditampilkan sebagai peringatan. Persetujuan tetap bisa
terbit walau stok posko tidak cukup, sehingga aturan `Stock.qty >= 0` belum benar-benar dijaga.
Riwayat status dan audit juga baru dijaga di lapisan aplikasi; belum ada constraint database yang
menolak perubahan baris lama. M4 harus menutup celah ini tanpa menghilangkan alur demo yang sudah
berjalan.

## Keputusan

### 1. Stok diambil saat izin terbit, secara atomik

- Persetujuan pimpinan membuat `Permit` dan 10 baris `PermitItem` di dalam satu transaksi, lalu
  memanggil `reserveStock`.
- Setiap baris memakai satu pernyataan atomik:

  ```sql
  UPDATE stocks SET qty = qty - :jumlah
  WHERE poskoId = :posko AND aidItemId = :item AND qty >= :jumlah
  RETURNING qty;
  ```

- Bila tidak ada baris yang kembali, transaksi dibatalkan dengan `409` dan pesan menyebut posko,
  jenis bantuan, stok tersedia, dan jumlah yang dibutuhkan.
- Database juga memiliki `CHECK (qty >= 0)` sebagai pertahanan terakhir. Dua persetujuan
  bersamaan tidak bisa membuat stok minus karena satu `UPDATE` kalah bersyarat.
- Baris dengan jumlah 0 tidak ditulis ke jurnal karena tidak mengubah stok.

### 2. Jurnal stok append-only

- Tabel `stock_movements` mencatat `qtyDelta`, `balanceAfter`, jenis (`RESERVE`/`RELEASE`),
  izin terkait, pelaku, catatan, dan waktu.
- Trigger `stock_movements_append_only` menolak `UPDATE` dan `DELETE`. Reset demo boleh menghapus
  dengan setelan transaksi `sialokasi.allow_purge = 'on'`.
- Halaman stok menampilkan sisa stok dan 30 baris jurnal terakhir, sehingga angka bisa ditelusuri.

### 3. Koreksi izin, bukan menyunting izin lama

- Koreksi hanya untuk laporan `DISETUJUI` atau `SELESAI`.
- Dalam satu transaksi:
  1. stok izin lama dikembalikan (`RELEASE`),
  2. nomor izin baru diambil dengan kunci global,
  3. izin baru dibuat dengan `replacesNumber`,
  4. stok izin baru diambil (`RESERVE`),
  5. izin lama menjadi `DIBATALKAN`, diberi `supersededAt` dan `supersededByNumber`,
  6. `incident_corrections` menyimpan alasan, pelaku, dan daftar perubahan jumlah.
- Bila laporan sudah `SELESAI`, status dibuka kembali ke `DISETUJUI` agar distribusi hasil koreksi
  bisa ditandai selesai lagi. Perpindahan ini dicatat di `IncidentLog`.
- `permit_items` tetap menjadi salinan beku. Dokumen lama tidak pernah berubah; hanya status dan
  penanda penggantinya yang diisi.

### 4. Append-only untuk audit dan riwayat status

- Trigger database menolak `UPDATE` dan `DELETE` pada `audit_logs`, `incident_logs`, dan
  `stock_movements`.
- Aplikasi tidak menyediakan endpoint ubah/hapus untuk ketiga tabel tersebut.
- Reset demo memakai setelan transaksi khusus agar `demo:reset` tetap bisa membersihkan data tanpa
  melemahkan aturan append-only untuk pemakaian normal.

### 5. Pembatalan

- Petugas dapat membatalkan laporan miliknya selama berstatus `BARU` atau `DIPERIKSA`.
- Pimpinan dapat membatalkan laporan berstatus `MENUNGGU_PERSETUJUAN`, dengan alasan wajib.
- Laporan yang sudah disetujui tidak dibatalkan; perbaikannya lewat koreksi izin.

### 6. Rekap dan panel demo

- Rekap dihitung dari laporan yang tercatat, dikelompokkan per kecamatan, jenis bencana, atau
  bulan. Izin yang sudah digantikan koreksi tidak dihitung dua kali.
- CSV memakai pemisah koma, BOM UTF-8, dan CRLF agar angka serta huruf Indonesia tampil benar di
  Excel.
- Panel `/dev` hanya untuk admin. Reset memakai `seedDatabase` yang sama dengan `demo:reset`;
  pengisian contoh membuat tiga laporan dengan status berbeda dan memakai jalur stok yang sama
  dengan alur asli.

## Konsekuensi

- Persetujuan bisa gagal (`409`) bila stok kurang. UI L2 menonaktifkan tombol setujui saat
  kekurangan terdeteksi agar keputusan tidak sia-sia.
- Izin lama tetap ada di database dan halaman lacak selalu memakai izin terbaru.
- `demo:reset` menghapus sesi, sehingga pengguna harus masuk lagi setelah reset dari `/dev`.
- Tabel `stock_movements` dan `incident_corrections` menambah dua entitas baru pada skema M1–M3.
- Pengujian `verify:m4` membuktikan 99 pemeriksaan, termasuk dua persetujuan bersamaan, trigger
  append-only, kecocokan rekap/CSV, dan reset di bawah 30 detik.
