-- Revisi formulir laporan:
-- 1. Keterangan bebas untuk jenis bencana "Lainnya".
-- 2. "Perkiraan lama penanganan" dihapus dari isian; perhitungan memakai
--    asumsi awal tiga hari, sehingga kolomnya tidak lagi dipakai.
ALTER TABLE "incidents" ADD COLUMN "disasterDetail" TEXT;

ALTER TABLE "incidents" DROP COLUMN "handlingDays";
