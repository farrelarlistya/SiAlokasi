# Bukti Hierarki & Fokus — 2026-11-10

Revisi: `docs/rencana-hierarki-fokus.md` · ADR: [`0011-hierarki-fokus.md`](../../adr/0011-hierarki-fokus.md) · Panduan: [`design-rim.md`](../../desain/design-rim.md) §3–§10.

## Yang diperiksa

- Fondasi: `.text-page` 32/40, `.text-focus` 24/32, `.text-section` 20/28, `.text-figure` 40/44, `.focus-rule`.
- Komponen: `Section` (`focus`/`default`/`quiet`), `PageHeader.brief`, `StepRail`, `focusSection`.
- Layar: P1 (kosong & terpilih), T2, T3 (faktor & hasil), T4, L1, L2, L3, P2, A1, A2, D1–D7.
- Lebar: 1440×1000 dan 390×844. Pemeriksaan layout juga menolak teks < 16 px, target < 44 px, gulir horizontal, lebih dari satu `<h1>`, dan lebih dari satu blok fokus.
- Keyboard: skip link "Lewati ke isi utama", fokus pindah ke judul setelah baris dipilih, dan Escape menutup dialog.

## Hasil

| Pemeriksaan | Hasil |
| :--- | :--- |
| `npm run build` | lulus (shared, api, web) |
| `npm test` | 91/91 lulus |
| `npm run verify:m2` | 49/49 lulus |
| `npm run verify:m4` | 99/99 lulus |
| Tangkapan + audit CDP | **240/240 pemeriksaan lulus, 0 gagal** |
| Keyboard | skip link tersedia, fokus pindah ke `#rincian-kejadian`, Escape menutup dialog |
| `sloplint --scope app --render` | **0 FAIL, 1 WARN F3** (judul aplikasi satu baris; disengaja) |
| Render tier sloplint | tidak berjalan: `puppeteer-core` tidak tersedia; diganti tangkapan Chrome DevTools Protocol |
| P1: pilih baris | fokus berpindah ke judul `#rincian-kejadian` |
| L2: bilah keputusan | terlihat tanpa menggulir pada 1440×1000 |
| L2: dialog penolakan | terbuka dari aksi Tolak; Escape menutupnya |
| Header ponsel | wordmark dan nama pengguna disembunyikan; logo 44×44, bel, dan keluar tetap 44×44 |
| Data demo | seed 3 contoh → tangkapan → reset 0 transaksi |

## Tangkapan layar

| Berkas | Isi |
| :--- | :--- |
| `01-p1-kosong-1440.png`, `02-p1-kosong-390.png` | P1: fokus daftar kejadian, keadaan kosong |
| `03-a1-masuk-1440.png`, `04-a1-masuk-390.png` | A1: formulir fokus, panel merek tenang |
| `05-a2-daftar-1440.png` | A2: formulir pendaftaran |
| `06-p1-terpilih-1440.png`, `07-p1-terpilih-390.png` | P1: rincian kejadian menjadi blok fokus |
| `08-t2-laporan-baru-1440.png`, `09-t2-laporan-baru-390.png` | T2: rel langkah + titik & wilayah |
| `10-t3-faktor-1440.png` | T3: delapan faktor sebagai fokus |
| `11-t3-hasil-1440.png`, `12-t3-hasil-390.png` | T3: hasil estimasi menjadi fokus, angka 420 |
| `13-l1-dasbor-1440.png`, `14-l1-dasbor-390.png` | L1: "Perlu keputusan" + laporan teratas |
| `15-l2-tinjau-1440.png`, `16-l2-tinjau-390.png` | L2: tabel rekomendasi + bilah keputusan |
| `17-l3-izin-1440.png`, `18-l3-izin-390.png` | L3: pita nomor izin + dokumen kertas |
| `19-p2-kode-1440.png`, `20-p2-hasil-1440.png`, `21-p2-hasil-390.png` | P2: kode lacak lalu status/timeline |
| `22-d1-dasbor-1440.png`, `29-d1-dasbor-390.png` | D1: "Perlu tindakan", metrik 20 |
| `23-d2-akun-1440.png`, `30-d2-akun-390.png` | D2: tabel akun fokus |
| `24-d3-bantuan-1440.png` | D3: tabel jenis bantuan fokus |
| `25-d4-wilayah-1440.png` | D4: tabel kecamatan fokus |
| `26-d5-stok-1440.png` | D5: matriks stok fokus |
| `27-d6-demo-1440.png` | D6: waktu layanan 40, reset sekunder |
| `28-d7-audit-1440.png` | D7: tab aktif + catatan perubahan |
| `31-t4-ajukan-1440.png` | T4: bantuan yang diajukan sebagai fokus |
| `32-a2-daftar-390.png` | A2 ponsel: formulir pendaftaran |
| `33-d3-bantuan-390.png` | D3 ponsel: tabel jenis bantuan |
| `34-d4-wilayah-390.png` | D4 ponsel: tabel kecamatan |
| `35-d5-stok-390.png` | D5 ponsel: matriks stok |
| `36-d6-demo-390.png` | D6 ponsel: waktu layanan + reset |
| `37-d7-audit-390.png` | D7 ponsel: catatan perubahan |
| `38-l2-tolak-1440.png` | L2: dialog alasan penolakan |

## Catatan

- Uji 5 detik dan squint test dilakukan dengan meninjau tangkapan di atas: setiap layar hanya
  memiliki satu blok bergaris aksen 2 px, satu judul fokus 24, dan satu aksi primer.
- WARN F3 bukan kegagalan: judul aplikasi satu baris dan tidak perlu di-balance.
- `hasil-uji.json` adalah keluaran mentah skrip `scripts/capture-hierarki-fokus.mjs`;
  `sloplint.txt` adalah keluaran mentah sloplint.
