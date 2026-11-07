# Panduan Desain — SiAlokasi

> Acuan tunggal untuk tampilan. Semua warna **wajib** memakai token di `@theme`; tidak boleh ada nilai hex lepas di halaman. Semua keputusan di sini sudah dikunci pada Sesi 1 (`D1`).

## 1. Konsep Visual

**"Ruang kendali yang tenang."** Aplikasi dipakai saat tekanan tinggi, jadi tampilan harus terasa seperti instrumen, bukan seperti situs berita.

Tiga prinsip:
1. **Peta adalah pahlawan** — kanvas peta terang mendominasi; panel gelap mengapung dan tidak menutupi titik penting.
2. **Satu aksi utama per layar** — setiap panel punya tepat satu tombol biru yang paling menonjol.
3. **Status selalu terbaca** — chip berwarna + teks, bukan warna saja.

Referensi pemilik: tangkapan layar GIS gelap dengan panel kiri mengapung, kanvas peta krem, aksen biru, sudut membulat 16 px, dan tombol utama biru di kanan atas panel.

## 2. Token Warna

### 2.1 Permukaan & Teks

| Token | Hex | Pemakaian | Catatan kontras |
| :--- | :--- | :--- | :--- |
| `--color-canvas` | `#0B0D11` | Latar aplikasi | — |
| `--color-surface` | `#14171D` | Panel, kartu utama | Teks `#F5F7FA` ≈ 15:1 |
| `--color-elevated` | `#1B1F27` | Kartu di dalam panel | — |
| `--color-hover` | `#232833` | Hover baris/tombol sekunder | — |
| `--color-border` | `#2A2F3A` | Garis pemisah, outline | — |
| `--color-text` | `#F5F7FA` | Teks utama | ≈ 15:1 di `surface` |
| `--color-text-muted` | `#A8B0BD` | Teks pendukung | ≈ 7,4:1 di `surface` |
| `--color-text-disabled` | `#6E7683` | Nonaktif | Hanya untuk label nonaktif |

### 2.2 Aksen & Status

| Token | Hex | Pemakaian | Catatan kontras |
| :--- | :--- | :--- | :--- |
| `--color-accent` | `#3B82F6` | Garis radius, ikon aktif, indikator fokus | Grafik, bukan latar teks |
| `--color-primary` | `#2563EB` | **Latar tombol utama** | Teks putih ≈ 5,5:1 |
| `--color-primary-hover` | `#1D4ED8` | Hover tombol utama | ≈ 6,5:1 |
| `--color-danger` | `#EF4444` | Tolak, batal, error | Teks putih ≈ 4,6:1 |
| `--color-warning` | `#F59E0B` | Menunggu persetujuan | Teks gelap di atas kuning |
| `--color-success` | `#10B981` | Disetujui, selesai | Teks gelap di atas hijau |
| `--color-info` | `#60A5FA` | Petunjuk, tautan | ≈ 5,9:1 di `surface` |
| `--color-violet` | `#A78BFA` | Status "Sudah diperiksa" | ≈ 7,1:1 di `surface` |

> **Aturan tombol:** latar tombol utama memakai `--color-primary` (`#2563EB`), bukan `--color-accent`. Aksen biru terang hanya untuk garis, ikon, dan fokus agar kontras teks tetap lolos 4,5:1.

### 2.3 Palet Peta (kanvas terang)

| Elemen | Hex |
| :--- | :--- |
| Latar daratan | `#F3EEDD` |
| Area terbangun | `#EDE6D2` |
| Taman / ruang terbuka | `#DDE8C8` |
| Air | `#CFE3EA` |
| Jalan utama | `#FFFFFF` dengan garis tepi `#D8CFB4` |
| Batas kecamatan | `#C9BF9F` putus-putus 2 px |
| Marker kejadian | `#EF4444` |
| Lingkaran radius | isi `rgba(59,130,246,0.16)`, garis `#3B82F6` 2 px |
| Marker posko | `#10B981` |

## 3. Tipografi

| Peran | Font | Ukuran / tinggi baris | Berat |
| :--- | :--- | :--- | :--- |
| Judul besar (angka dasbor) | Plus Jakarta Sans | 40 / 48 px | 700 |
| Judul halaman | Plus Jakarta Sans | 28 / 36 px | 700 |
| Judul panel | Plus Jakarta Sans | 22 / 30 px | 600 |
| Isi | Plus Jakarta Sans | **16 / 26 px** | 400 |
| Label form | Plus Jakarta Sans | **16 / 22 px** | 500 |
| Keterangan kecil | Plus Jakarta Sans | **16 / 22 px** | 400 |
| Kode izin / kode lacak | IBM Plex Mono | **16 / 22 px** | 500 |

**Aturan mutlak:** tidak ada teks di bawah **16 px**. Jika terasa terlalu besar, kurangi jumlah teks — jangan perkecil font.

Font dimuat lokal (`woff2`) agar tampilan tidak berubah saat internet lemah.

## 4. Bentuk, Jarak, & Bayangan

| Token | Nilai | Pemakaian |
| :--- | :--- | :--- |
| `--radius-sm` | 8 px | Chip, tombol kecil |
| `--radius-md` | 12 px | Field, kartu dalam panel |
| `--radius-lg` | 16 px | Panel mengapung, modal |
| `--radius-full` | 999 px | Tombol bulat peta |
| `--space-1..8` | 4, 8, 12, 16, 24, 32, 48, 64 px | Jarak |
| `--shadow-panel` | `0 24px 64px rgba(0,0,0,0.45)` | Panel mengapung |
| `--shadow-card` | `0 1px 0 rgba(255,255,255,0.04)` | Kartu dalam panel |

## 5. Tata Letak

### 5.1 Desktop (≥1280 px)
- **Peta penuh layar** sebagai lapisan dasar.
- **Panel kiri** 400 px, mengapung 24 px dari tepi, tinggi mengikuti isi (maks. `calc(100vh - 48px)`), bisa digulir di dalam.
- **Header** mengapung di kanan atas peta: nama pengguna, peran, tombol keluar.
- **Kontrol peta** (zoom, layer, reset tampilan) di kanan bawah, tombol bulat 44 px.

### 5.2 Tablet (768–1279 px)
- Panel kiri 360 px; peta tetap terlihat ≥ 50% lebar.
- Tabel bantuan berubah menjadi kartu bertumpuk.

### 5.3 Ponsel (<768 px)
- Peta penuh layar; panel menjadi **bottom sheet** dengan tinggi 45% / 85% (bisa ditarik).
- Navigasi peran di bawah (`BottomNav`), maksimal 4 tujuan, ikon + label 16 px.
- Form satu kolom; tombol aksi menempel di bawah sheet.

## 6. Komponen Wajib

| Komponen | Aturan |
| :--- | :--- |
| `Modal` / `ConfirmDialog` / `PromptDialog` | Latar `surface`, radius 16, fokus terperangkap, `Esc` menutup, fokus kembali ke pemicu. Tombol destruktif di kanan dengan `danger`. |
| `Toast` | Muncul kanan atas, `aria-live="polite"`, tutup otomatis 5 detik, maksimal 3 tumpuk, ada tombol tutup 44 px. |
| `Skeleton` | Bentuk mengikuti konten asli (kartu, baris tabel, panel peta). Animasi *shimmer* halus 1,6 detik, hormati `prefers-reduced-motion`. |
| `EmptyState` | Ikon 48 px, judul 22 px, penjelasan 2 baris, satu tombol jalan keluar. Contoh: "Belum ada laporan di wilayah ini." |
| `Field` | Label di atas, wajib ditandai `*`, pesan error **tepat di bawah kolom** dengan ikon, `aria-describedby`, tinggi input 48 px. |
| `AppHeader` + `BottomNav` | Header menampilkan peran & nama; navigasi hanya berisi menu yang boleh diakses peran tersebut. |

### 6.1 Komponen Pendukung
- **Chip status**: `BARU` biru, `DIPERIKSA` ungu, `MENUNGGU_PERSETUJUAN` kuning, `DISETUJUI` hijau, `SELESAI` hijau tua, `DITOLAK` merah, `DIBATALKAN` abu. Teks selalu menyertai warna.
- **Kartu metrik**: angka 40 px + label 16 px + tren kecil.
- **Tabel bantuan**: kolom Jenis, Satuan, Jumlah, Alasan. Baris bisa diubah hanya oleh Pimpinan; sel yang diubah diberi penanda dan wajib alasan.
- **Slider radius**: nilai angka + satuan selalu terlihat, langkah 100 m, rentang 100 m–5 km.

## 7. Perilaku Peta

1. Pusat awal: **Kota Surabaya**, zoom 12, tanpa rotasi.
2. Klik peta = pindahkan marker kejadian; marker bisa digeser.
3. Lingkaran radius diperbarui langsung saat slider/angka berubah.
4. Popup marker: judul, status chip, waktu, tombol "Lihat detail" 44 px.
5. Jika lebih dari 30 marker, gunakan pengelompokan (cluster) dengan angka.
6. Tile gagal dimuat → tampilkan latar `#F3EEDD` + batas kecamatan dari data lokal + pita peringatan "Peta sedang memuat terbatas".
7. Atribusi OpenStreetMap selalu terlihat di kanan bawah (kewajiban lisensi).

## 8. State & Pesan

| State | Perilaku |
| :--- | :--- |
| Memuat | `Skeleton` sesuai bentuk konten; tidak ada teks "Loading..." |
| Kosong | `EmptyState` dengan satu aksi jelas |
| Gagal | Kalimat manusia + langkah lanjutan + tombol "Coba lagi" |
| Berhasil | `Toast` singkat, mis. "Laporan tersimpan." |
| Aksi berbahaya | `ConfirmDialog` dengan konsekuensi tertulis |

Contoh pesan gagal: **"Laporan belum bisa dikirim karena koneksi terputus. Draf sudah tersimpan di perangkat ini — tekan Kirim lagi saat sinyal kembali."**

## 9. Gerak (Motion)

- Durasi 150–200 ms, easing `cubic-bezier(0.2, 0, 0, 1)`.
- Panel masuk: geser 12 px + fade.
- Tidak ada animasi yang berulang tanpa henti kecuali indikator memuat.
- Hormati `prefers-reduced-motion`.

## 10. Ikonografi

- Set ikon: **Lucide** (garis 1,5 px, sudut membulat).
- Ikon jenis bantuan: turunan Lucide yang disesuaikan, disimpan sebagai SVG di `apps/web/src/assets/icons/aid/`.
- Ukuran ikon: 20 px di dalam teks, 24 px di tombol, 48 px di `EmptyState`.
- Warna ikon mengikuti `currentColor`.

## 11. Daftar Periksa Aksesibilitas

- [ ] Semua teks ≥16 px.
- [ ] Semua target sentuh ≥44×44 px, jarak antar target ≥8 px.
- [ ] Kontras teks ≥4,5:1 (diuji dengan alat pemeriksa).
- [ ] Fokus keyboard terlihat (cincin 2 px `--color-info`, offset 2 px).
- [ ] `Esc` menutup modal; fokus kembali ke pemicu.
- [ ] Semua input punya label nyata (bukan hanya placeholder).
- [ ] Status tidak disampaikan lewat warna saja.
- [ ] `aria-live="polite"` pada `Toast`.
- [ ] Peta punya alternatif teks: daftar kejadian selalu tersedia di samping peta.

## 12. Rancangan Layar Inti (acuan FigCraft)

### 12.1 `P1` — Beranda Publik
- Peta penuh layar (Surabaya), marker kejadian.
- Panel kiri: judul "Kejadian Aktif", filter jenis bencana & kecamatan, daftar kartu (judul, kecamatan, status chip, waktu relatif).
- `EmptyState`: "Belum ada laporan kejadian. Wilayah Surabaya saat ini aman."
- Header kanan atas: tombol "Masuk" (sekunder) + "Lacak laporan" (utama).

### 12.2 `T2` — Buat Laporan (Petugas)
- Panel kiri 400 px, tiga bagian: **Lokasi**, **Detail**, **Wilayah terdampak**.
- Langkah ditandai 1-2-3 di atas panel; progres terlihat.
- Slider radius dengan nilai besar (contoh "1,2 km").
- Tombol utama "Lanjut ke faktor" di bawah panel.
- Pita kecil "Draf tersimpan 10:42" di atas tombol.

### 12.3 `T3` — Faktor & Estimasi
- Panel kiri: 8 field dikelompokkan (Dampak, Kondisi lapangan).
- Setelah dihitung: tabel 10 bantuan di panel yang melebar (maks. 520 px), tiap baris punya ikon, jumlah besar, dan alasan satu baris.
- Tombol utama "Ajukan ke pimpinan".

### 12.4 `L1` — Dasbor Pimpinan
- Tiga kartu metrik di atas panel: laporan menunggu, jiwa terdampak, izin terbit hari ini.
- Daftar antrian dengan chip status & waktu masuk.
- Peta dengan radius laporan terpilih disorot (opacity penuh), laporan lain redup.

### 12.5 `L2` — Tinjau Rekomendasi
- Panel kiri: ringkasan laporan + peta mini + tabel bantuan yang bisa diubah.
- Setiap perubahan memunculkan kolom "Alasan perubahan" (wajib).
- Dua tombol: "Tolak" (garis, danger) dan "Setujui & terbitkan izin" (utama).

### 12.6 `L3` — Izin Distribusi
- Dokumen putih di atas kanvas gelap, lebar 720 px.
- Header: logo teks "SiAlokasi", nomor izin (mono), tanggal.
- Isi: tujuan posko, daftar bantuan, total, tanda tangan pimpinan (nama + waktu).
- Tombol "Cetak" di luar dokumen.

### 12.7 `P2` — Lacak Status (Tamu)
- Kartu kiri 560 px: judul, input kode lacak (mono), tombol "Lacak".
- Hasil: chip status, judul laporan, waktu, lalu **timeline 4 langkah** dengan titik berwarna.
- Peta kanan 760 px menyorot radius laporan tersebut.
- Catatan "Data pribadi pelapor tidak ditampilkan."

### 12.8 Papan State & Dialog
Menampilkan empat perilaku wajib dalam satu papan:
- `EmptyState` — ikon, judul, penjelasan, satu tombol jalan keluar.
- `Skeleton` — bentuk mengikuti konten asli, plus `Toast` sukses.
- `ConfirmDialog` — aksi berbahaya dengan dua tombol.
- `Field` error — garis merah + pesan tepat di bawah kolom.

> **Berkas desain:** semua board di atas tersedia di `SiAlokasi.figcraft` pada halaman `01 · Fondasi & Layar Inti` (Fondasi, P1, T2, T3, L1, L2, L3, P2, State & Dialog).

## 13. Larangan

- Tidak ada gradien pelangi, glassmorphism berlebihan, atau bayangan ganda.
- Tidak ada warna status yang dipakai sebagai latar teks panjang.
- Tidak ada ikon tanpa label pada navigasi utama.
- Tidak ada teks di bawah 16 px, termasuk di dalam peta dan tabel.
- Tidak ada dialog bawaan browser.
