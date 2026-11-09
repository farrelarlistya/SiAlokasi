-- CreateEnum
CREATE TYPE "StockMovementKind" AS ENUM ('RESERVE', 'RELEASE', 'ADJUST');

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "cancelReason" TEXT;

-- AlterTable
ALTER TABLE "permits" ADD COLUMN     "replacesNumber" TEXT,
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "supersededByNumber" TEXT;

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "poskoId" TEXT NOT NULL,
    "aidItemId" TEXT NOT NULL,
    "qtyDelta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "kind" "StockMovementKind" NOT NULL,
    "permitId" TEXT,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_corrections" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "previousPermitId" TEXT NOT NULL,
    "newPermitId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movements_poskoId_aidItemId_createdAt_idx" ON "stock_movements"("poskoId", "aidItemId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_permitId_idx" ON "stock_movements"("permitId");

-- CreateIndex
CREATE INDEX "incident_corrections_incidentId_createdAt_idx" ON "incident_corrections"("incidentId", "createdAt");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_poskoId_fkey" FOREIGN KEY ("poskoId") REFERENCES "poskos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_aidItemId_fkey" FOREIGN KEY ("aidItemId") REFERENCES "aid_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "permits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrections" ADD CONSTRAINT "incident_corrections_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrections" ADD CONSTRAINT "incident_corrections_previousPermitId_fkey" FOREIGN KEY ("previousPermitId") REFERENCES "permits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrections" ADD CONSTRAINT "incident_corrections_newPermitId_fkey" FOREIGN KEY ("newPermitId") REFERENCES "permits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_corrections" ADD CONSTRAINT "incident_corrections_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Aturan mutlak M4: stok tidak pernah minus.
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_qty_nonnegative" CHECK ("qty" >= 0);
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_balance_nonnegative" CHECK ("balanceAfter" >= 0);

-- Jurnal audit, riwayat status, dan ledger stok bersifat append-only.
CREATE OR REPLACE FUNCTION sialokasi_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Tabel % hanya menerima penambahan; baris lama tidak boleh diubah.', TG_TABLE_NAME
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF coalesce(current_setting('sialokasi.allow_purge', true), '') = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Tabel % hanya menerima penambahan; baris lama tidak boleh dihapus.', TG_TABLE_NAME
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incident_logs_append_only
  BEFORE UPDATE OR DELETE ON "incident_logs"
  FOR EACH ROW EXECUTE FUNCTION sialokasi_append_only();

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION sialokasi_append_only();

CREATE TRIGGER stock_movements_append_only
  BEFORE UPDATE OR DELETE ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION sialokasi_append_only();
