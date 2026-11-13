# ADR-0011 — Hierarki & fokus section

Tanggal: 10 November 2026
Status: diterima, diimplementasikan di `apps/web`
Acuan: `docs/rencana-hierarki-fokus.md`, `docs/desain/design-rim.md` §3–§10

## Konteks

Setelah redesign "Rim", semua halaman sudah memakai token, radius, dan palet yang sama, tetapi
setiap bagian terasa setara. Judul halaman 28 px, judul section 20–22 px, dan isi 16 px hanya
berjarak sedikit; semua judul berwarna sama; setiap section diberi ruang yang sama; dan tidak ada
satu aksi yang jelas. Akibatnya pengguna harus menebak tujuan halaman, bagian yang harus dibaca
lebih dulu, dan tindakan berikutnya.

Rencana `docs/rencana-hierarki-fokus.md` meminta satu blok fokus per layar yang berubah sesuai
keadaan, dengan tiga sinyal sekaligus: ukuran judul, ruang, dan penanda aksen.

## Keputusan

1. **Tangga tipe baru.** Judul halaman 32/40, judul fokus 24/32, judul section 20/28, isi 16/26,
   angka utama mono 40/44. Tidak ada judul 28 px dan tidak ada dua judul 32 px dalam satu layar.
   Utility baru di `theme.css`: `.text-page`, `.text-focus`, `.text-section`, `.text-figure`,
   `.focus-rule`.
2. **Komponen `Section`.** Tiga nada: `focus` (permukaan `surface`, garis kiri 2 px `primary`,
   padding 20–24, judul 24 + `tabIndex={-1}`), `default` (garis atas, judul 20), dan `quiet`
   (judul 16 muted). `aria-labelledby` dibuat otomatis; tidak ada kartu di dalam kartu.
3. **`PageHeader` dengan `brief`.** Judul 32/40 dan maksimal dua baris fakta/langkah tindakan.
   Tagline dekoratif tetap dilarang.
4. **`StepRail`.** Tiga langkah dengan penanda kotak 8 px, status selesai/aktif/belum, teks 16 px,
   dan `aria-current="step"`. Dipakai di T2, T3, dan T4.
5. **`lib/focus.ts`.** `focusSection(id)` menggeser layar (`block: "nearest"`) lalu memfokuskan
   judul fokus. Gerak halus otomatis menjadi `auto` saat `prefers-reduced-motion`.
6. **Satu fokus per keadaan.** Matriks lengkap ada di `design-rim.md` §9:
   - P1: daftar saat kosong/awal, rincian saat baris dipilih.
   - T2: titik & wilayah adalah langkah aktif; detail turun ke section 20.
   - T3: faktor saat belum dihitung, hasil estimasi setelah dihitung; faktor turun ke section 20.
   - T4: bantuan yang diajukan.
   - L1: "Perlu keputusan" dengan angka 40 dan laporan teratas; angka menunggu dihapus dari
     deretan metrik agar tidak tampil dua kali.
   - L2: tabel rekomendasi + bilah keputusan `fixed` di atas navigasi bawah.
   - L3: pita nomor izin/status 24 di atas dokumen kertas; "Tandai distribusi selesai" menjadi
     satu-satunya aksi primer.
   - P2: kolom kode sebelum mencari, status + timeline setelah ditemukan.
   - A1/A2: formulir menjadi blok fokus; panel merek diturunkan ke 24.
   - D1: "Perlu tindakan" (pendaftar menunggu + stok menipis); metrik lain menjadi 20.
   - D2–D7: tabel menjadi fokus dengan judul 24 + jumlah mono; filter menjadi section 20.
   - D6: waktu layanan 40 menjadi fokus; reset menjadi aksi destruktif sekunder.
7. **Bilah keputusan L2.** `position: fixed` di atas `BottomNav` (bukan sticky flow) agar selalu
   terlihat tanpa menggulir. Isian alasan penolakan dipindah ke dialog `Tolak` supaya bilah di
   ponsel tetap ringkas: posko tujuan + tiga aksi (Batalkan/Tolak/Setujui).
8. **Ponsel.** Filter P1 dilipat menjadi disclosure; ringkasan P1 dipindah ke dalam area gulir;
   wordmark dan blok nama pengguna disembunyikan di bawah `sm` agar header tidak bertumpuk.
   Blok fokus tetap tampil pertama di dalam panel.
9. **API ringkasan admin.** `GET /api/admin/summary` menambahkan `lowStockCount` (aditif) untuk
   blok "Perlu tindakan" D1. Perhitungannya sama dengan ringkasan pimpinan.

## Konsekuensi

- Semua layar inti dan admin berubah susunannya; halaman yang tidak disebut dalam rencana tetap
  mewarisi tangga tipe baru dan `PageHeader`.
- Angka "menunggu keputusan" tidak lagi muncul di deretan metrik L1.
- Header ponsel tidak lagi menampilkan wordmark dan nama pengguna; peran tetap terlihat di
  dasbor masing-masing dan menu bawah.
- Bukti: 38 tangkapan layar di `docs/bukti/hierarki-fokus/`, `hasil-uji.json` (240 pemeriksaan),
  audit tampilan (0 FAIL, 1 WARN F3 yang disengaja). Pemeriksaan keyboard mencakup skip link,
  perpindahan fokus ke judul, dan Escape menutup dialog. Pemeriksaan render otomatis tidak berjalan karena
  `puppeteer-core` tidak tersedia; tangkapan dilakukan lewat Chrome DevTools Protocol.
- `npm run build` dan `npm test` (91/91) lulus; `verify:m2` 49/49 dan `verify:m4` 99/99 lulus.
- Pratinjau: `npm run dev`.
