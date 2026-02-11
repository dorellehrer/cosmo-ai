-- Remove trial system columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "trialEnd";
ALTER TABLE "User" DROP COLUMN IF EXISTS "freeTrialUsed";

-- Change credits default from 0 to 20 (new users get 20 free credits)
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 20;
