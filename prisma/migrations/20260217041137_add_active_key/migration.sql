/*
  Warnings:

  - A unique constraint covering the columns `[caseId,role,activeKey]` on the table `CaseAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CaseAssignment_caseId_role_active_key";

-- AlterTable
ALTER TABLE "CaseAssignment" ADD COLUMN     "activeKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CaseAssignment_caseId_role_activeKey_key" ON "CaseAssignment"("caseId", "role", "activeKey");
