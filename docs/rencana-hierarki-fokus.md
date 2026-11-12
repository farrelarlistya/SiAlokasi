# Rencana Revisi — Hierarki & Fokus Section

Status: **selesai dieksekusi 2026-11-10** — bukti `docs/bukti/hierarki-fokus/`, ADR `docs/adr/0011-hierarki-fokus.md`
Berlaku untuk: SiAlokasi dan proyek berikutnya
Acuan sistem: `docs/desain/design-rim.md`

## 1. Masalah yang diselesaikan

Halaman sudah rapi, tetapi semua bagian terasa setara. Akibatnya pengguna harus menebak:

- apa tujuan halaman ini,
- bagian mana yang harus dibaca lebih dulu,
- tindakan apa yang paling masuk akal sekarang.

Penyebab yang terlihat di kode saat ini:

1. **Skala tipe terlalu rapat.** Judul halaman 28 px, judul bagian 20–22 px, isi 16 px. Selisihnya kecil, jadi mata tidak punya tangga yang jelas.
2. **Semua judul berwarna sama.** Aksen oranye hanya dipakai tombol dan garis aktif; judul bagian tidak punya penanda visual.
3. **Semua section punya bobot ruang yang sama.** Tidak ada bagian yang sengaja diberi ruang dua kali lebih besar.
4. **Fokus tidak berubah mengikuti keadaan.** Saat data kosong, sedang memuat, ada baris terpilih, atau hasil sudah dihitung, bagian yang seharusnya menonjol tetap sama.
5. **Tujuan halaman tidak pernah ditulis.** Pengguna harus menyimpulkan sendiri dari judul dan isi.
6. **Aksi tersebar.** Beberapa layar punya beberapa tombol setara, sehingga tidak ada satu langkah berikutnya yang jelas.

Tujuan revisi: **setiap layar punya satu bagian yang menonjol, yang berubah sesuai keadaan, dan langsung menjawab "saya sedang di halaman apa dan harus melakukan apa".**

## 2. Prinsip: Satu Layar, Satu Fokus

1. Setiap layar menetapkan **satu Blok Fokus**.
2. Blok fokus ditentukan per **keadaan**, bukan sekali untuk selamanya:
   - kosong → fokus pada cara mengisi,
   - terpilih → fokus pada rincian pilihan,
   - langkah 1/2/3 → fokus pada langkah aktif,
   - hasil tersedia → fokus pada hasil,
   - antrian ada → fokus pada antrian, bukan peta.
3. Fokus memakai **tiga sinyal sekaligus**, bukan warna saja:
   - ukuran judul lebih besar (24 px, atau angka 40 px),
   - ruang dua kali lebih besar dari section biasa,
   - penanda aksen 2 px + permukaan naik satu langkah (`surface`).
4. Hanya ada **satu aksi primer** per layar. Aksi lain sekunder atau tersier.
5. Section lain tetap ada, tetapi lebih tenang: judul 20 px, teks muted, garis rambut.
6. Di ponsel, blok fokus tampil pertama dan tidak tenggelam di bawah lipatan.

## 3. Skala tipe baru

| Peran | Ukuran / tinggi | Berat | Warna | Pemakaian |
| :--- | :--- | :--- | :--- | :--- |
| Angka utama | 40 / 44, mono | 500 | `text` | Satu angka penting per layar (jumlah menunggu, total bantuan) |
| Judul halaman | 32 / 40 | 500 | `text` | Satu per layar |
| Judul fokus | 24 / 32 | 500 | `text` + garis aksen 2 px | Blok fokus |
| Judul section | 20 / 28 | 500 | `text-2` | Section pendukung |
| Isi | 16 / 26 | 400 | `text-2` / `text-muted` | Paragraf, baris tabel |
| Label | 16 / 22 | 500 | `text-muted` | Label kolom, meta |
| Mono data | 16 / 22 | 400 | `text` / `muted` | Kode, waktu, koordinat |

Aturan:

- Jangan ada dua judul 32 px dalam satu layar.
- Judul fokus **tidak** diwarnai oranye seluruhnya; aksen cukup pada garis penanda, angka kunci, atau label status.
- Judul section pendukung memakai `text-2` (bukan `muted` penuh) agar tetap terbaca, tetapi tidak bersaing.
- Teks tetap minimal 16 px. Tidak ada teks 14 px untuk “membuat muat”.

## 4. Resep Blok Fokus

```
[Judul halaman 32]
[Brief 16 muted, maksimal 2 baris]

┃  ← garis aksen 2 px
┃  Judul fokus 24
┃  Isi / angka 40 / tabel
┃  [ Aksi primer ]  [ aksi sekunder ]
┃
──────────────────────────────  ← garis rambut
Section pendukung 20
Section pendukung 20
```

Komponen `FocusSection`:

- `tone="focus"`: `bg-surface`, padding 24–32, garis kiri 2 px `primary`, judul 24, satu aksi primer.
- `tone="default"`: transparan, `border-t`, judul 20.
- `tone="quiet"`: judul 16, teks muted, tanpa aksi.
- Tidak boleh berupa kartu di dalam kartu. Fokus dibentuk oleh permukaan + garis + ruang, bukan bingkai baru.
- Di layar 900 px, blok fokus harus terlihat tanpa menggulir.

## 5. Komponen & token yang ditambahkan

1. `apps/web/src/components/Section.tsx`
   - props: `tone`, `title`, `brief`, `actions`, `headingId`, `children`.
   - memakai `aria-labelledby` otomatis.
2. `apps/web/src/components/PageHeader.tsx`
   - judul 32/40.
   - props baru `brief` (maks. 2 baris, kalimat tindakan/fakta, bukan tagline).
3. `apps/web/src/components/StepRail.tsx`
   - 3 langkah, status `selesai / aktif / belum`.
   - penanda kotak 8 px + teks 16 px; bukan pil.
4. `apps/web/src/lib/focus.ts`
   - `focusSection(id)` → `scrollIntoView({ block: "nearest" })` + fokus judul (`tabIndex=-1`).
   - menghormati `prefers-reduced-motion`.
5. Utility di `theme.css`
   - `.text-page`, `.text-focus`, `.text-section`, `.focus-rule`.
   - tidak menambah warna baru.

## 6. Revisi per layar

### P1 — Beranda publik
- **Fokus awal:** daftar kejadian (judul 24 + jumlah).
- **Saat baris dipilih:** rincian kejadian menjadi blok fokus (judul 24, kode lacak mono, aksi "Lacak laporan ini").
- Peta tetap pahlawan visual, tetapi bukan section yang bersaing dengan panel.
- Brief: "Pilih kejadian di peta atau daftar untuk melihat rinciannya."
- Ringkasan 3 angka di bawah menjadi section pendukung (20 px), bukan tiga angka besar setara.

### T2 — Buat laporan
- Fokus = **langkah aktif**. Tambah `StepRail` di atas panel.
- "Titik & wilayah" menjadi fokus 24 + garis aksen; "Detail laporan" turun ke 20 dan muted.
- Aksi bawah tetap satu primer "Simpan & lanjut".
- Saat pindah langkah, fokus otomatis pindah ke judul langkah baru (tanpa mencuri fokus saat mengetik).
- Brief: "Tentukan titik dan radius, lalu lanjut ke faktor."

### T3 — Faktor & estimasi
- Sebelum menghitung: fokus = **8 faktor** (24 + aksen).
- Setelah menghitung: fokus berpindah ke **hasil estimasi**; angka total 40 mono, tabel bantuan menjadi isi fokus; faktor turun ke section 20.
- Lokasi & dampak menjadi section pendukung.
- Brief berubah sesuai keadaan:
  - "Isi 8 faktor, lalu hitung estimasi."
  - "Periksa hasil, lalu ajukan ke pimpinan."

### L1 — Dasbor pimpinan
- Blok fokus baru: **Perlu keputusan** — jumlah menunggu (40 mono), judul laporan teratas, aksi "Tinjau".
- Angka "menunggu keputusan" **dipindahkan** ke blok ini; jangan tampil dua kali di deretan metrik.
- Metrik lain menjadi section 20 di bawah; peta dan antrian penuh menjadi pendukung.
- Bila antrian kosong: fokus berpindah ke peta dengan ajakan "Lihat peta kejadian"; blok "Perlu keputusan" berubah menjadi empty state ringkas, bukan kotak besar.
- Brief: "Tinjau laporan yang menunggu keputusan."

### L2 — Tinjau rekomendasi
- Fokus = **tabel rekomendasi + keputusan**.
- Judul "Rekomendasi bantuan" 24 + garis aksen; tabel mendapat permukaan `surface`.
- Baris keputusan (Tolak / Setujui) menjadi **bilah lengket** di bawah; selalu terlihat tanpa menggulir.
- Lokasi & dampak, riwayat, dan faktor menjadi section 20.
- Brief: "Periksa jumlah bantuan, lalu setujui atau tolak."

### L3 — Izin distribusi
- Fokus = dokumen izin (sudah kuat karena kertas terang di kanvas gelap).
- Tambahkan pita status 24 px di atas dokumen: nomor izin + status + aksi berikutnya.
- Aksi Cetak/Koreksi tetap sekunder; "Tandai distribusi selesai" satu-satunya primer.
- Brief: "Periksa dokumen, lalu cetak atau tandai selesai."

### P2 — Lacak laporan
- Sebelum mencari: fokus = kolom kode lacak (24 + aksen).
- Setelah hasil ditemukan: fokus berpindah ke **status + judul laporan** (32), timeline 4 langkah, nomor lacak mono.
- Peta menjadi pendukung; jangan ada dua blok besar bersaing.
- Brief: "Masukkan kode lacak untuk melihat status."

### A1 / A2 — Masuk & daftar
- Fokus = formulir. Panel merek di kiri tetap tenang.
- Judul 32; brief tindakan ("Gunakan email dinas yang terdaftar.").
- Tidak ada section lain yang perlu ditonjolkan.

### D1 — Dasbor admin
- Blok fokus baru: **Perlu tindakan** — pendaftar menunggu aktivasi dan stok menipis (angka 40 mono).
- Dua metrik tersebut dipindahkan dari deretan 6 angka; sisanya menjadi section 20.
- Pintasan dan aktivitas menjadi quiet section.
- Brief: "Selesaikan antrian aktivasi dan stok menipis."

### D2–D7 — Halaman tabel admin
- Judul 32 + brief satu baris tujuan halaman.
- Tabel = fokus: judul tabel 24 + jumlah baris mono di kanan; header tabel tetap 16 muted.
- Filter menjadi section pendukung 20; aksi "Tambah …" tetap satu primer.
- D6 Panel demo: blok fokus = waktu layanan (angka 40 mono); reset menjadi aksi destruktif sekunder, bukan kartu merah besar.
- D7 Audit: fokus = tab aktif + tabel catatan; filter pendukung.

### Ponsel
- Blok fokus tampil pertama; metrik pendukung disembunyikan atau dipindah ke bawah.
- Lembar bawah P1: judul fokus 24, ringkasan angka hanya muncul saat ada data.
- Tidak ada perubahan navigasi bawah.

## 7. Interaksi & aksesibilitas

- Perpindahan fokus hanya dipicu oleh **perubahan keadaan yang disengaja** (pilih baris, pindah langkah, selesai menghitung), bukan setiap render.
- Judul blok fokus memakai `tabIndex={-1}` agar bisa difokuskan tanpa masuk urutan Tab.
- `scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" })`.
- `aria-labelledby` pada setiap section; status hasil memakai `role="status"`.
- Urutan Tab: judul halaman → skip link "Lewati ke bagian utama" → isi fokus → aksi.
- Semua target sentuh tetap ≥44×44 px.
- Tidak ada animasi yang menghalangi; hormati `prefers-reduced-motion`.

## 8. Batasan yang dijaga

- Tidak mengubah palet, font, radius, atau komponen dasar yang sudah disukai.
- Tidak menambah aksen baru; oranye tetap satu-satunya sinyal aksi.
- Tidak ada eyebrow, tagline, atau kalimat dekoratif di bawah judul. `brief` hanya berisi fakta atau langkah tindakan, maksimal 12 kata.
- Tidak ada kartu di dalam kartu, bayangan, atau gradien.
- Tidak ada duplikasi fakta: angka yang sudah menjadi fokus tidak diulang di metrik lain.
- Tidak ada navigasi tujuan yang diulang di area judul (aturan yang sudah dipakai).
- Teks tidak turun di bawah 16 px.

## 9. Cara membuktikan berhasil

1. **Uji 5 detik.** Tunjukkan tiap layar 1440 px dan 375 px selama 5 detik. Tanyakan: "Halaman ini untuk apa, dan saya harus apa?" Jawaban harus sesuai blok fokus.
2. **Squint test.** Blur tangkapan layar; blok fokus harus tetap paling menonjol.
3. **Hitung.** Satu judul 32, satu judul fokus 24, section 20, satu tombol primer.
4. **Uji keadaan.** Kosong, memuat, galat, terpilih, langkah 1/2/3, hasil ada — pastikan fokus berpindah sesuai tabel keadaan.
5. **Keyboard.** Tab dari awal; fokus berpindah ke judul section setelah aksi; Escape menutup dialog.
6. **Build & lint.** `npm run build`, `npm test`, `sloplint --scope app --render` → 0 FAIL.
7. **Bukti.** Simpan tangkapan di `docs/bukti/hierarki-fokus/` dan perbarui `design-rim.md` + ADR.

## 10. Urutan eksekusi (sesi baru)

**Sesi A — Fondasi + 2 layar pilot**
- Token teks & utility.
- `Section`, `PageHeader` (brief), `StepRail`, `focusSection`.
- P1 dan T2 sebagai pilot.
- Bukti: screenshot + uji 5 detik.

**Sesi B — Alur inti**
- T3, L1, L2, L3, P2.
- Bilah keputusan lengket di L2.
- Bukti: screenshot + uji keadaan.

**Sesi C — Akun & admin**
- A1, A2, D1–D7.
- Blok "Perlu tindakan" di D1; tabel fokus di D2–D7.
- Bukti: screenshot desktop + ponsel.

**Sesi D — Audit & dokumentasi**
- Uji 5 detik semua layar, squint test, keyboard.
- sloplint, build, test.
- Perbarui `design-rim.md`, ADR baru `docs/adr/0011-hierarki-fokus.md`, papan sprint.

Setiap sesi diakhiri dengan commit terpisah agar mudah dibandingkan.

## 11. Checklist portabel untuk proyek berikutnya

Tempel di PRD atau catatan desain sebelum membuat layar:

- [ ] Tulis satu kalimat: **"Fokus layar ini adalah …"**
- [ ] Tentukan satu aksi primer; aksi lain sekunder.
- [ ] Gunakan tangga tipe 32 → 24 → 20 → 16, bukan 28 → 20 → 16.
- [ ] Beri fokus tiga sinyal: ukuran, ruang, penanda warna.
- [ ] Tentukan matriks keadaan: kosong, memuat, galat, terpilih, langkah, hasil — bagian mana yang menjadi fokus.
- [ ] Pastikan satu fakta tidak muncul di dua blok.
- [ ] Uji 5 detik dan squint test sebelum lanjut ke layar berikutnya.
- [ ] Jangan mengulang tujuan navigasi di area judul.

## 12. Berkas yang akan disentuh

- `apps/web/src/styles/theme.css`
- `apps/web/src/components/Section.tsx` (baru)
- `apps/web/src/components/PageHeader.tsx`
- `apps/web/src/components/StepRail.tsx` (baru)
- `apps/web/src/lib/focus.ts` (baru)
- `apps/web/src/pages/HomePage.tsx`
- `apps/web/src/pages/petugas/CreateIncidentPage.tsx`
- `apps/web/src/pages/petugas/IncidentFactorsPage.tsx`
- `apps/web/src/pages/pimpinan/PimpinanDashboardPage.tsx`
- `apps/web/src/pages/pimpinan/PimpinanReviewPage.tsx`
- `apps/web/src/pages/pimpinan/PermitPage.tsx`
- `apps/web/src/pages/public/TrackingPage.tsx`
- `apps/web/src/pages/auth/*`
- `apps/web/src/pages/admin/*`
- `docs/desain/design-rim.md`
- `docs/adr/0011-hierarki-fokus.md` (baru)
- `docs/bukti/hierarki-fokus/`

## 13. Hasil eksekusi (2026-11-10)

- Sesi A–D dieksekusi: fondasi, P1/T2, T3/L1/L2/L3/P2/T4, A1/A2, D1–D7.
- 38 tangkapan layar 1440×1000 dan 390×844 di `docs/bukti/hierarki-fokus/`.
- `hasil-uji.json`: **240/240 pemeriksaan lulus** (overflow, teks < 16 px, target < 44 px,
  jumlah `<h1>`, jumlah blok fokus, fokus P1, bilah keputusan L2, dialog penolakan, skip link,
  Escape).
- `npm run build`, `npm test` (91/91), `verify:m2` (49/49), `verify:m4` (99/99) lulus.
- `sloplint --scope app --render`: **0 FAIL, 1 WARN F3** (disengaja). Render tier tidak berjalan
  karena `puppeteer-core` tidak tersedia; tangkapan memakai Chrome DevTools Protocol.
- Penyimpangan kecil: ringkasan angka P1 di ponsel dipindah ke dalam gulungan (bukan menghilang),
  dan header ponsel menyembunyikan wordmark/nama pengguna agar tidak bertumpuk.
- ADR: `docs/adr/0011-hierarki-fokus.md`. Panduan: `docs/desain/design-rim.md` §3–§10.
