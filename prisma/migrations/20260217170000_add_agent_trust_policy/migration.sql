-- Add per-user channel trust policy mode
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "channelTrustMode" TEXT NOT NULL DEFAULT 'allowlist';

-- Trusted contacts table for owner/allowlist controls
CREATE TABLE IF NOT EXISTS "AgentTrustedContact" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelType" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "label" TEXT,
  "isOwner" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentTrustedContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentTrustedContact_userId_channelType_identifier_key"
  ON "AgentTrustedContact"("userId", "channelType", "identifier");

CREATE INDEX IF NOT EXISTS "AgentTrustedContact_userId_idx"
  ON "AgentTrustedContact"("userId");

CREATE INDEX IF NOT EXISTS "AgentTrustedContact_userId_channelType_idx"
  ON "AgentTrustedContact"("userId", "channelType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AgentTrustedContact_userId_fkey'
  ) THEN
    ALTER TABLE "AgentTrustedContact"
      ADD CONSTRAINT "AgentTrustedContact_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
