# Bukti Revisi — Login Email + Kata Sandi (2026-11-13)

Permintaan pemilik proyek: ganti sistem kode demo `123456` menjadi kredensial akun
(email + kata sandi) untuk ketiga akun yang sudah ada.

Keputusan teknis lengkap: `docs/adr/0014-login-email-password.md`.

## Yang berubah

| Bagian | Sebelum | Sesudah |
| :-- | :-- | :-- |
| Cara masuk | email → kirim kode → masukkan 6 angka | satu form: email + kata sandi |
| Kode demo | `123456` selalu diterima saat `DEMO_MODE=true` | dihapus dari kode, tabel, dan dokumen |
| Penyimpanan | tabel `otp_codes` (hash kode, kedaluwarsa 10 menit) | kolom `users.passwordHash` (scrypt + garam acak) |
| Pendaftaran petugas | nama, email, kecamatan | nama, email, **kata sandi (min. 8)**, kecamatan |
| Halaman masuk | daftar akun mengisi email, kode diisikan otomatis | form email + kata sandi; daftar akun contoh dihapus atas permintaan pemilik |
| Panel `/dev` | "Kode masuk akun contoh selalu 123456" | "Kata sandi akun contoh: Sialokasi#2026" |

## Akun demo

| Peran | Email | Kata sandi |
| :-- | :-- | :-- |
| Petugas | `petugas@sialokasi.demo` | `Sialokasi#2026` |
| Pimpinan | `pimpinan@sialokasi.demo` | `Sialokasi#2026` |
| Admin | `admin@sialokasi.demo` | `Sialokasi#2026` |

`npm run db:seed` dan `npm run demo:reset` mengembalikan kata sandi ini.

## Keamanan

- Kata sandi disimpan sebagai `scrypt:<salt>:<hash>` (scrypt bawaan Node, garam 16
  byte, kunci 64 byte). Tidak ada pustaka tambahan.
- Perbandingan memakai `timingSafeEqual`, sehingga waktu respons tidak membocorkan
  panjang/isi hash.
- Salah email dan salah kata sandi menghasilkan `401` dengan pesan yang sama
  ("Email atau kata sandi belum cocok…") agar tidak membocorkan email terdaftar.
- Kata sandi tidak pernah masuk audit log maupun log server.
- Akun nonaktif tetap `403` (setelah kata sandi benar).

## Hasil pengujian

| Pemeriksaan | Hasil |
| :-- | :-- |
| `npm run build` (typecheck shared, api, web + build web) | lulus |
| `npm test` | **102/102** lulus (termasuk uji skema login & kata sandi) |
| `verify:m1` | **24/24** — termasuk "kata sandi disimpan sebagai hash" dan "tidak tersimpan sebagai teks biasa" |
| `verify:m2` | **50/50** — termasuk "kata sandi salah ditolak" dan "akun baru belum bisa masuk sebelum diaktifkan" |
| `verify:m3` | **83/83** |
| `verify:m4` | **99/99** |
| `verify:m5` | **40/40** |
| `verify:m1` dengan `TZ=UTC` (simulasi server produksi) | 24/24 — sekaligus membuktikan perbaikan bug "waktu kejadian dianggap masa depan" |
| Uji peramban `scripts/capture-revisi.mjs` | lulus, 0 kesalahan konsol |

## Catatan & batasan

- **Belum ada alur lupa kata sandi.** Aplikasi tidak mengirim email; pemulihan
  dilakukan lewat seed/reset demo atau admin.
- **Belum ada pembatasan percobaan masuk.** Cukup untuk demo, perlu rate limit
  sebelum dipakai nyata.
- Kata sandi demo tampil di halaman masuk selama `DEMO_MODE=true`. Matikan mode itu
  dan ganti kata sandi sebelum pemakaian nyata.

---

## Tambahan (2026-11-13): daftar akun demo dihapus & fokus modal diperbaiki

### 1. Halaman masuk tanpa daftar akun demo

Atas permintaan pemilik, tiga opsi akun demo di halaman masuk dihapus beserta
catatan kata sandi di bawahnya. Halaman masuk kini hanya berisi email + kata sandi.

- Kode yang dibuang: `DEMO_ACCOUNTS`, `ROLE_LABEL`, `DEMO_PASSWORD`, dan kueri
  `health` yang hanya dipakai untuk mendeteksi mode demo.
- Kredensial demo tetap tercatat di `README.md` dan panel `/dev`.
- Bukti otomatis: `capture-revisi.mjs` memeriksa halaman masuk tidak lagi memuat
  teks "Akun demo" maupun alamat `@sialokasi.demo`.

### 2. Bug fokus pada form penyesuaian bantuan (pimpinan)

**Gejala:** di modal "Ubah jumlah bantuan", kolom **Alasan perubahan** kehilangan
fokus setiap kali satu karakter diketik, sehingga harus diklik ulang.

**Penyebab:** efek di `Modal` (fokus awal, kunci Tab, Escape) bergantung pada
identitas `onClose`. Pemanggil mengirim fungsi baru setiap render
(`closeAdjust` bukan `useCallback`), jadi setiap ketikan memicu:

1. state berubah → halaman render ulang → `onClose` baru,
2. `handleKeyDown` baru → efek dibersihkan dan dijalankan ulang,
3. efek memanggil `[data-autofocus]` lagi — yaitu kolom **Jumlah final** —
   sehingga fokus terlempar dari kolom alasan.

**Perbaikan (`apps/web/src/components/Modal.tsx`):**

- `onClose` disimpan di `useRef` dan diperbarui lewat efek kecil.
- `handleKeyDown` dibuat stabil (dependensi kosong) dan memanggil
  `onCloseRef.current`.
- Efek fokus sekarang hanya bergantung pada `open`, jadi fokus awal hanya
  dijalankan sekali saat dialog dibuka.

Perbaikan ini berlaku untuk **semua** modal di aplikasi (batalkan laporan,
tolak laporan, koreksi izin, konfirmasi setujui/selesai), bukan hanya modal
penyesuaian.

**Bukti otomatis:** `capture-revisi.mjs` membuka modal penyesuaian, memfokuskan
kolom alasan, mengetik `a`, `b`, `c` lewat DevTools, lalu memastikan
`document.activeElement` masih kolom alasan dan nilainya `abc`.

### Hasil

| Pemeriksaan | Hasil |
| :-- | :-- |
| `npm run build` | lulus |
| `npm test` | 102/102 |
| `node scripts/capture-revisi.mjs` | **15/15 lulus, 0 kesalahan konsol** |
