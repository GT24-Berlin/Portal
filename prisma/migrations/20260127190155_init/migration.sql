-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('GUTACHTER', 'ANWALT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'APPOINTMENT', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "GutachterCaseStatus" AS ENUM ('EINGEGANGEN', 'DATEN_UNVOLLSTAENDIG', 'GUTACHTER_KONTAKTIERT', 'TERMIN_GEPLANT', 'GUTACHTEN_IN_BEARBEITUNG', 'GUTACHTEN_ERSTELLT', 'ABGESCHLOSSEN');

-- CreateEnum
CREATE TYPE "AnwaltCaseStatus" AS ENUM ('FALL_EINGEGANGEN', 'FALL_IN_PRUEFUNG', 'RUECKFRAGEN_IN_KLAERUNG', 'FALL_BERICHT_ERSTELLT', 'FALL_ABGESCHLOSSEN');

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "PartnerType" NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "email" TEXT,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "partnerId" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseNumber" TEXT,
    "token" TEXT NOT NULL,
    "partnerId" TEXT,
    "leadId" TEXT,
    "gutachterStatus" "GutachterCaseStatus" NOT NULL DEFAULT 'EINGEGANGEN',
    "anwaltStatus" "AnwaltCaseStatus" NOT NULL DEFAULT 'FALL_EINGEGANGEN',
    "gutachtenPdfUrl" TEXT,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,
    "track" "PartnerType" NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_externalId_key" ON "Lead"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Case_token_key" ON "Case"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Case_leadId_key" ON "Case"("leadId");

-- CreateIndex
CREATE INDEX "CaseEvent_caseId_track_occurredAt_idx" ON "CaseEvent"("caseId", "track", "occurredAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
