-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ASSIGNMENT_CREATED', 'ASSIGNMENT_ACCEPTED', 'ASSIGNMENT_RELEASED', 'ASSIGNMENT_EXPIRED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "caseId" TEXT,
    "role" "CaseLane",
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_caseId_idx" ON "Notification"("caseId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
