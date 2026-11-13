# ADR 0014 — Masuk dengan Email & Kata Sandi (menggantikan Kode OTP Demo)

- **Tanggal:** 2026-11-13
- **Status:** Diterapkan, menggantikan ADR 0004 bagian kode OTP
- **Tahap:** Revisi pasca-deploy

## Konteks

Sejak M2, masuk memakai dua langkah: isi email, lalu masukkan kode 6 angka. Saat
`DEMO_MODE=true`, kode `123456` selalu diterima dan bahkan diisikan otomatis.

Pemilik proyek meminta sistem kode demo diganti dengan **kredensial akun (email +
kata sandi)** untuk ketiga akun yang sudah ada, karena alur dua langkah terasa
merepotkan dan tidak seperti aplikasi pada umumnya.

## Keputusan

1. **Login satu langkah:** `POST /api/auth/login` menerima `{ email, password }`.
   Kode OTP, endpoint `/api/auth/request-code`, tabel `otp_codes`, dan skema
   `otpRequestSchema`/`otpCodeSchema` dihapus dari kode dan database.
2. **Penyimpanan kata sandi:** kolom baru `users.passwordHash` berisi
   `scrypt:<salt>:<hash>` (scrypt bawaan Node, garam acak 16 byte, kunci 64 byte).
   Tidak ada pustaka tambahan. Perbandingan memakai `timingSafeEqual`.
   Kata sandi asli tidak pernah disimpan, dicatat di audit, atau ditulis ke log.
3. **Akun demo:** seed mengisi ketiga akun dengan `DEMO_PASSWORD`
   (`Sialokasi#2026`, konstanta di `@sialokasi/shared`) setiap kali
   `db:seed`/`demo:reset` dijalankan, sehingga demo selalu bisa masuk.
4. **Pendaftaran petugas:** formulir menambah kolom kata sandi (minimal 8
   karakter). Pendaftar tetap berstatus nonaktif sampai admin mengaktifkan.
5. **Mode demo:** `DEMO_MODE=true` tidak lagi mengubah cara masuk. Halaman masuk
   hanya berisi email + kata sandi; daftar tiga akun contoh **dihapus** atas
   permintaan pemilik agar halaman tidak penuh. Kredensial demo tercatat di README.
6. **Pesan gagal seragam:** salah email atau salah kata sandi sama-sama
   menghasilkan `401` dengan pesan "Email atau kata sandi belum cocok…" agar
   tidak membocorkan email mana yang terdaftar. Akun nonaktif tetap `403`
   setelah kata sandi benar.

## Konsekuensi

- Lebih sederhana dipakai dan lebih mirip aplikasi nyata; sesi cookie httpOnly
  tetap sama.
- **Belum ada alur lupa kata sandi.** Karena aplikasi tidak mengirim email,
  pemulihan dilakukan lewat seed/reset demo atau admin (mengaktifkan ulang
  akun). Bila nanti dipakai nyata, tambahkan endpoint ganti kata sandi dan
  pengiriman email sungguhan.
- **Belum ada pembatasan percobaan masuk.** Untuk demo dianggap cukup; untuk
  produksi nyata perlu rate limit per email/IP.
- Kata sandi demo diketahui publik (tercatat di README). Matikan `DEMO_MODE`
  dan ganti kata sandi sebelum pemakaian nyata.
- Migrasi `20261113170000_m7_password_login` menambah `users.passwordHash` dan
  membuang tabel `otp_codes`.
