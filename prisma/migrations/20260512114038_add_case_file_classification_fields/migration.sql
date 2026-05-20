-- CreateEnum
CREATE TYPE "CaseFileDocumentType" AS ENUM ('GUTACHTEN_MAIN', 'GUTACHTEN_ANLAGE_FOTOS', 'GUTACHTEN_MINDERWERTREPORT', 'GUTACHTEN_AUFTRAG', 'RECHNUNG', 'ACHSVERMESSUNG', 'VERSICHERUNGSDOKUMENT', 'FAHRZEUGDOKUMENT', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "CaseFileClassificationStatus" AS ENUM ('PENDING', 'CLASSIFIED', 'FAILED', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "CaseFileClassificationConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "CaseFile" ADD COLUMN     "classificationConfidence" "CaseFileClassificationConfidence",
ADD COLUMN     "classificationSignals" JSONB,
ADD COLUMN     "classificationSource" TEXT,
ADD COLUMN     "classificationStatus" "CaseFileClassificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "classifiedAt" TIMESTAMP(3),
ADD COLUMN     "documentType" "CaseFileDocumentType";
