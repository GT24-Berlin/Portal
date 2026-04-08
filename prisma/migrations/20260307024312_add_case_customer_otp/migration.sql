-- CreateTable
CREATE TABLE "CaseCustomerOtp" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "CaseCustomerOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseCustomerOtp_caseId_idx" ON "CaseCustomerOtp"("caseId");

-- CreateIndex
CREATE INDEX "CaseCustomerOtp_email_idx" ON "CaseCustomerOtp"("email");

-- CreateIndex
CREATE INDEX "CaseCustomerOtp_expiresAt_idx" ON "CaseCustomerOtp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseCustomerOtp_caseId_email_key" ON "CaseCustomerOtp"("caseId", "email");

-- AddForeignKey
ALTER TABLE "CaseCustomerOtp" ADD CONSTRAINT "CaseCustomerOtp_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
