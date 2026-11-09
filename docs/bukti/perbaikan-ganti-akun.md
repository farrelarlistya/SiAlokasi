# Bukti Perbaikan — Alur Ganti Akun

**Tanggal:** 2026-11-09
**Status:** Selesai
**Terkait:** halaman masuk, `RequireRole`, dan navigasi tujuan setelah masuk

---

## 1. Masalah

Langkah yang dilaporkan pemilik:

1. Masuk sebagai **Pimpinan** dan buka `/pimpinan`.
2. Tekan **Keluar**.
3. Masuk sebagai **Petugas**.
4. Muncul halaman **“Halaman ini bukan untuk peran Anda”** karena pengguna diarahkan kembali ke
   `/pimpinan`.

## 2. Penyebab

- Saat tombol Keluar ditekan, sesi dihapus lebih dahulu. Halaman `/pimpinan` yang masih terbuka
  sempat melihat pengguna tanpa sesi, lalu `RequireRole` menulis
  `/masuk?next=%2Fpimpinan`.
- Halaman masuk memakai `next` tanpa memeriksa apakah alamat itu boleh dibuka oleh peran yang
  baru masuk. Akibatnya petugas diarahkan ke halaman pimpinan.
- Tombol Keluar juga belum meninggalkan halaman berperan sebelum sesi dihapus, sehingga
  navigasi ke `/` kalah oleh pengalihan `RequireRole`.

## 3. Perbaikan

1. **Validasi tujuan berdasarkan peran** di `apps/web/src/lib/roles.ts`:
   - `canAccessPath(role, path)` memeriksa daftar halaman publik dan awalan halaman per peran.
   - `nextPathForRole(role, next)` hanya memakai `next` bila alamat internal dan boleh dibuka
     peran tersebut; selain itu kembali ke dasbor perannya.
   - Alamat luar (`//domain-lain`) diabaikan.
2. **Penanda keluar yang disengaja** di `apps/web/src/auth/logout-state.ts`:
   - `AuthProvider.logout()` menandai proses keluar sebelum sesi dihapus.
   - `RequireRole` tidak mengalihkan ke halaman masuk selama proses keluar.
   - `LogoutWatcher` di `App.tsx` menutup penanda setelah pengguna benar-benar tiba di halaman
     publik; `applyLogin` juga menutupnya sebagai cadangan.
3. **Navigasi keluar** di `AppShell`: setelah sesi dihapus, pengguna diarahkan ke `/` tanpa
   membawa `next` lama. Ada cadangan 1 detik bila navigasi tidak sempat terjadi.
4. **Pemeriksaan regresi** `scripts/check-login-switch.mjs` + `npm run verify:login`.

## 4. Hasil

```
npm run verify:login
  Pemeriksaan ganti akun

  [1] Masuk pimpinan lalu keluar dari halaman /pimpinan
    OK    pimpinan berada di /pimpinan
    OK    keluar tidak menyisakan ?next=/pimpinan (/)

  [2] Masuk petugas dengan alamat tujuan lama /pimpinan
    OK    petugas diarahkan ke dasbornya (/petugas)
    OK    halaman bukan untuk peran tidak muncul

  [3] Tujuan lintas peran lain
    OK    petugas tidak diarahkan ke /admin
    OK    alamat luar diabaikan
    OK    halaman yang diizinkan tetap dibuka

  [4] Pimpinan tetap memakai tujuan yang sah
    OK    pimpinan tetap ke /pimpinan

  Ringkasan: 8 lulus, 0 gagal
```

`npm run build` juga lulus bersih setelah perbaikan.

## 5. Berkas yang Diubah

| Berkas | Perubahan |
| :--- | :--- |
| `apps/web/src/lib/roles.ts` | Daftar halaman publik/per peran, `canAccessPath`, `nextPathForRole`, `isPublicPath` |
| `apps/web/src/pages/auth/LoginPage.tsx` | Memakai `nextPathForRole` saat mengarahkan setelah masuk |
| `apps/web/src/auth/logout-state.ts` | Penanda proses keluar yang disengaja |
| `apps/web/src/auth/AuthProvider.tsx` | Menandai awal keluar; menutup penanda saat masuk lagi |
| `apps/web/src/auth/RequireRole.tsx` | Tidak menulis `next` selama proses keluar |
| `apps/web/src/App.tsx` | `LogoutWatcher` menutup penanda setelah tiba di halaman publik |
| `apps/web/src/layouts/AppShell.tsx` | Menutup penanda saat keluar gagal dan menyiapkan cadangan |
| `scripts/check-login-switch.mjs` | Pemeriksaan regresi 8 langkah lewat Chrome DevTools Protocol |
| `package.json` | Perintah `npm run verify:login` |

## 6. Perilaku Sekarang

- Keluar dari halaman mana pun kembali ke beranda publik **tanpa** `?next=` lama.
- Petugas yang masuk dari tautan lama `/pimpinan` atau `/admin` diarahkan ke `/petugas`.
- Pimpinan yang memang membuka `/pimpinan` tetap diarahkan ke `/pimpinan`.
- Halaman yang diizinkan lintas peran, seperti `/notifikasi`, tetap dibuka sesuai tujuan.
- Akses langsung ke halaman peran lain saat sudah masuk tetap menampilkan halaman penjelasan
  “Halaman ini bukan untuk peran Anda” — ini disengaja untuk alamat yang diketik manual.
