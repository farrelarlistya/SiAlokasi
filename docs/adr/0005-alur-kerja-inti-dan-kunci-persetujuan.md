# ADR 0005 — Alur Kerja Inti, Kunci Persetujuan, dan Izin Distribusi

- **Tanggal:** 2026-11-08
- **Status:** Diterima
- **Konteks tahap:** Sesi 4 (`M3` — Alur Kerja Utama)

## Konteks

M3 harus menyambungkan laporan lapangan sampai izin distribusi terbit. Ada empat risiko yang tidak boleh dibiarkan:

1. Laporan yang sudah diajukan masih bisa diubah petugas.
2. Dua klik "Setujui" menghasilkan dua izin atau dua keputusan.
3. Nomor izin bentrok saat dua laporan disetujui bersamaan.
4. Halaman lacak publik membocorkan identitas pelapor atau catatan internal.

Selain itu, estimasi bantuan harus bisa dijelaskan, deterministik, dan tetap wajar untuk kejadian kecil maupun besar.

## Keputusan

### 1. Draf laporan dan penguncian isi

- Laporan dibuat lebih dahulu dengan judul, jenis bencana, waktu, titik, radius, dan kecamatan. Delapan faktor disimpan menyusul.
- Kolom faktor di `incidents` dibuat **nullable** sampai petugas menekan "Hitung estimasi".
- Status `BARU` berarti draf; status `DIPERIKSA` baru diberikan setelah estimasi tersimpan.
- Petugas masih boleh menghitung ulang selama status `BARU` atau `DIPERIKSA`.
- Setelah `MENUNGGU_PERSETUJUAN`, seluruh isi laporan dikunci di server. Permintaan menyunting atau menghitung ulang dijawab `409` dengan pesan manusia.

### 2. Model estimasi memprediksi faktor penyesuaian

- Model **tidak** memprediksi angka absolut. Model memprediksi **faktor penyesuaian** di atas rumus dasar per jenis bantuan.
- Rumus dasar memakai `standardPerPerson` dari data master, lama penanganan, jumlah bayi, jumlah lansia, atau jumlah ibu hamil sesuai jenis bantuannya.
- Fitur regresi: tingkat kerusakan, akses jalan, cuaca, dan kepadatan penduduk.
- Model dilatih offline oleh `tools/train-model/train.mjs` dari data sintetis deterministik; keluarannya `packages/shared/src/ml/model.json` dengan versi `sialokasi-ridge-1.1.0`.
- Hasil selalu bilangan bulat, dijepit pada batas minimum/maksimum per item, dan deterministik.
- Jenis bantuan baru yang dibuat admin memakai rumus cadangan berbasis `standardPerPerson` sampai model dilatih ulang.
- Versi perhitungan disimpan di `recommendations.modelVersion`; layar menampilkan label ramah "Versi 1.1", bukan nama teknis model.

### 3. Kunci persetujuan ganda

- Setiap operasi yang mengubah status laporan memakai **transaksi database** dan **advisory lock per laporan** (`pg_advisory_xact_lock(hashtext(id))`).
- Di dalam transaksi, status dibaca ulang lalu diperiksa. Persetujuan hanya boleh dari `MENUNGGU_PERSETUJUAN`.
- Tabel `decisions` diberi **unique constraint** pada `recommendationId`, sehingga satu perhitungan hanya bisa punya satu keputusan.
- Permintaan persetujuan kedua dijawab `409` dan tidak membuat izin baru.

### 4. Nomor izin dan salinan daftar bantuan

- Nomor izin memakai format **`IZN-YYYYMMDD-XXX`** berdasarkan tanggal Jakarta dari `ClockService`.
- Pembuatan nomor memakai advisory lock global `sialokasi-permit-number`, lalu mengambil nomor urut tertinggi pada tanggal tersebut dan menambah satu.
- Masa berlaku izin **7 hari** sejak diterbitkan.
- Tabel baru **`permit_items`** menyimpan salinan nama, satuan, jumlah final, dan alasan saat izin terbit. Dokumen izin lama tidak bergantung pada rekomendasi yang mungkin berubah pada M4.

### 5. Kode lacak

- Format kode lacak adalah **`SIA-` diikuti 5 karakter** dari alfabet yang menghilangkan `I`, `O`, `0`, dan `1` agar mudah dibacakan.
- Panjang total 9 karakter. PRD §4.3 dan pola validasi yang sudah ada memakai `SIA-XXXXX`; angka "8 karakter" di `NFR-12` adalah salah hitung dan tidak mengubah pola yang sudah disepakati.
- Kode dibuat dengan sumber acak kriptografis di server, lalu dicek unik ke database sebelum disimpan.
- Halaman lacak publik hanya menampilkan status, timeline, ringkasan bantuan **setelah izin terbit**, nomor izin, dan posko tujuan. Nama, email, nomor telepon pelapor, dan catatan internal tidak pernah dikirim.

### 6. Stok pada M3

- M3 hanya **membandingkan** kebutuhan izin dengan stok posko dan menampilkan peringatan "kurang".
- Persetujuan tetap bisa dilakukan walaupun stok kurang, sesuai PRD §8.2. Pimpinan dapat memilih posko lain.
- Pengurangan stok, jurnal append-only, dan invariant `Stock.qty >= 0` tetap dijadwalkan M4.
- Stok air bersih dan makanan siap saji pada seed dinaikkan agar kejadian contoh 420 jiwa / 3 hari bisa dipenuhi dari satu posko. Data master lain tidak berubah.

## Konsekuensi

**Positif**
- Status laporan dan izin tidak bisa dobel meskipun tombol diklik bersamaan.
- Dokumen izin tetap utuh meskipun data rekomendasi berubah pada tahap koreksi.
- Estimasi tetap masuk akal untuk 1 jiwa maupun 50.000 jiwa karena memakai rumus dasar.
- Halaman lacak aman dibagikan ke publik.

**Negatif / batasan**
- Model hanya mempelajari penyesuaian dari empat faktor kategori; hubungan yang sangat tidak linear tidak tertangkap.
- Advisory lock menahan transaksi lain pada laporan yang sama; untuk demo jumlahnya kecil.
- Stok belum berkurang saat izin terbit; ini disengaja agar M4 bisa membangun ledger dan uji konkurensi dengan benar.

**Mitigasi**
- Batas minimum/maksimum dan unit test menjaga angka tetap wajar.
- `verify-m3` menguji persetujuan ganda, penguncian laporan, nomor izin unik, dan kebersihan data pribadi.
- M4 akan menambahkan pengurangan stok dalam transaksi, trigger append-only, dan uji dua pengurangan bersamaan.

## Alternatif yang Ditolak

| Alternatif | Alasan ditolak |
| :--- | :--- |
| Mengunci hanya di antarmuka | Bisa dilewati dengan panggilan API langsung |
| Mengandalkan unique constraint saja | Pesan kesalahan database tidak ramah dan transaksi bisa setengah jadi |
| Nomor izin dari ID berurutan | Membocorkan jumlah laporan dan mudah ditebak |
| Menyimpan daftar izin hanya lewat rekomendasi | Dokumen lama bisa berubah saat koreksi M4 |
| Mengurangi stok saat persetujuan di M3 | Belum ada ledger/constraint stok; berisiko stok minus tanpa pengujian konkurensi |
| Kode lacak dari `Math.random()` | Tidak cukup acak untuk kode publik |
