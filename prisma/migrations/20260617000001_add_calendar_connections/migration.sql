-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'MICROSOFT', 'APPLE');

-- CreateTable
CREATE TABLE "PartnerCalendarConnection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "partnerId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "accountEmail" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "calendarId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCalendarEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectionId" TEXT NOT NULL,
    "appointmentRequestId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCalendarConnection_partnerId_provider_key" ON "PartnerCalendarConnection"("partnerId", "provider");
CREATE INDEX "PartnerCalendarConnection_partnerId_idx" ON "PartnerCalendarConnection"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCalendarEvent_connectionId_appointmentRequestId_key" ON "PartnerCalendarEvent"("connectionId", "appointmentRequestId");
CREATE INDEX "PartnerCalendarEvent_appointmentRequestId_idx" ON "PartnerCalendarEvent"("appointmentRequestId");

-- AddForeignKey
ALTER TABLE "PartnerCalendarConnection" ADD CONSTRAINT "PartnerCalendarConnection_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCalendarEvent" ADD CONSTRAINT "PartnerCalendarEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PartnerCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
