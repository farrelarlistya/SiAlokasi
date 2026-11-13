# Panduan Demo 5 Menit — SiAlokasi

Panduan ini dipakai saat memperlihatkan SiAlokasi kepada pimpinan, penguji, atau kelompok
demo. Semua langkah dimulai dari **0 transaksi** agar alur terlihat utuh.

---

## 1. Persiapan (5 menit sebelum tampil)

1. Nyalakan PostgreSQL dan aplikasi:

   ```bash
   npm run db:start
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

2. Buka <http://localhost:5173/dev>, masuk sebagai **Admin**, lalu tekan
   **Reset transaksi & waktu demo**. Setelah reset, masuk lagi.
3. Pastikan panel demo menunjukkan **0 laporan**, **0 izin**, dan **0 notifikasi**.
4. Siapkan tiga tab peramban:
   - Tab 1: <http://localhost:5173/> (peta publik).
   - Tab 2: <http://localhost:5173/masuk> (akun petugas).
   - Tab 3: <http://localhost:5173/masuk> (akun pimpinan).
5. Siapkan satu jendela cetak (Ctrl+P) untuk memperlihatkan hasil izin A4.
6. Bila demo dari HP/laptop lain, jalankan `npm run share` di terminal kedua dan buka alamat
   tunnel yang tercetak.

**Akun demo** (kata sandi selalu `Sialokasi#2026` saat `DEMO_MODE=true`):

| Peran | Email | Kata sandi | Nama di layar |
| :--- | :--- | :--- | :--- |
| Petugas | `petugas@sialokasi.demo` | `Sialokasi#2026` | Rina Kusuma |
| Pimpinan | `pimpinan@sialokasi.demo` | `Sialokasi#2026` | Budi Santoso |
| Admin | `admin@sialokasi.demo` | `Sialokasi#2026` | Sari Wulandari |

---

## 2. Alur Demo 5 Menit

### Menit 0:00 — Peta publik dari kondisi nol

1. Buka tab peta publik.
2. Tunjukkan peta Kota Surabaya dan pesan bahwa **belum ada laporan**.
3. Jelaskan singkat: laporan lapangan, perhitungan bantuan, dan keputusan pimpinan ada di satu
   tempat.

### Menit 0:30 — Petugas membuat laporan

1. Masuk sebagai **Petugas** di tab kedua.
2. Tekan **Buat laporan**.
3. Isi contoh:
   - Judul: **Banjir di Wonokromo RW 03**
   - Jenis bencana: **Banjir**
   - Titik: klik di sekitar Wonokromo, lalu geser bila perlu.
   - Radius: **1.200 meter**.
   - Kecamatan: **Wonokromo**.
4. Tekan **Simpan laporan**. Tunjukkan **kode lacak** yang muncul dan lonceng notifikasi.

### Menit 1:15 — Isi faktor lapangan dan hitung estimasi

1. Isi faktor contoh:
   - Jiwa terdampak: **420**
   - Kerusakan rumah: **Rusak berat**
   - Bayi: **12**, Lansia: **20**, Ibu hamil: **4**, Difabel: **6**
   - Lama penanganan: **3 hari**
   - Akses jalan: **Terbatas**
   - Cuaca: **Hujan**
   - Kepadatan penduduk: **Tinggi**
2. Tekan **Hitung estimasi**.
3. Tunjukkan tabel 10 jenis bantuan dan **alasan tiap baris**, misalnya “Tiap 100 jiwa butuh
   300 liter air”. Tekankan bahwa angkanya bisa dijelaskan, bukan kotak hitam.

### Menit 2:00 — Ajukan dan buka lonceng pimpinan

1. Tekan **Ajukan ke pimpinan** lalu konfirmasi.
2. Pindah ke tab **Pimpinan**. Tunjukkan:
   - Laporan baru di **antrian keputusan**.
   - **Lonceng notifikasi** berisi “Laporan menunggu keputusan”.
   - Peta dan ringkasan jiwa terdampak.

### Menit 2:30 — Pimpinan meninjau dan menyetujui

1. Buka laporan dari antrian.
2. Tunjukkan faktor lapangan, tabel bantuan, stok posko tujuan, dan peta radius.
3. Ubah satu jumlah bantuan, misalnya air bersih, lalu isi alasan perubahan.
4. Pilih posko tujuan **Posko Balai Kota**.
5. Tekan **Setujui** lalu konfirmasi.
6. Tunjukkan **izin distribusi bernomor** (contoh `IZN-20261109-001`) dan status berubah menjadi
   **Disetujui**.
7. Tekan **Cetak**. Perlihatkan pratinjau A4: menu aplikasi hilang, nomor izin, posko, daftar
   bantuan, dan tanda tangan penerbit tetap ada.

### Menit 3:30 — Tamu melacak status

1. Buka tab peta publik atau halaman **Lacak**.
2. Masukkan kode lacak laporan tadi.
3. Tunjukkan timeline status dan ringkasan bantuan **tanpa nama, email, atau telepon pelapor**.

### Menit 4:00 — Rekap, stok, dan jejak keputusan

1. Masuk sebagai **Pimpinan** atau **Admin**.
2. Buka **Rekap laporan** sebentar, tunjukkan angka per kecamatan dan tombol unduh CSV.
3. Buka **Ringkasan stok** dan **Jurnal stok**; tunjukkan stok berkurang saat izin terbit dan
   setiap perubahan punya catatan.
4. Masuk sebagai **Admin**, buka **Audit & riwayat perubahan**; tunjukkan pelaku, waktu, dan
   nilai sebelum → sesudah.

### Menit 4:40 — Tutup dengan panel demo

1. Buka <http://localhost:5173/dev> sebagai **Admin**.
2. Tunjukkan **3 contoh laporan** (menunggu, disetujui, selesai) untuk memperlihatkan peta dan
   antrian yang sudah terisi.
3. Tekan **Reset transaksi & waktu demo** untuk kelompok demo berikutnya. Semua kembali ke
   **0 laporan, 0 izin, 0 notifikasi**.

---

## 3. Alur Tambahan (bila waktu masih ada)

### Koreksi izin setelah disetujui

1. Buka izin yang sudah terbit.
2. Tekan **Koreksi izin**.
3. Ubah jumlah atau posko, lalu isi alasan koreksi.
4. Tekan **Simpan koreksi**. Izin lama ditandai **digantikan**, izin baru terbit, stok posko
   disesuaikan otomatis, dan halaman lacak memakai izin terbaru.
5. Cetak izin baru; dokumen mencantumkan nomor izin yang digantikan.

### Membatalkan laporan

1. Sebagai petugas, buka laporan yang masih **Baru** atau **Sudah diperiksa**.
2. Tekan **Batalkan laporan** dan isi alasan.
3. Tunjukkan laporan hilang dari antrian pimpinan, tetapi alasannya tetap tersimpan di riwayat.

---

## 4. Demo dari Perangkat Lain

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run share
```

Buka alamat tunnel di HP. Bila muncul halaman pengingat localtunnel, masukkan kata sandi yang
tercetak di terminal. Tampilan sudah diuji pada lebar **360, 768, 1366, dan 1920 px**.

---

## 5. Bila Ada Gangguan

| Gejala | Langkah |
| :--- | :--- |
| Halaman tidak terbuka | Pastikan `npm run dev` masih menyala dan PostgreSQL hidup (`npm run db:status`). |
| Peta kosong | Tunggu beberapa detik; bila internet lemah, peta memakai area Surabaya dari cadangan. |
| Kata sandi ditolak | Jalankan `npm run db:seed` agar kata sandi demo kembali `Sialokasi#2026`. |
| Data demo bercampur | Buka `/dev` sebagai Admin, lalu **Reset transaksi & waktu demo**. |
| Cetak terpotong | Pilih ukuran **A4**, margin **Default**, dan matikan “Headers and footers”. |
| Tunnel gagal | Pakai `cloudflared tunnel --url http://localhost:5173` atau `ngrok http 5173`. |

---

## 6. Setelah Demo

1. Jalankan `npm run demo:reset` atau tekan reset di `/dev`.
2. Tutup tunnel dengan **Ctrl+C**.
3. Hentikan aplikasi dengan **Ctrl+C** di terminal `npm run dev`.
4. Bila perlu, hentikan database dengan `npm run db:stop`.

Bukti pengujian M5 dan tangkapan layar ada di [`docs/bukti/m5.md`](bukti/m5.md) dan
[`docs/bukti/m5/`](bukti/m5/).
