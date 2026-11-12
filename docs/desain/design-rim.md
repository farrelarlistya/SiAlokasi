# Panduan Desain — SiAlokasi "Rim"

> Sistem yang dipakai `apps/web` setelah redesign 10 November 2026. Sistem lama tetap ada di `design.md` sebagai arsip. Board acuan: `SiAlokasi-Redesign.figcraft` (halaman `00 · Sistem`, `01 · Alur inti`, `02 · Admin & masuk`, `03 · Status & ponsel`). Pratinjau PNG: `docs/desain/redesign/`.

## 1. Konsep

**Instrumen, bukan dasbor generik.** Kertas hitam hangat, tinta gading, garis rambut 1 px, sudut 0, satu sinyal oranye. Peta adalah pahlawan; angka adalah bukti. Tidak ada glow, gradien biru-ungu, kartu bertumpuk, atau pil status.

## 2. Token warna (`apps/web/src/styles/theme.css`)

| Token | Nilai | Pakai |
| :--- | :--- | :--- |
| `--color-canvas` | `#131110` | Latar aplikasi |
| `--color-surface` | `#1B1815` | Panel, lembar bawah |
| `--color-elevated` | `#211D19` | Baris terpilih, permukaan naik |
| `--color-sunken` | `#0C0A09` | Kolom isian |
| `--color-border` | `#3A3530` | Garis rambut |
| `--color-border-strong` | `#6A635A` | Tepi kontrol (≥3:1) |
| `--color-text` | `#F2EDE6` | Teks utama |
| `--color-text-muted` | `#AAA39A` | Label, keterangan |
| `--color-text-disabled` | `#77716A` | Nonaktif |
| `--color-primary` / `--color-accent` | `#F0763A` | Aksi utama, seleksi, garis radius |
| `--color-primary-ink` | `#1A1008` | Teks di atas oranye |
| `--color-primary-hover` | `#FF8A4F` | Hover aksi |
| `--color-info` | `#7CA6E0` | Sinyal kedua, tautan |
| `--color-danger` | `#E4572E` | Tolak, hapus |
| `--color-warning` | `#F0A53A` | Peringatan |
| `--color-paper` / `--color-ink` | `#F4EFE5` / `#1A1510` | Dokumen izin |
| peta | `#1B1815` darat, `#16212B` air, `#453F38` jalan, `#332E2A` batas | Tile OSM difilter gelap |

**Aturan:** tidak ada hex lepas di halaman; semua lewat token. Satu aksi oranye per layar. Status selalu teks + batang warna, bukan warna saja.

## 3. Tipografi

- Display/isi: **Plus Jakarta Sans** (500 untuk judul, 400 untuk isi). Tidak ada bold 700.
- Angka, waktu, koordinat, nomor izin: **Geist Mono** 400/500, tabular.
- Skala: **40/44** angka utama (mono), **32/40** judul halaman, **24/32** judul blok fokus, **20/28** judul section pendukung, **16/26** isi, **16/22** label dan mono.
- Tangga 32 → 24 → 20 → 16 dipakai di semua layar. Tidak ada judul 28 px, tidak ada dua judul 32 px dalam satu layar.
- Judul fokus tidak diwarnai oranye seluruhnya; aksen ada pada garis penanda 2 px, angka kunci, atau label status.
- Tidak ada teks < 16 px. Judul tanpa tagline di bawahnya.

## 4. Bentuk & jarak

- Radius **0** di semua komponen. `rounded-full` direset ke 0.
- Tanpa bayangan; kedalaman dari langkah kecerahan (`canvas` → `surface` → `elevated`).
- Jarak 4/8/12/16/24/32/48/64. Target sentuh ≥ 44×44 (ikon 44, tombol 44/48, filter 44).
- Satu garis rambut memisahkan bagian; bukan kartu berbingkai di dalam kartu.

## 5. Komponen

| Komponen | Aturan |
| :--- | :--- |
| `Button` | Primer oranye + teks `primary-ink`; sekunder transparan + `border-strong`; destruktif garis `danger`; tanpa ikon di label utama |
| `StatusChip` | Kotak 32 px, teks 16 px, batang kiri 2 px: netral (Baru), sky (Diperiksa/Disetujui), oranye (Menunggu), redup (Selesai/Dibatalkan), merah (Ditolak) |
| `Field` | Label di atas, input 48 px `sunken`, tepi `border-strong`, galat oranye di bawah kolom |
| `AppHeader` | Logo 32 px + wordmark 20 px; nav teks 16 px dengan garis aktif 2 px; pengguna = nama + peran, tanpa avatar bulat |
| `BottomNav` | Teks 16 px, garis aktif di atas, maksimal 4 tujuan |
| `StatCard` | Angka mono 40 px + label 16 px, garis atas, tanpa kotak/ikon-koin. `size="sm"` (20 px) untuk metrik pendukung agar tidak bersaing dengan angka fokus |
| `EmptyState` | Ikon garis 48 px, judul 20 px, satu aksi; satu lapis bingkai |
| `Modal`/`Toast` | Persegi, `border-strong`, tanpa blur/shadow; toast punya batang kiri |
| `PageHeader` | Judul 32/40; `brief` maksimal dua baris berisi fakta atau langkah tindakan; eyebrow hanya untuk identifier nyata (kode laporan) |
| `Section` | Tiga nada: `focus` (permukaan `surface`, garis kiri 2 px `primary`, padding 20–24, judul 24 + `tabIndex=-1`), `default` (garis atas, judul 20), `quiet` (judul 16 muted). `aria-labelledby` otomatis |
| `StepRail` | Tiga langkah, penanda kotak 8 px (bukan pil), status selesai/aktif/belum, teks 16 px; `aria-current="step"` |
| `focusSection(id)` | `scrollIntoView({ block: "nearest" })` + fokus judul; otomatis `auto` saat `prefers-reduced-motion` |

## 6. Peta

- OSM tile dengan filter `invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.65)`.
- Radius: isi oranye 13 %, garis oranye 2 px. Titik terpilih oranye; titik lain tinta.
- Kontrol zoom 44×44 persegi; atribusi OSM selalu terlihat.
- Panel bisa ditutup; peta dihitung ulang (`invalidateSize`).

## 7. Layar acuan

| Board | Isi |
| :--- | :--- |
| P1 | Beranda publik: panel 420 px + peta, ringkasan angka, status baris |
| T2 | Laporan baru: titik, radius, detail, draf, aksi bawah |
| T3 | Faktor & estimasi: 8 faktor + tabel 10 bantuan beralasan |
| L1 | Dasbor pimpinan: "Perlu keputusan" (angka 40 + laporan teratas), 3 metrik pendukung 20, peta, antrian |
| L2 | Tinjau rekomendasi: ringkasan, tabel yang bisa diubah, setujui/tolak |
| L3 | Izin distribusi: dokumen kertas A4 di kanvas gelap |
| P2 | Lacak: kode + timeline 4 langkah + peta |
| A1/A2 | Masuk & daftar: dua kolom, panel alur tiga langkah, akun demo, tanpa ilustrasi |
| D1–D7 | Admin: "Perlu tindakan", tabel fokus, stok, audit, panel demo |
| State | Kosong, memuat + toast, konfirmasi, kolom galat |
| P1p | Ponsel: peta 360 px + lembar bawah + nav teks |

## 8. Larangan

- Tidak ada gradien (termasuk ungu-biru), glow, aurora, atau blob.
- Tidak ada kartu di dalam kartu, ikon di atas judul dalam koin, atau pil status.
- Tidak ada huruf kapital berjarak untuk label; status dan tabel memakai sentence case.
- Tidak ada emoji, panah yang ditempel ke teks tautan, atau titik status dekoratif.
- Tidak ada `window.alert/confirm/prompt`.
- Tidak ada efek React Bits di luar Beranda; setelah redesign, Beranda pun tidak memakainya.
- Tidak ada dua blok besar yang bersaing dalam satu layar; hanya satu blok fokus per keadaan.
- Tidak ada fakta yang diulang di blok fokus dan metrik pendukung (mis. jumlah menunggu tidak muncul dua kali).

## 9. Hierarki & fokus per layar

Setiap layar menetapkan **satu Blok Fokus** yang berubah mengikuti keadaan:

| Layar | Keadaan | Blok fokus |
| :--- | :--- | :--- |
| P1 Beranda | kosong / ada daftar | Daftar kejadian |
| P1 Beranda | baris dipilih | Rincian kejadian + "Lacak laporan ini" |
| T2 Buat laporan | langkah 1 | Titik & wilayah; detail menjadi section 20 |
| T3 Faktor | belum dihitung | Delapan faktor lapangan |
| T3 Faktor | hasil tersedia | Estimasi bantuan (angka 40 + tabel); faktor turun ke section 20 |
| T4 Ajukan | langkah 3 | Bantuan yang diajukan |
| L1 Dasbor pimpinan | antrian ada | "Perlu keputusan": jumlah 40, laporan teratas, aksi Tinjau |
| L1 Dasbor pimpinan | antrian kosong | Empty state ringkas + "Lihat peta kejadian" |
| L2 Tinjau | menunggu keputusan | Tabel rekomendasi + bilah keputusan selalu terlihat (posko + Batalkan/Tolak/Setujui; alasan tolak di dialog) |
| L3 Izin | izin terbit | Pita nomor izin + status 24, lalu dokumen kertas |
| P2 Lacak | sebelum mencari | Kolom kode lacak |
| P2 Lacak | hasil ditemukan | Status + timeline + nomor lacak mono |
| A1/A2 | — | Formulir; panel merek 24 dan tenang |
| D1 Dasbor admin | — | "Perlu tindakan": pendaftar menunggu + stok menipis |
| D2–D7 | — | Tabel/fokus data; filter 20; satu aksi primer |
| D6 Panel demo | — | Waktu layanan 40; reset aksi destruktif sekunder |

Aturan interaksi:

- Perpindahan fokus hanya dipicu keadaan yang disengaja (pilih baris, pindah langkah, selesai menghitung), bukan setiap render.
- Judul fokus punya `tabIndex={-1}`; `focusSection(id)` menggeser layar dan memindahkan fokus ke judul.
- Fokus memakai tiga sinyal: ukuran judul (24), ruang 20–24, dan garis aksen 2 px + permukaan `surface`.
- Satu aksi primer per layar. Aksi lain sekunder atau tersier.
- Di ponsel, blok fokus tampil pertama di dalam panel/lembar; filter P1 dilipat dan ringkasan dipindah ke dalam gulungan.

## 10. Checklist portabel untuk layar baru

- [ ] Tulis satu kalimat: "Fokus layar ini adalah …".
- [ ] Tentukan satu aksi primer; aksi lain sekunder.
- [ ] Gunakan tangga tipe 32 → 24 → 20 → 16.
- [ ] Beri fokus tiga sinyal: ukuran, ruang, penanda aksen.
- [ ] Tentukan matriks keadaan: kosong, memuat, galat, terpilih, langkah, hasil.
- [ ] Pastikan satu fakta tidak muncul di dua blok.
- [ ] Uji 5 detik, squint test, dan keyboard sebelum lanjut ke layar berikutnya.
- [ ] Jangan mengulang tujuan navigasi di area judul.
