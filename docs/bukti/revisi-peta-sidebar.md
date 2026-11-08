# Bukti Revisi — Lambang Baru & Panel Peta (2026-11-08)

Revisi antarsesi sebelum `M4`. Fokus: ganti lambang aplikasi dan pastikan formulir tidak menutupi peta.

## Perintah yang dijalankan

```bash
npm run build
npm test
node scripts/capture-revisi-peta-sidebar.mjs
```

## Hasil

| Pemeriksaan | Hasil |
| :--- | :--- |
| `npm run build` (shared + api + web) | ✅ lulus, Vite membangun 1.912 modul |
| `npm test` | ✅ 6 berkas uji, **63 unit test lulus** |
| `window.alert` / `confirm` / `prompt` | ✅ tidak ada |
| Kesalahan konsol saat uji 14 tangkapan layar | **0** |
| Kesalahan halaman | **0** |
| Gulir horizontal pada 360, 390, 768, 1440, 1920 px | **0** |
| Panel tertutup lalu dibuka | ✅ isian formulir tetap ada; peta menghitung ulang ukuran |
| Panel tertutup di ponsel | ✅ peta memenuhi area kerja di atas navigasi bawah |

## Tangkapan layar

Semua berkas ada di `docs/bukti/revisi-peta-sidebar/`.

| Berkas | Isi |
| :--- | :--- |
| `00-logo-header.png` | Lambang baru diperbesar 6× dari header |
| `01-beranda-panel-terbuka-1440.png` | Beranda 1440 px, panel di samping peta (tidak menutupi) |
| `02-beranda-panel-tertutup-1440.png` | Beranda 1440 px, peta penuh + tombol "Tampilkan panel" |
| `03-halaman-masuk-logo-1440.png` | Lambang baru di halaman masuk |
| `04-buat-laporan-panel-terbuka-1440.png` | Buat Laporan 1440 px, peta besar + formulir di panel |
| `05-buat-laporan-panel-tertutup-1440.png` | Buat Laporan 1440 px, peta penuh |
| `06-buat-laporan-390.png` | Buat Laporan 390 px, peta 45% + panel 55% |
| `07-buat-laporan-peta-penuh-390.png` | Buat Laporan 390 px, panel ditutup |
| `08-beranda-390.png` | Beranda 390 px |
| `09-beranda-768.png` | Beranda 768 px, panel 360 px di samping peta |
| `10-buat-laporan-768.png` | Buat Laporan 768 px |
| `11-beranda-360.png` | Beranda 360 px |
| `12-buat-laporan-360.png` | Buat Laporan 360 px |
| `13-beranda-1920.png` | Beranda 1920 px, panel 440 px |

## Catatan

- Panel menyimpan pilihan buka/tutup di `localStorage` per halaman. Uji menutup panel, berpindah halaman, lalu membukanya lagi; isian formulir tidak hilang.
- Tombol pembuka ditempatkan 72 px dari kiri agar tidak bertumpuk dengan kontrol zoom Leaflet.
- Di ponsel, panel memakai 55% tinggi area kerja dan bisa digulir; tombol simpan mengikuti akhir formulir agar tidak menutupi isian.
- Lambang memakai berkas asli dari pemilik, dipotong latar hitamnya dan disimpan sebagai PNG bersih; favicon dibuat dari berkas yang sama.
