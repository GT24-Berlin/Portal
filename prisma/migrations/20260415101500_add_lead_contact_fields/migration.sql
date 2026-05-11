-- Add contact/address fields to Lead for admin lead creation
ALTER TABLE "Lead" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Lead" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Lead" ADD COLUMN "email" TEXT;
ALTER TABLE "Lead" ADD COLUMN "phone" TEXT;
ALTER TABLE "Lead" ADD COLUMN "street" TEXT;
ALTER TABLE "Lead" ADD COLUMN "houseNumber" TEXT;
ALTER TABLE "Lead" ADD COLUMN "zipCode" TEXT;
ALTER TABLE "Lead" ADD COLUMN "city" TEXT;
