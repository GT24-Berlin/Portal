-- CreateTable
CREATE TABLE "PartnerProfile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "role" "PartnerType" NOT NULL,
    "companyName" TEXT,
    "legalForm" TEXT,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "street" TEXT,
    "houseNumber" TEXT,
    "zipCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "region" TEXT,
    "partnerId" TEXT,

    CONSTRAINT "PartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfile_clerkUserId_key" ON "PartnerProfile"("clerkUserId");

-- CreateIndex
CREATE INDEX "PartnerProfile_role_idx" ON "PartnerProfile"("role");

-- CreateIndex
CREATE INDEX "PartnerProfile_partnerId_idx" ON "PartnerProfile"("partnerId");

-- AddForeignKey
ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
