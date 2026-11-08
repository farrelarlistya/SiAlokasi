-- AlterTable
ALTER TABLE "decisions" ALTER COLUMN "reason" DROP NOT NULL;

-- AlterTable
ALTER TABLE "incidents" ALTER COLUMN "affectedPeople" DROP NOT NULL,
ALTER COLUMN "damageLevel" DROP NOT NULL,
ALTER COLUMN "handlingDays" DROP NOT NULL,
ALTER COLUMN "roadAccess" DROP NOT NULL,
ALTER COLUMN "weather" DROP NOT NULL,
ALTER COLUMN "density" DROP NOT NULL;

-- AlterTable
ALTER TABLE "recommendation_items" ADD COLUMN     "adjustReason" TEXT;

-- CreateTable
CREATE TABLE "permit_items" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "aidItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" TEXT,

    CONSTRAINT "permit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permit_items_permitId_aidItemId_key" ON "permit_items"("permitId", "aidItemId");

-- CreateIndex
CREATE UNIQUE INDEX "decisions_recommendationId_key" ON "decisions"("recommendationId");

-- AddForeignKey
ALTER TABLE "permit_items" ADD CONSTRAINT "permit_items_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_items" ADD CONSTRAINT "permit_items_aidItemId_fkey" FOREIGN KEY ("aidItemId") REFERENCES "aid_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
