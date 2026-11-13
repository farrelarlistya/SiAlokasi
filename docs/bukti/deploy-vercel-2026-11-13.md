# Bukti Uji — Deploy Produksi Vercel + Neon (2026-11-13)

Alamat: `https://sialokasi.vercel.app`
Database: Neon Postgres, branch `production`, region `ap-southeast-1`
Fungsi: Vercel Node Function `api/[...path].ts`, region `sin1`

## 1. Build dan uji lokal

| Pemeriksaan | Hasil |
| :--- | :--- |
| `npm run build` | Lulus (web + bundel API) |
| `npm test` | 91/91 lulus (10 berkas uji) |

## 2. Migrasi dan data awal

- `prisma migrate deploy` dengan URL langsung: 5 migrasi diterapkan.
- `prisma db seed`: 10 jenis bantuan, 8 kecamatan, 3 posko, 30 baris stok, 3 akun demo.
- Awal: 0 laporan, 0 izin, 0 notifikasi.

## 3. Pemeriksaan HTTP

| Permintaan | Hasil |
| :--- | :--- |
| `GET /api/health` | 200, `database: "ok"`, `demoMode: true` |
| `GET /api/auth/me` | 200, `{"user":null}` |
| `GET /api/public/incidents` | 200, `total: 0` |
| `GET /` `/masuk` `/lacak/ABC123` | 200 (SPA) |
| `POST /api/dev/reset` tanpa sesi admin | 403 |

## 4. Alur kerja inti (uji tulis ke database produksi)

| Langkah | Hasil |
| :--- | :--- |
| Minta kode `petugas@sialokasi.demo` | 200, `demoCode: "123456"` |
| Masuk dengan `123456` | 200, pengguna Rina Kusuma (`PETUGAS`) |
| `GET /api/auth/me` dengan cookie | 200, pengguna sama |
| Buat laporan (banjir, Gubeng, radius 500 m) | 200, kode `SIA-9UKGG`, status `BARU` |
| Isi 8 faktor | 200, status `DIPERIKSA`, estimasi 10 jenis bantuan + alasan perhitungan |
| Lacak publik `GET /api/public/incidents/SIA-9UKGG` | 200, tanpa data pribadi pelapor |
| Ajukan ke pimpinan | 200, status `MENUNGGU_PERSETUJUAN` |
| Masuk sebagai `pimpinan@sialokasi.demo` | 200, Budi Santoso (`PIMPINAN`) |
| Setujui ke Posko Balai Kota | 200, status `DISETUJUI`, izin `IZN-20261113-001` terbit |
| Tandai distribusi selesai | 200, status `SELESAI` |
| Masuk sebagai `admin@sialokasi.demo` | 200, Sari Wulandari (`ADMIN`) |
| Akses `/api/petugas/incidents` sebagai petugas dari akun admin | ditolak sesuai peran (403 pada `/api/dev/status` untuk petugas) |
| `POST /api/dev/reset` | 292 ms; 3 pengguna, 8 kecamatan, 3 posko, 10 jenis bantuan, 30 stok, **0 laporan, 0 notifikasi** |

Setelah reset: `GET /api/public/incidents` → `total: 0`, `GET /api/health` → 200.

## 5. Masalah yang ditemukan dan perbaikannya

| Gejala | Sebab | Perbaikan |
| :--- | :--- | :--- |
| `/api/auth/me` 404 padahal `/api/health` 200 | Fungsi catch-all hanya cocok satu segmen | Rewrite `/api/:path*` → `/api/[...path]` |
| POST menjawab 400 tanpa isi | Fungsi selesai sebelum respons terkirim | Tunggu `finish`/`close` sebelum handler kembali |
| "Request body size did not match Content-Length" | Badan sudah dibaca Vercel, panjang tidak disesuaikan | Hitung ulang `content-length` dari isi stream baru |
| "Transaction already closed" saat pertama kali menyimpan | Batas transaksi 5 detik + latensi lintas benua | `maxWait` 15 detik, `timeout` 20 detik, fungsi dipindah ke `sin1` |
| Reset demo gagal setelah 21 detik | Fungsi di `iad1`, database di Singapura | `regions: ["sin1"]` → reset 0,3 detik |

## 6. Catatan

- URL deployment khusus (`sialokasi-<hash>-unbeaten.vercel.app`) dilindungi Vercel Authentication
  dan menjawab 401 tanpa token; verifikasi memakai domain produksi.
- Kode sesi, kunci database, dan nilai environment tidak dicatat di dokumen ini.