# ADR 0002 — Model Estimasi Lokal dari Data Sintetis

- **Tanggal:** 2026-11-07
- **Status:** Diterima
- **Konteks tahap:** Sesi 1 (`D1`)

## Konteks

Estimasi kebutuhan bantuan harus terasa "cerdas" (bukan kalkulator biasa), tetapi demo tidak boleh bergantung pada internet, akun berbayar, atau layanan pihak ketiga yang hasilnya berubah-ubah. Pemilik memilih model lokal yang dilatih dari data sintetis.

## Keputusan

1. **Regresi linear/ridge per jenis bantuan**, dilatih offline oleh `tools/train-model`.
2. Data latih **sintetis dan deterministik** (benih tetap), disusun mengacu pada standar bantuan darurat (mis. kebutuhan air per orang per hari, ukuran tenda keluarga, rasio toilet).
3. Keluaran pelatihan berupa **`packages/shared/src/ml/model.json`** berisi:
   - `modelVersion`
   - koefisien & intercept per jenis bantuan
   - batas minimum & maksimum per item
   - faktor penyesuaian untuk kelompok rentan
4. Prediksi dijalankan sebagai **fungsi murni** di `packages/shared`, dipakai web dan api.
5. Setiap baris hasil menyertakan **penjelasan bahasa manusia** dari `explain.ts`.

## Alasan

- Tanpa internet dan tanpa biaya; hasil selalu tersedia saat demo.
- Deterministik: input sama + versi model sama = hasil sama. Tidak ada kejutan saat presentasi.
- Regresi mudah dijelaskan ke pimpinan ("tiap 100 jiwa butuh X liter air"), sehingga nilai "mengurangi bias" tetap terjaga.
- Berkas model kecil, tidak membebani build.

## Konsekuensi

**Positif**
- Dapat diuji unit test tanpa database.
- Versi model dapat dicatat pada setiap rekomendasi, sehingga hasil lama tetap dapat diaudit.
- Mudah diganti dengan model lain di masa depan tanpa mengubah API.

**Negatif / batasan**
- Pola yang sangat tidak linear tidak tertangkap.
- Kualitas sangat bergantung pada asumsi dataset sintetis.

**Mitigasi**
- Batas minimum/maksimum mencegah angka tidak wajar.
- Unit test memeriksa: hasil tidak negatif, hasil integer, hasil monoton naik terhadap jumlah jiwa, dan penjelasan selalu ada.
- Data latih disimpan di repo agar dapat direproduksi.

## Alternatif yang Ditolak

| Alternatif | Alasan ditolak |
| :--- | :--- |
| API ML pihak ketiga | Butuh akun, biaya, internet, dan hasil tak dapat diprediksi saat demo |
| Aturan manual murni | Tidak memenuhi tujuan "mengurangi bias"; terasa seperti kalkulator |
| Gradient boosting | Berkas lebih besar, alasan hasil lebih sulit dijelaskan |
| Jaringan saraf | Berlebihan untuk data sintetis, rawan angka aneh |
