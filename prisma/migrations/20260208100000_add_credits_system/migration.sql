-- Add credit system to User
ALTER TABLE "User" ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "reasoningEffort" TEXT NOT NULL DEFAULT 'low';

-- Update default preferredModel for new users (existing users keep their value)
ALTER TABLE "User" ALTER COLUMN "preferredModel" SET DEFAULT 'gpt-5-mini';

-- Credit purchase ledger
CREATE TABLE "CreditPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "CreditPurchase_stripeSessionId_key" ON "CreditPurchase"("stripeSessionId");
CREATE INDEX "CreditPurchase_userId_idx" ON "CreditPurchase"("userId");

-- Foreign key
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Give existing users 50 starter credits
UPDATE "User" SET "credits" = 50 WHERE "credits" = 0;
