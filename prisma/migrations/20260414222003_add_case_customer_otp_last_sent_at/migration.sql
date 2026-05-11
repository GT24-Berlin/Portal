-- CreateEnum
CREATE TYPE "CaseFileUploaderType" AS ENUM ('CUSTOMER', 'PARTNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CaseFileVisibility" AS ENUM ('CUSTOMER', 'PARTNERS', 'CUSTOMER_AND_PARTNERS');

-- CreateEnum
CREATE TYPE "CaseFileCategory" AS ENUM ('CUSTOMER_PHOTOS', 'REGISTRATION_DOCS', 'INSURANCE_DOCS', 'GUTACHTEN', 'LAW_DOCS', 'OTHER');

-- AlterTable
ALTER TABLE "CaseCustomerOtp" ADD COLUMN     "lastSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CaseFile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,
    "uploaderType" "CaseFileUploaderType" NOT NULL,
    "uploaderId" TEXT,
    "role" "CaseLane",
    "visibility" "CaseFileVisibility" NOT NULL DEFAULT 'CUSTOMER_AND_PARTNERS',
    "category" "CaseFileCategory" NOT NULL DEFAULT 'OTHER',
    "title" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "storageKey" TEXT NOT NULL,

    CONSTRAINT "CaseFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseFile_caseId_createdAt_idx" ON "CaseFile"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseFile_uploaderType_createdAt_idx" ON "CaseFile"("uploaderType", "createdAt");

-- CreateIndex
CREATE INDEX "CaseFile_visibility_category_idx" ON "CaseFile"("visibility", "category");

-- AddForeignKey
ALTER TABLE "CaseFile" ADD CONSTRAINT "CaseFile_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
