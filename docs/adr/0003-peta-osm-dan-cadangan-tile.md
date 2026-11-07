# ADR 0003 — Peta OpenStreetMap, Leaflet, dan Cadangan Tile

- **Tanggal:** 2026-11-07
- **Status:** Diterima
- **Konteks tahap:** Sesi 1 (`D1`)

## Konteks

Antarmuka utama berupa WebGIS. Pemilik memilih peta kota asli (Surabaya) lewat OpenStreetMap. Risiko utama: koneksi internet di lokasi demo bisa lemah, sehingga tile peta gagal dimuat dan demo kehilangan inti tampilannya.

## Keputusan

1. **Wilayah demo:** Kota Surabaya.
2. **Pustaka peta:** **Leaflet + react-leaflet** (bukan MapLibre/Mapbox).
3. **Sumber tile:** OpenStreetMap raster standar.
4. **Cadangan (fallback):**
   - API menyediakan **proxy cache tile** di `/api/tiles/{z}/{x}/{y}.png` yang menyimpan hasil unduhan ke `storage/tiles` dengan masa simpan tertentu.
   - Sebelum demo, jalankan `npm run tiles:warm` untuk mengunduh tile Surabaya pada zoom 11–16 ke cache.
   - Bila tile tetap gagal, peta menampilkan latar `#F3EEDD` + batas kecamatan dari berkas GeoJSON lokal + pita peringatan "Peta sedang memuat terbatas". Aplikasi tetap dapat dipakai.
5. **Atribusi** "© OpenStreetMap contributors" selalu tampil.

## Alasan

- Leaflet paling ringan dan langsung mendukung marker, popup, dan lingkaran radius — persis kebutuhan SiAlokasi.
- Peta kota asli membuat demo lebih meyakinkan dibanding peta fiktif.
- Cache tile menghilangkan ketergantungan penuh pada internet tanpa harus mengubah kode tampilan.
- Tidak memakai Mapbox karena butuh token dan kuota yang bisa habis tepat saat demo.

## Konsekuensi

**Positif**
- Tampilan nyata dan mudah dikenali.
- Demo tetap berjalan meski internet putus setelah tile dihangatkan.
- Tidak ada biaya atau token.

**Negatif / batasan**
- Cache tile memakan ruang disk (perkiraan 150–400 MB untuk Surabaya zoom 11–16).
- Peta OSM standar tidak bisa dirotasi atau dimiringkan.
- Perubahan gaya peta memerlukan penyesuaian warna UI.

**Mitigasi**
- Folder `storage/` sudah di-`.gitignore`.
- Sediakan `npm run tiles:clean` untuk menghapus cache.
- Jika di masa depan ingin peta vektor, keputusan diganti lewat ADR baru.

## Alternatif yang Ditolak

| Alternatif | Alasan ditolak |
| :--- | :--- |
| MapLibre GL | Butuh gaya peta vektor tambahan; kurva belajar lebih tinggi |
| Mapbox GL | Butuh token berbayar & kuota; risiko demo |
| Peta fiktif / GeoJSON lokal saja | Tidak memenuhi keinginan pemilik akan kota asli |
| Google Maps | Butuh kunci API berbayar dan syarat lisensi lebih ketat |
