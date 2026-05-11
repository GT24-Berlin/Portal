-- CreateTable
CREATE TABLE "OperationalEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT,
    "domain" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "message" TEXT,
    "metadata" JSONB,

    CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalEvent_caseId_createdAt_idx" ON "OperationalEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalEvent_domain_action_createdAt_idx" ON "OperationalEvent"("domain", "action", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalEvent_result_createdAt_idx" ON "OperationalEvent"("result", "createdAt");

-- AddForeignKey
ALTER TABLE "OperationalEvent" ADD CONSTRAINT "OperationalEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
