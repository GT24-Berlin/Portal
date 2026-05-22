-- CreateEnum
CREATE TYPE "CaseAppointmentRole" AS ENUM ('GUTACHTER', 'ANWALT');

-- CreateEnum
CREATE TYPE "CaseAppointmentType" AS ENUM ('PHONE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "CaseAppointmentDuration" AS ENUM ('MINUTES_15', 'MINUTES_30');

-- CreateEnum
CREATE TYPE "CaseAppointmentRequestStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED', 'ALTERNATIVE_PROPOSED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PartnerAvailabilitySlot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "partnerId" TEXT NOT NULL,
    "role" "CaseAppointmentRole" NOT NULL,
    "appointmentType" "CaseAppointmentType" NOT NULL,
    "duration" "CaseAppointmentDuration" NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PartnerAvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAppointmentRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "role" "CaseAppointmentRole" NOT NULL,
    "appointmentType" "CaseAppointmentType" NOT NULL,
    "duration" "CaseAppointmentDuration" NOT NULL,
    "status" "CaseAppointmentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedStartAt" TIMESTAMP(3) NOT NULL,
    "requestedEndAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "customerNote" TEXT,
    "partnerResponseNote" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "CaseAppointmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAppointmentProposal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appointmentRequestId" TEXT NOT NULL,
    "proposedStartAt" TIMESTAMP(3) NOT NULL,
    "proposedEndAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),

    CONSTRAINT "CaseAppointmentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerAvailabilitySlot_partnerId_idx" ON "PartnerAvailabilitySlot"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerAvailabilitySlot_partnerId_role_isActive_idx" ON "PartnerAvailabilitySlot"("partnerId", "role", "isActive");

-- CreateIndex
CREATE INDEX "CaseAppointmentRequest_caseId_idx" ON "CaseAppointmentRequest"("caseId");

-- CreateIndex
CREATE INDEX "CaseAppointmentRequest_partnerId_idx" ON "CaseAppointmentRequest"("partnerId");

-- CreateIndex
CREATE INDEX "CaseAppointmentRequest_status_idx" ON "CaseAppointmentRequest"("status");

-- CreateIndex
CREATE INDEX "CaseAppointmentRequest_requestedStartAt_idx" ON "CaseAppointmentRequest"("requestedStartAt");

-- CreateIndex
CREATE INDEX "CaseAppointmentProposal_appointmentRequestId_idx" ON "CaseAppointmentProposal"("appointmentRequestId");

-- CreateIndex
CREATE INDEX "CaseAppointmentProposal_proposedStartAt_idx" ON "CaseAppointmentProposal"("proposedStartAt");

-- AddForeignKey
ALTER TABLE "PartnerAvailabilitySlot" ADD CONSTRAINT "PartnerAvailabilitySlot_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAppointmentRequest" ADD CONSTRAINT "CaseAppointmentRequest_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAppointmentRequest" ADD CONSTRAINT "CaseAppointmentRequest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAppointmentProposal" ADD CONSTRAINT "CaseAppointmentProposal_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "CaseAppointmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
