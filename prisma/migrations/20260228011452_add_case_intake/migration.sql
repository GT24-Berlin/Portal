-- CreateTable
CREATE TABLE "CaseIntake" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "accidentDescription" TEXT,
    "driverIsHolder" BOOLEAN,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "insuranceName" TEXT,
    "insuranceNumber" TEXT,
    "insuranceEmail" TEXT,
    "carMake" TEXT,
    "carModel" TEXT,
    "carYear" INTEGER,
    "plateNumber" TEXT,
    "holderName" TEXT,

    CONSTRAINT "CaseIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseIntake_caseId_key" ON "CaseIntake"("caseId");

-- AddForeignKey
ALTER TABLE "CaseIntake" ADD CONSTRAINT "CaseIntake_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
