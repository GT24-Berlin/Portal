-- CreateEnum
CREATE TYPE "AssignmentRole" AS ENUM ('GUTACHTER', 'ANWALT');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'RELEASED', 'EXPIRED');

-- CreateTable
CREATE TABLE "CaseAssignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "role" "AssignmentRole" NOT NULL,
    "assigneeClerkUserId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "assignedByClerkUserId" TEXT,

    CONSTRAINT "CaseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseAssignment_assigneeClerkUserId_role_active_idx" ON "CaseAssignment"("assigneeClerkUserId", "role", "active");

-- CreateIndex
CREATE INDEX "CaseAssignment_status_active_expiresAt_idx" ON "CaseAssignment"("status", "active", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseAssignment_caseId_role_active_key" ON "CaseAssignment"("caseId", "role", "active");

-- AddForeignKey
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
