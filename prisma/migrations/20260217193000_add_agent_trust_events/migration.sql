-- Persist trust enforcement events for diagnostics
CREATE TABLE IF NOT EXISTS "AgentTrustEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelType" TEXT NOT NULL,
  "senderIdentifier" TEXT NOT NULL,
  "normalizedSender" TEXT NOT NULL,
  "action" TEXT NOT NULL DEFAULT 'blocked_untrusted',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentTrustEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgentTrustEvent_userId_createdAt_idx"
  ON "AgentTrustEvent"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "AgentTrustEvent_userId_action_idx"
  ON "AgentTrustEvent"("userId", "action");

CREATE INDEX IF NOT EXISTS "AgentTrustEvent_userId_channelType_idx"
  ON "AgentTrustEvent"("userId", "channelType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AgentTrustEvent_userId_fkey'
  ) THEN
    ALTER TABLE "AgentTrustEvent"
      ADD CONSTRAINT "AgentTrustEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
