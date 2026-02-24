/*
  Warnings:

  - You are about to drop the column `track` on the `CaseEvent` table. All the data in the column will be lost.
  - Added the required column `lane` to the `CaseEvent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CaseLane" AS ENUM ('GUTACHTER', 'ANWALT');

-- DropIndex
DROP INDEX "CaseEvent_caseId_track_occurredAt_idx";

-- AlterTable
ALTER TABLE "CaseEvent" DROP COLUMN "track",
ADD COLUMN     "lane" "CaseLane" NOT NULL;

-- CreateIndex
CREATE INDEX "CaseEvent_caseId_lane_occurredAt_idx" ON "CaseEvent"("caseId", "lane", "occurredAt");
