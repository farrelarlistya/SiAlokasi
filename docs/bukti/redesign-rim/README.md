# Bukti Redesign "Rim" — 2026-11-10

## Yang diperiksa

- FigCraft: `SiAlokasi-Redesign.figcraft` (4 halaman, 18 board, logo di header).
- Web: `apps/web` (token, komponen, halaman inti, admin, izin, lacak).
- API: `server/api-app.mjs` (bundel Vercel) diuji lewat adaptor HTTP lokal.
- Hallmark sloplint: `apps/web/src` + render `http://localhost:5174`.

## Hasil

| Pemeriksaan | Hasil |
| :--- | :--- |
| `npm run build` | lulus (shared, api, web) |
| `npm test` | 91/91 lulus |
| sloplint `--scope app --render` | **0 FAIL**, 1 WARN F3 (display head tanpa `text-wrap: balance`, sengaja), 1 WAIVED 39b (baris daftar laporan adalah tombol seleksi, bukan kontrol formulir) |
| API `/api/health` via adaptor Vercel | 200, `database: ok` |
| API `POST /api/auth/request-code` via adaptor | 200, body JSON terbaca |
| Seed contoh lalu reset | 3 laporan dibuat, lalu 0 laporan setelah reset |
| Tangkapan 1440×900 & 375 | tersimpan di folder ini dan `pages/` |
| Panel peta | tombol "Tampilkan panel" berlatar `surface` padat; panel bisa digeser 340–640 px, klik dua kali kembali 420 px, panah kiri/kanan 16 px, lebar disimpan di localStorage |
| Uji geser panel | 420 → 560 → 640 px berhasil, nilai tersimpan `560`/`640` |

## Berkas

- `sloplint.txt` — keluaran lengkap.
- `localhost-5174-*.png` — tangkapan render tier (1280, 1440, 1920, 375).
- `pages/L1-dasbor.png`, `L2-tinjau.png`, `L3-izin.png`, `T3-faktor.png`,
  `D2-akun.png`, `D3-bantuan.png`, `D4-wilayah.png`, `D5-stok.png`,
  `D6-demo.png`, `D7-audit.png`, `filter-dropdown.png`.
- `filter-dropdown.png` — select dengan chevron khusus, padding kanan 48 px, label "Semua wilayah".
- `panel-closed.png`, `panel-width-420.png`, `panel-resized.png` — tombol panel padat, lebar bawaan, dan hasil geser.

## Catatan

- WARN F3 bukan kegagalan: judul aplikasi satu baris dan tidak perlu di-balance.
- `D6-demo.png` diambil sebelum perataan terakhir; susunan barunya sama-sama tanpa kartu merah.
- Data contoh dihapus kembali lewat `/api/dev/reset`; demo kembali 0 transaksi.
