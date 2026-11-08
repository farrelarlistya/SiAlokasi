# ADR 0004 — Autentikasi OTP Demo dan Sesi Cookie httpOnly

- **Tanggal:** 2026-11-08
- **Status:** Diterima
- **Konteks tahap:** Sesi 3 (`M2` — Akun Semua Peran & Data Master)

## Konteks

M2 mengharuskan tiga peran (Petugas, Pimpinan, Admin) bisa masuk dengan email dan kode sekali pakai. Aplikasi dipakai di laptop posko dan ponsel petugas, sering berpindah perangkat, dan tidak boleh bergantung pada layanan pihak ketiga saat demo. Hak akses juga harus diperiksa di server, bukan hanya dengan menyembunyikan menu.

Pilihan yang dipertimbangkan: kata sandi biasa, OTP dengan layanan pesan berbayar, atau OTP lokal dengan kode demo.

## Keputusan

1. **Masuk tanpa kata sandi.** Pengguna memasukkan email, meminta kode enam angka, lalu memasukkan kode tersebut.
2. **Kode disimpan sebagai hash** (`SHA-256`) di tabel `otp_codes`, berlaku **10 menit**, dan ditandai `usedAt` setelah dipakai.
3. **Mode demo:** bila `DEMO_MODE=true`, kode **`123456` selalu diterima** untuk akun aktif, sehingga demo tidak bergantung pada pengiriman pesan. Di luar mode demo, kode acak ditulis ke log server lewat adapter notifikasi simulasi.
4. **Sesi memakai cookie httpOnly**:
   - Token acak 32 byte, disimpan sebagai hash di tabel `sessions`.
   - Cookie `sialokasi_session`, `httpOnly`, `SameSite=Lax`, `Path=/`, berlaku **12 jam**, dan `Secure` saat `NODE_ENV=production`.
   - Setiap permintaan memuat ulang pengguna dari database, sehingga perubahan peran langsung berlaku dan akun nonaktif langsung kehilangan akses.
5. **Pendaftaran mandiri hanya untuk Petugas.** Akun dibuat `isActive=false`, lalu Admin mengaktifkannya dari halaman Akun & Peran. Pimpinan dan Admin dibuat lewat seed.
6. **RBAC di server.** Setiap rute terlindungi memakai `requireRole(...)`; permintaan tanpa sesi dijawab `401`, peran yang salah dijawab `403`.
7. **Audit perubahan akun dan data master** ditulis ke `audit_logs` (append-only pada tingkat aplikasi; penguatan constraint/trigger dijadwalkan M4).

## Alasan

- Tidak ada rahasia kata sandi yang perlu dikelola untuk demo.
- OTP demo tetap memaksa alur yang sama dengan produksi: email → kode → sesi.
- Cookie httpOnly mencegah JavaScript halaman membaca token sesi.
- Memeriksa peran di server memenuhi `NFR-01` dan tetap benar meskipun menu di antarmuka dimanipulasi.
- Tidak ada biaya, kredensial, atau kuota pihak ketiga yang bisa gagal saat demo.

## Konsekuensi

**Positif**
- Demo masuk cepat untuk tiga peran tanpa mengetik kata sandi.
- Sesi bisa dicabut dengan menghapus baris `sessions` saat akun dinonaktifkan atau demo direset.
- Perubahan peran berlaku pada permintaan berikutnya tanpa menunggu pengguna masuk ulang.

**Negatif / batasan**
- Pengiriman kode asli belum terpasang; di luar mode demo kode hanya muncul di log server.
- Sesi disimpan di database, sehingga setiap permintaan terautentikasi menambah satu query.
- Belum ada pembatasan percobaan kode (rate limit) dan belum ada perangkat tepercaya.

**Mitigasi**
- Rate limit dan notifikasi pengiriman masuk daftar M4/M5 bila diperlukan.
- Untuk demo, reset sesi sudah disediakan lewat `demo:reset`.

## Alternatif yang Ditolak

| Alternatif | Alasan ditolak |
| :--- | :--- |
| Kata sandi biasa | Menambah beban mengingat & mengelola sandi; tidak memberi nilai tambah untuk demo |
| OTP lewat WhatsApp/SMS asli | Butuh biaya, kredensial, dan koneksi; berisiko gagal saat demo |
| JWT di localStorage | Rentan dibaca skrip halaman; pencabutan sesi lebih rumit |
| Sesi di memori server | Hilang saat server dimulai ulang dan tidak cocok untuk pengembangan |
