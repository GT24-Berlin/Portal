-- AlterTable: add optional specificDate to PartnerAvailabilitySlot
-- null  = slot repeats every week on the stored weekday (existing behaviour)
-- value = slot applies once for that specific calendar date only
ALTER TABLE "PartnerAvailabilitySlot" ADD COLUMN "specificDate" TIMESTAMP(3);
