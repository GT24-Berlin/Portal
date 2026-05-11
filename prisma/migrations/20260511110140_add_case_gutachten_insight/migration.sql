-- CreateTable
CREATE TABLE "CaseGutachtenInsight" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "sourceCaseFileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_AVAILABLE',
    "summaryShort" TEXT,
    "schadenshoeheNetto" DECIMAL(12,2),
    "schadenshoeheBrutto" DECIMAL(12,2),
    "geschaetzterAnspruch" DECIMAL(12,2),
    "reparaturkostenNetto" DECIMAL(12,2),
    "reparaturkostenBrutto" DECIMAL(12,2),
    "wiederbeschaffungswert" DECIMAL(12,2),
    "restwert" DECIMAL(12,2),
    "wertminderung" DECIMAL(12,2),
    "nutzungsausfallProTag" DECIMAL(12,2),
    "reparaturdauerArbeitstage" INTEGER,
    "abrechnungsart" TEXT,
    "mietwagenklasse" TEXT,
    "reparaturwuerdig" BOOLEAN,
    "notes" TEXT,
    "rawExtractionJson" JSONB,
    "extractedAt" TIMESTAMP(3),

    CONSTRAINT "CaseGutachtenInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseGutachtenInsight_caseId_key" ON "CaseGutachtenInsight"("caseId");

-- AddForeignKey
ALTER TABLE "CaseGutachtenInsight" ADD CONSTRAINT "CaseGutachtenInsight_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseGutachtenInsight" ADD CONSTRAINT "CaseGutachtenInsight_sourceCaseFileId_fkey" FOREIGN KEY ("sourceCaseFileId") REFERENCES "CaseFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
