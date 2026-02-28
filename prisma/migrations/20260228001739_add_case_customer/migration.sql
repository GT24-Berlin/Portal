-- CreateTable
CREATE TABLE "CaseCustomer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "CaseCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseCustomer_caseId_key" ON "CaseCustomer"("caseId");

-- CreateIndex
CREATE INDEX "CaseCustomer_email_idx" ON "CaseCustomer"("email");

-- AddForeignKey
ALTER TABLE "CaseCustomer" ADD CONSTRAINT "CaseCustomer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
