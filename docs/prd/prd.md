# PRD — SiAlokasi

| Atribut | Isi |
| :--- | :--- |
| Versi | 1.0 |
| Tanggal | 7 November 2026 |
| Pemilik | Farras (pemilik proyek) |
| Tahap | Sesi 1 — Perencanaan & Desain (`D1`) |
| Dokumen terkait | `docs/rencana-sprint.md`, `docs/desain/design.md`, `docs/adr/` |

---

## 1. Ringkasan Proyek & Batas Lingkup

### 1.1 Masalah
Saat bencana, laporan dari lapangan masuk lewat pesan singkat dan telepon. Data tidak seragam, lokasi tidak presisi, dan jumlah bantuan dihitung manual oleh orang yang berbeda-beda. Akibatnya:
- Keputusan alokasi lambat karena pimpinan harus menanyakan ulang detail.
- Jumlah bantuan bergantung pada taksiran orang, sehingga rawan bias dan dobel.
- Tidak ada jejak keputusan yang bisa dipertanggungjawabkan setelah bencana berlalu.

### 1.2 Solusi
SiAlokasi menyatukan tiga hal dalam satu aplikasi web:
1. **Peta kerja (WebGIS)** — petugas menandai titik kejadian dan menggambar radius wilayah terdampak.
2. **Perhitungan otomatis** — model estimasi lokal mengubah 8 faktor lapangan menjadi daftar 10 jenis bantuan beserta jumlah dan alasannya.
3. **Ruang keputusan** — pimpinan meninjau di peta, menyesuaikan jumlah, menyetujui, lalu izin distribusi bernomor terbit otomatis.

### 1.3 Nilai yang Diuji Saat Demo
- Dari laporan lapangan sampai izin distribusi terbit **tanpa berpindah aplikasi**.
- Setiap angka bantuan **bisa dijelaskan** (bukan kotak hitam).
- Semua keputusan meninggalkan **jejak yang tidak bisa dihapus diam-diam**.

### 1.4 Batas Lingkup (Non-Goals)
| Tidak dibuat | Alasan |
| :--- | :--- |
| Integrasi WhatsApp/SMS asli | Cukup adapter simulasi; menghindari biaya & kredensial |
| Pelacakan armada/relawan real-time | Di luar alur inti; menambah beban peta |
| Aplikasi mobile native | Web responsif sudah cukup untuk petugas |
| Manajemen stok gudang penuh | Hanya ringkasan stok per posko |
| Pembayaran/donasi online | Fokus pada alokasi logistik, bukan penggalangan dana |
| Multi-bahasa | Bahasa Indonesia saja |
| PostGIS | Jarak dihitung di kode; tidak perlu ekstensi database |

---

## 2. Persona Pengguna Utama & Kamus Bahasa

### 2.1 Persona Utama — Rina, 28
| Aspek | Detail |
| :--- | :--- |
| Peran | Petugas BPBD Kota Surabaya |
| Perangkat | Laptop/tablet di posko, HP di lokasi |
| Konteks | Input cepat, sering di bawah tekanan, jaringannya tidak selalu stabil |
| Tujuan | Laporan terkirim benar pada percobaan pertama, tanpa mengulang isian |
| Ketakutan | Laporan gagal terkirim, titik salah, data dobel sehingga bantuan salah sasaran |
| Kebutuhan desain | Langkah form jelas, simpan otomatis sebagai draf, peta tetap terbaca saat tile lambat, tombol ≥44 px |

**Persona pendukung:** Pak Budi (48, Pimpinan) — butuh gambaran peta & antrian dalam satu layar. Sari (31, Admin) — butuh pengelolaan data yang aman dari salah hapus.

### 2.2 Kamus Bahasa
| Istilah teknis | Yang tampil di layar |
| :--- | :--- |
| Incident / event | Laporan kejadian |
| Radius buffer | Wilayah terdampak (radius) |
| Prediction / inference | Estimasi bantuan |
| Model ML / regresi | Perhitungan otomatis |
| Approve / reject | Setujui / Tolak |
| Permit | Izin distribusi |
| Stock / inventory | Stok bantuan |
| Tracking code | Kode lacak |
| Error 500 / exception | "Data belum bisa disimpan. Coba lagi sebentar, atau hubungi admin." |

---

## 3. Matriks Peran, Hak Akses, & Akun Demo

| Kemampuan | Tamu | Petugas | Pimpinan | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Lihat peta kejadian aktif & daftar laporan publik | ✅ | ✅ | ✅ | ✅ |
| Lacak status lewat kode lacak | ✅ | ✅ | ✅ | ✅ |
| Buat & sunting laporan `BARU` | — | ✅ | — | — |
| Isi 8 faktor & hitung estimasi | — | ✅ | — | — |
| Ajukan laporan ke pimpinan | — | ✅ | — | — |
| Lihat seluruh antrian & dasbor | — | — | ✅ | — |
| Sesuaikan jumlah bantuan (dengan alasan) | — | — | ✅ | — |
| Setujui / tolak laporan | — | — | ✅ | — |
| Terbitkan izin distribusi | — | — | ✅ | — |
| Tandai distribusi selesai | — | — | ✅ | — |
| Kelola akun & peran | — | — | — | ✅ |
| Kelola jenis bantuan, wilayah, posko | — | — | — | ✅ |
| Lihat ringkasan stok per posko | — | — | ✅ | ✅ |
| Panel kontrol demo `/dev` | — | — | — | ✅ |

**Akun demo (`DEMO_MODE=true`, kode masuk selalu `123456`):**

| Peran | Email | Nama tampilan |
| :--- | :--- | :--- |
| Petugas | `petugas@sialokasi.demo` | Rina Kusuma |
| Pimpinan | `pimpinan@sialokasi.demo` | Budi Santoso |
| Admin | `admin@sialokasi.demo` | Sari Wulandari |

Pendaftaran mandiri hanya untuk peran **Petugas** dan harus diaktifkan Admin. Pimpinan dan Admin dibuat lewat seed.

---

## 4. Kebutuhan Fungsional (`FR`)

> Setiap `FR` wajib punya tahap, pelaku, dan cara pembuktian. Tidak ada kebutuhan tanpa tahap.

### 4.1 M1 — Pondasi, UI Matang, Seed Bersih

| Kode | Kebutuhan | Pelaku | Cara membuktikan |
| :--- | :--- | :--- | :--- |
| `FR-01` | Monorepo `apps/web`, `apps/api`, `packages/shared` berjalan; tipe & skema Zod dipakai bersama | Dev | `npm run build` sukses; mengubah satu tipe di `shared` memicu error TypeScript di web & api |
| `FR-02` | Token warna Tailwind `@theme` + 6 komponen dasar: `Modal`/`ConfirmDialog`, `Toast`, `Skeleton`, `EmptyState`, `Field`, `AppHeader`/`BottomNav` | Dev | Halaman contoh `/ui` menampilkan semua komponen; tidak ada teks <16 px; tombol ≥44 px |
| `FR-03` | Seed bersih: 10 jenis bantuan, 8 kecamatan, 3 posko, 3 akun demo, **0 laporan** | Admin | `npm run db:seed` lalu hitung baris tabel laporan = 0 |
| `FR-04` | `ClockService` + reset demo | Admin | Ubah waktu +72 jam lewat `/dev`, waktu di UI ikut berubah; reset mengembalikan 0 transaksi |

### 4.2 M2 — Akun Semua Peran & Data Master

| Kode | Kebutuhan | Pelaku | Cara membuktikan |
| :--- | :--- | :--- | :--- |
| `FR-05` | Masuk dengan email + kode OTP; `123456` selalu diterima saat `DEMO_MODE=true` | Semua | Ketiga akun berhasil masuk dan diarahkan ke halaman sesuai peran |
| `FR-06` | Pendaftaran akun Petugas + aktivasi oleh Admin | Petugas, Admin | Daftar → status "menunggu" → admin aktifkan → bisa masuk |
| `FR-07` | Kelola akun & peran (ubah peran, nonaktifkan) | Admin | Peran berubah langsung membatasi menu & API; akun sendiri tidak bisa dinonaktifkan |
| `FR-08` | CRUD jenis bantuan: nama, satuan, ikon SVG, standar per jiwa | Admin | Nonaktifkan item → item hilang dari form baru tetapi tetap muncul di laporan lama |
| `FR-09` | CRUD wilayah (kecamatan) & posko, dengan pemilih koordinat di peta | Admin | Posko baru muncul di peta & pilihan tujuan izin |
| `FR-10` | Peta publik + filter jenis bencana & kecamatan | Tamu | Tanpa login bisa melihat kejadian aktif; filter mengubah marker & daftar |

### 4.3 M3 — Alur Kerja Inti

| Kode | Kebutuhan | Pelaku | Cara membuktikan |
| :--- | :--- | :--- | :--- |
| `FR-11` | Buat laporan: judul, jenis bencana, waktu, titik (klik/geser) + radius 100 m–5 km | Petugas | Marker & lingkaran tampil; radius berubah dengan slider & angka |
| `FR-12` | Isi 8 faktor dengan validasi rentang | Petugas | Faktor kosong menghalangi perhitungan; pesan error di bawah kolom yang salah |
| `FR-13` | Hitung estimasi 10 jenis bantuan + alasan tiap baris + versi model | Sistem | Hasil sama untuk input yang sama; alasan tampil dalam bahasa manusia |
| `FR-14` | Ajukan laporan ke pimpinan | Petugas | Status → `MENUNGGU_PERSETUJUAN`; form terkunci; muncul di antrian pimpinan |
| `FR-15` | Dasbor pimpinan: peta, antrian, ringkasan (jumlah laporan, jiwa, bantuan) | Pimpinan | Angka ringkasan cocok dengan data antrian |
| `FR-16` | Sesuaikan jumlah bantuan dengan alasan wajib | Pimpinan | Perubahan tercatat (sebelum → sesudah, alasan, pelaku) |
| `FR-17` | Setujui / tolak + terbitkan izin bernomor | Pimpinan | Setujui → nomor izin unik & status `DISETUJUI`; tolak wajib alasan |
| `FR-18` | Lacak status publik dengan kode lacak | Tamu | Kode `SIA-XXXXX` menampilkan timeline & ringkasan bantuan tanpa data pribadi |

### 4.4 M4 — Kasus Khusus, Laporan, Admin, Demo

| Kode | Kebutuhan | Pelaku | Cara membuktikan |
| :--- | :--- | :--- | :--- |
| `FR-19` | Batalkan laporan & ajukan koreksi setelah disetujui | Petugas, Pimpinan | Batal sebelum persetujuan; setelah disetujui hanya bisa koreksi lewat catatan baru |
| `FR-20` | Riwayat perubahan & audit log untuk setiap entitas penting | Admin | Setiap aksi menampilkan pelaku, waktu, dan nilai sebelum→sesudah |
| `FR-21` | Ringkasan stok bantuan per posko (read-only) | Pimpinan, Admin | Stok tidak pernah negatif; angka cocok dengan data seed |
| `FR-22` | Panel `/dev`: majukan waktu, reset transaksi, isi 3 contoh laporan | Admin | Reset < 30 detik; contoh laporan mengisi peta & antrian |
| `FR-23` | Rekap laporan per kecamatan/jenis/bulan + ekspor CSV | Pimpinan | Angka rekap cocok dengan daftar laporan |

### 4.5 M5 — Siap Pamer

| Kode | Kebutuhan | Pelaku | Cara membuktikan |
| :--- | :--- | :--- | :--- |
| `FR-24` | Cetak izin distribusi (A4) berisi nomor izin, daftar bantuan, posko tujuan | Pimpinan | Hasil cetak rapi, tidak terpotong, tanpa menu aplikasi |
| `FR-25` | Notifikasi simulasi (lonceng in-app + log) | Sistem | Setiap perubahan status menambah satu notifikasi; tidak mengirim WA asli |
| `FR-26` | Akses lintas perangkat (`npm run share`) & uji 360/768/1366/1920 px | Dev | Semua halaman bisa dipakai di keempat lebar tanpa scroll horizontal |
| `FR-27` | `README.md` + panduan demo 5 menit | Dev | Orang lain bisa menjalankan dari nol mengikuti README |

---

## 5. Kebutuhan Non-Fungsional (`NFR`)

| Kode | Standar | Cara membuktikan |
| :--- | :--- | :--- |
| `NFR-01` | Hak akses diperiksa di server, bukan hanya menyembunyikan menu | Uji panggil API dengan sesi peran salah → 403 |
| `NFR-02` | Stok bantuan tidak boleh minus; perubahan stok memakai transaksi database | Uji dua pengurangan bersamaan → satu gagal dengan pesan jelas |
| `NFR-03` | Riwayat status & audit bersifat *append-only* (tidak ada hapus/ubah baris lama) | Tidak ada endpoint hapus audit; trigger/constraint menolak update |
| `NFR-04` | Satu laporan hanya bisa disetujui sekali (kunci unik + optimistic lock) | Dua klik setujui → hanya satu izin terbit |
| `NFR-05` | Semua waktu bisnis lewat `ClockService`, tidak ada `new Date()` di domain | Pencarian kode: domain bersih dari `new Date()` |
| `NFR-06` | Teks ≥16 px, target sentuh ≥44×44 px, kontras ≥4,5:1, fokus terlihat | Pemeriksaan manual + axe DevTools tanpa pelanggaran kritis |
| `NFR-07` | Tidak ada `window.alert`, `confirm`, atau `prompt` | Pencarian kode = 0 hasil |
| `NFR-08` | Peta tampil < 2 detik pada data demo; API p95 < 500 ms | Ukur di mesin demo; tampilkan `Skeleton` selama memuat |
| `NFR-09` | Ketahanan demo: tile peta dicadangkan, reset < 30 detik, seed deterministik | Matikan internet → peta tetap menampilkan area Surabaya dari cadangan |
| `NFR-10` | Tidak ada istilah teknis di layar; setiap pesan gagal memberi langkah lanjutan | Tinjau semua pesan error; uji persona |
| `NFR-11` | Responsif 360–1920 px; panel peta bisa dilipat di layar kecil | Uji 4 lebar perangkat |
| `NFR-12` | Kode lacak acak 8 karakter, tidak berurutan & tidak bisa ditebak | Buat 100 kode → tidak ada pola berurutan |
| `NFR-13` | Model deterministik & berversi; hasil bisa direproduksi | Jalankan 10× dengan input sama → identik |
| `NFR-14` | Data pribadi minimal: Tamu tidak melihat kontak pelapor | Periksa respons API publik |
| `NFR-15` | Semua warna dari token `@theme`; tidak ada hex lepas di halaman | Pencarian `#` di `apps/web/src` selain token = 0 |

---

## 6. Data Master & Spesifikasi Seed Bersih

### 6.1 Entitas Utama

| Entitas | Kolom wajib | Catatan |
| :--- | :--- | :--- |
| `User` | `id`, `name`, `email` (unik), `role`, `isActive`, `regionId` (opsional), `createdAt` | Role: `PETUGAS`, `PIMPINAN`, `ADMIN`; pendaftar baru `isActive=false` |
| `Session` | `id`, `tokenHash` (unik), `userId`, `expiresAt`, `createdAt` | Sesi cookie httpOnly; token asli tidak disimpan (ADR 0004) |
| `OtpCode` | `userId`, `codeHash`, `expiresAt`, `usedAt` | `123456` hanya saat `DEMO_MODE=true` |
| `Region` | `id`, `name`, `isActive`, `boundary` (GeoJSON opsional) | 8 kecamatan contoh Surabaya; nonaktif ≠ hapus |
| `Posko` | `id`, `name`, `regionId`, `lat`, `lng`, `isActive` | 3 posko contoh |
| `AidItem` | `id`, `name`, `unit`, `icon`, `standardPerPerson`, `isActive` | 10 jenis bantuan |
| `Incident` | `id`, `code`, `title`, `disasterType`, `lat`, `lng`, `radiusM`, `regionId`, `occurredAt`, `status`, `reporterId`, 8 kolom faktor | Faktor disimpan sebagai kolom eksplisit, bukan JSON bebas |
| `IncidentLog` | `id`, `incidentId`, `fromStatus`, `toStatus`, `actorId`, `note`, `createdAt` | Riwayat status, append-only |
| `Recommendation` | `id`, `incidentId`, `modelVersion`, `totalPeople`, `generatedAt` | Satu laporan bisa punya beberapa versi, yang aktif ditandai |
| `RecommendationItem` | `recommendationId`, `aidItemId`, `baseQty`, `finalQty`, `unit`, `reason` | 10 baris per rekomendasi |
| `Decision` | `id`, `recommendationId`, `deciderId`, `decision`, `reason`, `decidedAt` | `APPROVE` / `REJECT` |
| `Permit` | `id`, `number` (unik), `incidentId`, `poskoId`, `issuedById`, `issuedAt`, `validUntil`, `status` | Nomor format `IZN-YYYYMMDD-XXX` |
| `Stock` | `poskoId`, `aidItemId`, `qty` | Ringkasan saja, `qty >= 0` |
| `AuditLog` | `id`, `entity`, `entityId`, `action`, `actorId`, `before`, `after`, `createdAt` | Append-only |
| `DemoClock` | `id`, `offsetMinutes` | Dipakai `ClockService` |

### 6.2 Faktor Laporan (8)

| Faktor | Tipe | Nilai |
| :--- | :--- | :--- |
| Jiwa terdampak | integer | 1–50.000 |
| Kerusakan rumah | pilihan | `RINGAN`, `SEDANG`, `BERAT` |
| Kelompok rentan | integer ×4 | bayi, lansia, ibu hamil, disabilitas |
| Jenis bencana | pilihan | `BANJIR`, `KEBAKARAN`, `GEMPA`, `ANGIN`, `LAINNYA` |
| Lama penanganan | integer hari | 1–30 |
| Akses jalan | pilihan | `TERBUKA`, `TERBATAS`, `TERPUTUS` |
| Cuaca | pilihan | `CERAH`, `HUJAN`, `EKSTREM` |
| Kepadatan penduduk | pilihan | `RENDAH`, `SEDANG`, `TINGGI` |

### 6.3 Seed Bersih

- **0** `Incident`, **0** `Recommendation`, **0** `Decision`, **0** `Permit`, **0** `IncidentLog`.
- Data master: 10 `AidItem`, 8 `Region`, 3 `Posko`, 3 `User`.
- Ikon bantuan = SVG (bukan foto), sumber dicatat di `docs/desain/gambar/CREDITS.md`.
- Semua kuantitas berupa integer (liter, paket, unit, lembar).

---

## 7. Alur Kerja Inti & Peta Status

### 7.1 Alur dari A sampai Z

1. **Petugas** masuk → membuat laporan baru → memilih jenis bencana, waktu, judul.
2. Petugas menaruh **titik** di peta Surabaya dan menarik **radius** wilayah terdampak.
3. Petugas mengisi **8 faktor**; sistem memvalidasi rentang.
4. Petugas menekan **"Hitung estimasi"** → sistem menjalankan model → tabel 10 bantuan + alasan.
5. Petugas meninjau, lalu menekan **"Ajukan ke pimpinan"** → status `MENUNGGU_PERSETUJUAN`.
6. **Pimpinan** membuka dasbor → melihat antrian → memilih laporan → peta & rincian tampil.
7. Pimpinan boleh **menyesuaikan jumlah** per item dengan alasan → **Setujui** atau **Tolak**.
8. Jika disetujui: **izin distribusi** bernomor terbit, berisi daftar bantuan final & posko tujuan.
9. Setelah barang diterima di posko, pimpinan menandai **`SELESAI`**.
10. **Tamu** bisa melacak lewat **kode lacak** kapan saja tanpa login.

### 7.2 Peta Status

| Dari | Ke | Pelaku | Syarat | Efek |
| :--- | :--- | :--- | :--- | :--- |
| `BARU` | `DIPERIKSA` | Petugas | 8 faktor valid & estimasi dihitung | Rekomendasi tersimpan |
| `DIPERIKSA` | `MENUNGGU_PERSETUJUAN` | Petugas | Rekomendasi ada | Terkunci; masuk antrian |
| `MENUNGGU_PERSETUJUAN` | `DISETUJUI` | Pimpinan | Keputusan `APPROVE` | Izin terbit |
| `MENUNGGU_PERSETUJUAN` | `DITOLAK` | Pimpinan | Alasan wajib | Terminal |
| `BARU` / `DIPERIKSA` | `DIBATALKAN` | Petugas | — | Terminal |
| `MENUNGGU_PERSETUJUAN` | `DIBATALKAN` | Pimpinan | Alasan wajib | Terminal |
| `DISETUJUI` | `SELESAI` | Pimpinan | Izin ada | Laporan ditutup |

### 7.3 Halaman Lacak Publik
- Input **kode lacak** (format `SIA-XXXXXX`).
- Menampilkan: jenis bencana, kecamatan, waktu kejadian, status saat ini, timeline status, ringkasan bantuan yang disetujui.
- Tidak menampilkan: nama pelapor, nomor telepon, email, catatan internal.

---

## 8. Aturan Mutlak (`Invariants`), Audit, & Kasus Khusus

### 8.1 Invariants
1. **`Stock.qty >= 0`** — tidak ada stok minus, termasuk saat dua permintaan bersamaan.
2. **Laporan berstatus `MENUNGGU_PERSETUJUAN`, `DISETUJUI`, `SELESAI`, `DITOLAK` tidak bisa disunting isinya.**
3. **Satu laporan hanya punya satu keputusan aktif** — tidak bisa disetujui dua kali.
4. **`IncidentLog` dan `AuditLog` append-only** — tidak ada endpoint ubah/hapus.
5. **Nomor izin unik** dan tidak pernah dipakai ulang.
6. **Kode lacak acak 8 karakter**, bukan ID berurutan.
7. **Semua perhitungan waktu lewat `ClockService`.**
8. **Kuantitas bantuan selalu integer ≥ 0.**

### 8.2 Kasus Khusus

| Kasus | Aturan |
| :--- | :--- |
| Laporan dibatalkan sebelum diajukan | Petugas boleh batal; alasan opsional; status `DIBATALKAN` |
| Ditolak pimpinan | Alasan wajib; petugas bisa membuat **laporan baru** yang menunjuk ke laporan lama (bukan mengedit) |
| Salah angka setelah disetujui | Wajib **catatan koreksi** baru; izin lama tetap tersimpan & ditandai "digantikan" |
| Laporan dobel di lokasi sama | Sistem menampilkan peringatan "sudah ada laporan dalam radius 200 m", petugas tetap boleh lanjut dengan catatan |
| Stok tidak cukup | Persetujuan **ditolak** dengan pesan stok kurang; pimpinan memilih posko lain atau menyesuaikan jumlah. Stok diambil otomatis saat izin terbit (M4). |
| Sinyal hilang saat mengisi | Draf tersimpan lokal; saat kembali, pengguna ditawari melanjutkan draf |
| Waktu demo dimajukan | Tanggal izin & batas berlaku ikut bergeser sesuai `ClockService` |

---

## 9. Arsitektur Software & Tech Stack

### 9.1 Struktur Repositori

```
SiAlokasi/
├─ apps/
│  ├─ api/
│  │  ├─ src/modules/{auth,users,regions,posko,aid-items,incidents,recommendations,decisions,permits,stock,audit,demo}/
│  │  ├─ src/lib/{clock.ts,prisma.ts,rbac.ts}
│  │  ├─ prisma/{schema.prisma,migrations/,seed.ts}
│  │  └─ scripts/verify-m{1..4}.ts
│  └─ web/
│     ├─ src/components/ui/   (Modal, Toast, Skeleton, EmptyState, Field, AppHeader, BottomNav)
│     ├─ src/features/{public,petugas,pimpinan,admin}/
│     ├─ src/lib/{api.ts,map.ts,format.ts}
│     └─ src/styles/theme.css (@theme tokens)
├─ packages/shared/
│  ├─ src/schemas/     (Zod: incident, recommendation, decision, permit)
│  ├─ src/domain/      (status machine, haversine, konversi satuan)
│  └─ src/ml/          (model.json, predict.ts, explain.ts)
├─ tools/train-model/  (dataset sintetis + skrip pelatihan, output ke shared)
├─ docs/
└─ storage/            (tile cache, berkas sementara)
```

### 9.2 Tech Stack

| Lapisan | Pilihan | Versi target | Alasan |
| :--- | :--- | :--- | :--- |
| Bahasa | TypeScript | 5.x | Tipe dipakai bersama web & api |
| Runtime | Node.js | 20 LTS+ | Tersedia di mesin demo |
| Database | PostgreSQL | 17 (lokal, tanpa PostGIS) | Sudah terpasang, tanpa instalasi baru |
| ORM | Prisma | 5.x/6.x | Migrasi & seed mudah di-reset |
| API | Fastify | 4.x/5.x | Ringan, cepat, modular |
| Web | React + Vite | 18 / 5 | Build cepat, ekosistem luas |
| Peta | Leaflet + react-leaflet | 1.9 / 4.x | Radius & marker langsung tersedia |
| Styling | Tailwind CSS v4 `@theme` | 4.x | Token warna terkunci di satu tempat |
| State/data | TanStack Query | 5.x | Loading/error state konsisten |
| Validasi | Zod | 3.x | Satu skema untuk form & server |
| Auth | Cookie sesi httpOnly + OTP demo (`123456`) | — | Sederhana & aman untuk demo; ADR 0004 |

### 9.3 Model Estimasi

- **Pelatihan:** `tools/train-model` membuat dataset sintetis deterministik (benih tetap) berdasarkan standar bantuan darurat, lalu melatih regresi per jenis bantuan.
- **Keluaran:** `packages/shared/src/ml/model.json` berisi koefisien, intercept, batas minimum/maksimum, dan `modelVersion`.
- **Prediksi:** dijalankan di `shared` (fungsi murni) sehingga web & api memberi hasil identik.
- **Penjelasan:** `explain.ts` mengubah kontribusi faktor menjadi kalimat manusia, mis. "Karena 420 jiwa terdampak dan akses jalan terputus, air bersih ditambah 15%."
- **Batas aman:** hasil dibulatkan ke satuan terdekat dan dijepit pada rentang wajar per item.

### 9.4 Pihak Ketiga (Adapter)
| Kebutuhan | Mode simulasi (dipakai) | Titik sambung nanti |
| :--- | :--- | :--- |
| Notifikasi | Tulis ke log + lonceng in-app | `NotificationAdapter` |
| Peta | OpenStreetMap + cache tile lokal | `TileProvider` |
| Waktu | `ClockService` dengan offset demo | `ClockProvider` |

### 9.5 Perintah

| Perintah | Fungsi |
| :--- | :--- |
| `npm run db:start` / `db:stop` | Nyalakan/matikan PostgreSQL lokal via `pg_ctl` |
| `npm run db:migrate` | Terapkan migrasi Prisma |
| `npm run db:seed` | Isi data master & akun demo (0 transaksi) |
| `npm run demo:reset` | Kosongkan transaksi + reset waktu demo |
| `npm run dev` | Jalankan web + api bersamaan |
| `npm run build` | Build seluruh workspace |
| `npm test` | Unit test `shared` + test api |
| `npm run share` | Buka akses lintas perangkat lewat tunnel |

---

## 10. Peta Halaman, Spesifikasi Layar, & Skenario Demo

### 10.1 Daftar Halaman

| Kode | Halaman | Peran | Komponen kunci | State wajib |
| :--- | :--- | :--- | :--- | :--- |
| `P1` | Beranda publik | Tamu | Peta kejadian, kartu ringkas, filter | `Skeleton`, `EmptyState` "belum ada laporan" |
| `P2` | Lacak status | Tamu | Input kode, timeline status, ringkasan bantuan | Error kode tidak ditemukan |
| `A1` | Masuk | Semua | Email + kode OTP | `Field` error, kirim ulang kode |
| `A2` | Daftar petugas | Calon petugas | Form nama, email, wilayah | Pesan "menunggu aktivasi admin" |
| `T1` | Dasbor petugas | Petugas | Ringkasan laporan saya, tombol buat laporan | `Skeleton`, `EmptyState` |
| `T2` | Buat laporan (peta) | Petugas | Peta besar, panel kiri, slider radius | Draf tersimpan, peringatan laporan dobel |
| `T3` | Faktor & estimasi | Petugas | 8 field, tombol hitung, tabel 10 bantuan + alasan | Loading hitung, error validasi |
| `T4` | Ajukan laporan | Petugas | Ringkasan + `ConfirmDialog` | Konfirmasi, sukses `Toast` |
| `L1` | Dasbor pimpinan | Pimpinan | Peta, antrian, kartu ringkasan | `Skeleton`, `EmptyState` antrian kosong |
| `L2` | Tinjau rekomendasi | Pimpinan | Peta radius, tabel bisa diubah, alasan perubahan | Validasi alasan wajib |
| `L3` | Izin distribusi | Pimpinan | Dokumen izin, nomor, tombol cetak | Tampilan cetak A4 |
| `L4` | Rekap laporan | Pimpinan | Filter tanggal/kecamatan/jenis, tabel rekap, unduh CSV | `Skeleton`, `EmptyState` |
| `D1` | Ringkasan admin | Admin | Statistik, pintasan | `Skeleton` |
| `D2` | Akun & peran | Admin | Tabel, `ConfirmDialog` nonaktifkan | Pencegah nonaktifkan diri sendiri |
| `D3` | Jenis bantuan | Admin | Tabel + modal formulir | Nonaktif ≠ hapus |
| `D4` | Wilayah & posko | Admin | Tabel + peta pemilih koordinat | Validasi koordinat |
| `D5` | Stok per posko | Admin/Pimpinan | Matriks read-only + jurnal stok | Peringatan stok menipis |
| `D6` | Panel `/dev` | Admin | Majukan waktu, reset, isi contoh | `ConfirmDialog` reset |
| `D7` | Audit & riwayat | Admin | Tab perubahan & riwayat status, filter, nilai sebelum→sesudah | `Skeleton`, `EmptyState` |

### 10.2 Prinsip Tata Letak
- **Peta sebagai kanvas utama**, panel mengapung di kiri (desktop) atau menjadi *bottom sheet* (mobile).
- Panel kiri lebar 380–420 px, sudut 16 px, latar `--color-surface`, garis `--color-border`.
- Tombol aksi utama selalu di kanan bawah panel; aksi berbahaya memakai `--color-danger`.
- Status selalu tampil sebagai **chip berwarna + teks**, bukan warna saja (aksesibilitas).

### 10.3 Skenario Demo (5 Menit)
1. Buka `P1` sebagai Tamu → peta Surabaya, 0 laporan, `EmptyState` ramah.
2. Masuk sebagai **Petugas** → buat laporan banjir di Kecamatan Wonokromo → tandai titik, radius 1,2 km.
3. Isi 8 faktor (contoh: 420 jiwa, rumah rusak berat, 12 bayi, akses terbatas, hujan).
4. Tekan **Hitung estimasi** → tunjukkan 10 bantuan + alasan.
5. Ajukan → ganti akun **Pimpinan** → antrian menampilkan laporan.
6. Ubah 2 item dengan alasan → Setujui → izin `IZN-20261107-001` terbit.
7. Kembali ke `P2` sebagai **Tamu**, masukkan kode lacak → timeline tampil.
8. Tutup dengan panel `/dev`: reset → kembali ke 0 transaksi untuk kelompok berikutnya, atau isi 3 contoh untuk memperlihatkan antrian, izin, dan laporan selesai.

---

## 11. Asumsi & Risiko

| Risiko | Dampak | Mitigasi |
| :--- | :--- | :--- |
| Internet di lokasi demo lemah | Peta OSM tidak muncul | Cache tile lokal + cadangan batas wilayah Surabaya |
| PostgreSQL lokal mati | Aplikasi tidak bisa dibuka | `npm run db:start` + pemeriksaan otomatis saat `npm run dev` |
| Model memberi angka tidak wajar | Demo kehilangan kredibilitas | Batas minimum/maksimum per item + penjelasan + unit test |
| Data seed tidak bersih | Alur demo tidak terlihat dari nol | `demo:reset` wajib diuji di M4 |
| Waktu pengerjaan melebar | Tahap berikutnya tertunda | Batas lingkup dikunci di Bagian 1.4 |
