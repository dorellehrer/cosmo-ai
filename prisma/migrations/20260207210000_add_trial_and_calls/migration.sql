-- AlterTable: Add trial fields to User
ALTER TABLE "User" ADD COLUMN "trialEnd" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "freeTrialUsed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: CallRecord for AI phone calls
CREATE TABLE "CallRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CallRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallRecord_userId_idx" ON "CallRecord"("userId");
CREATE INDEX "CallRecord_userId_createdAt_idx" ON "CallRecord"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
