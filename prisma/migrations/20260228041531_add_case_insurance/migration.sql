/*
  Warnings:

  - You are about to drop the column `carMake` on the `CaseIntake` table. All the data in the column will be lost.
  - You are about to drop the column `carModel` on the `CaseIntake` table. All the data in the column will be lost.
  - You are about to drop the column `carYear` on the `CaseIntake` table. All the data in the column will be lost.
  - You are about to drop the column `holderName` on the `CaseIntake` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceEmail` on the `CaseIntake` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceName` on the `CaseIntake` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceNumber` on the `CaseIntake` table. All the data in the column will be lost.
  - You are about to drop the column `plateNumber` on the `CaseIntake` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ClaimRoute" AS ENUM ('OPPONENT_LIABILITY', 'OWN_CASCO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InsuranceParty" AS ENUM ('OWN', 'OPPONENT');

-- AlterTable (SAFE: nur neue Spalten hinzufügen, nichts droppen)
ALTER TABLE "CaseIntake"
ADD COLUMN     "accidentDate" TIMESTAMP(3),
ADD COLUMN     "accidentLocation" TEXT,
ADD COLUMN     "claimRoute" "ClaimRoute" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "opponentCarMake" TEXT,
ADD COLUMN     "opponentCarModel" TEXT,
ADD COLUMN     "opponentPlateNumber" TEXT,
ADD COLUMN     "ownCarMake" TEXT,
ADD COLUMN     "ownCarModel" TEXT,
ADD COLUMN     "ownCarYear" INTEGER,
ADD COLUMN     "ownPlateNumber" TEXT,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "policeInvolved" BOOLEAN,
ADD COLUMN     "policeReportNumber" TEXT,
ADD COLUMN     "witnessContact" TEXT,
ADD COLUMN     "witnessesPresent" BOOLEAN;


-- CreateTable
CREATE TABLE "CaseInsurance" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "party" "InsuranceParty" NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "policyNumber" TEXT,
    "claimNumber" TEXT,
    "contactPerson" TEXT,
    "ownIntakeId" TEXT,
    "opponentIntakeId" TEXT,

    CONSTRAINT "CaseInsurance_pkey" PRIMARY KEY ("id")
);

-- Seed: OWN insurance aus bestehenden CaseIntake-Feldern übernehmen
INSERT INTO "CaseInsurance" (
  "id","createdAt","updatedAt","party","name","email","policyNumber","ownIntakeId"
)
SELECT
  gen_random_uuid()::text,
  NOW(),
  NOW(),
  'OWN',
  ci."insuranceName",
  ci."insuranceEmail",
  ci."insuranceNumber",
  ci."id"
FROM "CaseIntake" ci
WHERE (ci."insuranceName" IS NOT NULL OR ci."insuranceEmail" IS NOT NULL OR ci."insuranceNumber" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "CaseInsurance" x
    WHERE x."ownIntakeId" = ci."id" AND x."party" = 'OWN'
  );


-- Pro Intake max. 1x OWN
CREATE UNIQUE INDEX "CaseInsurance_own_unique"
ON "CaseInsurance" ("ownIntakeId")
WHERE "party" = 'OWN';

-- Pro Intake max. 1x OPPONENT
CREATE UNIQUE INDEX "CaseInsurance_opponent_unique"
ON "CaseInsurance" ("opponentIntakeId")
WHERE "party" = 'OPPONENT';

-- CreateIndex
CREATE INDEX "CaseInsurance_party_idx" ON "CaseInsurance"("party");

-- CreateIndex
CREATE INDEX "CaseIntake_claimRoute_idx" ON "CaseIntake"("claimRoute");

-- CreateIndex
CREATE INDEX "CaseIntake_accidentDate_idx" ON "CaseIntake"("accidentDate");

-- AddForeignKey
ALTER TABLE "CaseInsurance" ADD CONSTRAINT "CaseInsurance_ownIntakeId_fkey" FOREIGN KEY ("ownIntakeId") REFERENCES "CaseIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseInsurance" ADD CONSTRAINT "CaseInsurance_opponentIntakeId_fkey" FOREIGN KEY ("opponentIntakeId") REFERENCES "CaseIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
