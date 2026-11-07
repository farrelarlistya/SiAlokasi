-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PETUGAS', 'PIMPINAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('BARU', 'DIPERIKSA', 'MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'SELESAI', 'DITOLAK', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "DisasterType" AS ENUM ('BANJIR', 'KEBAKARAN', 'GEMPA', 'ANGIN', 'LAINNYA');

-- CreateEnum
CREATE TYPE "DamageLevel" AS ENUM ('RINGAN', 'SEDANG', 'BERAT');

-- CreateEnum
CREATE TYPE "RoadAccess" AS ENUM ('TERBUKA', 'TERBATAS', 'TERPUTUS');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('CERAH', 'HUJAN', 'EKSTREM');

-- CreateEnum
CREATE TYPE "DensityLevel" AS ENUM ('RENDAH', 'SEDANG', 'TINGGI');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('TERBIT', 'DICETAK', 'SELESAI', 'DIBATALKAN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poskos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poskos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aid_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "standardPerPerson" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aid_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "disasterType" "DisasterType" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusM" INTEGER NOT NULL,
    "regionId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'BARU',
    "reporterId" TEXT NOT NULL,
    "affectedPeople" INTEGER NOT NULL,
    "damageLevel" "DamageLevel" NOT NULL,
    "vulnerableBabies" INTEGER NOT NULL DEFAULT 0,
    "vulnerableElderly" INTEGER NOT NULL DEFAULT 0,
    "vulnerablePregnant" INTEGER NOT NULL DEFAULT 0,
    "vulnerableDisabled" INTEGER NOT NULL DEFAULT 0,
    "handlingDays" INTEGER NOT NULL,
    "roadAccess" "RoadAccess" NOT NULL,
    "weather" "WeatherCondition" NOT NULL,
    "density" "DensityLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_logs" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "fromStatus" "IncidentStatus",
    "toStatus" "IncidentStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "totalPeople" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_items" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "aidItemId" TEXT NOT NULL,
    "baseQty" INTEGER NOT NULL,
    "finalQty" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "recommendation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "deciderId" TEXT NOT NULL,
    "decision" "DecisionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permits" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "poskoId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "status" "PermitStatus" NOT NULL DEFAULT 'TERBIT',

    CONSTRAINT "permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "poskoId" TEXT NOT NULL,
    "aidItemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_clock" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "offsetMinutes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_clock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "otp_codes_userId_expiresAt_idx" ON "otp_codes"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "poskos_name_key" ON "poskos"("name");

-- CreateIndex
CREATE UNIQUE INDEX "aid_items_name_key" ON "aid_items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_code_key" ON "incidents"("code");

-- CreateIndex
CREATE INDEX "incidents_status_occurredAt_idx" ON "incidents"("status", "occurredAt");

-- CreateIndex
CREATE INDEX "incident_logs_incidentId_createdAt_idx" ON "incident_logs"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "recommendations_incidentId_isActive_idx" ON "recommendations"("incidentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_items_recommendationId_aidItemId_key" ON "recommendation_items"("recommendationId", "aidItemId");

-- CreateIndex
CREATE UNIQUE INDEX "permits_number_key" ON "permits"("number");

-- CreateIndex
CREATE INDEX "permits_incidentId_idx" ON "permits"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_poskoId_aidItemId_key" ON "stocks"("poskoId", "aidItemId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poskos" ADD CONSTRAINT "poskos_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_logs" ADD CONSTRAINT "incident_logs_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_logs" ADD CONSTRAINT "incident_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_aidItemId_fkey" FOREIGN KEY ("aidItemId") REFERENCES "aid_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_deciderId_fkey" FOREIGN KEY ("deciderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_poskoId_fkey" FOREIGN KEY ("poskoId") REFERENCES "poskos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_poskoId_fkey" FOREIGN KEY ("poskoId") REFERENCES "poskos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_aidItemId_fkey" FOREIGN KEY ("aidItemId") REFERENCES "aid_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
