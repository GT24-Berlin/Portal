-- CreateTable
CREATE TABLE "CaseNumberSequence" (
    "id" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CaseNumberSequence_pkey" PRIMARY KEY ("id")
);
