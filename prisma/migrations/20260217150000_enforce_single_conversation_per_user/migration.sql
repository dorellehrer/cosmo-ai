-- Single-chat mode hardening
-- Keep exactly one conversation per user (most recently active), remove extras,
-- then enforce DB-level uniqueness.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
    ) AS rn
  FROM "Conversation"
)
DELETE FROM "Conversation"
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Drop legacy non-unique index before creating unique constraint
DROP INDEX IF EXISTS "Conversation_userId_idx";

-- Enforce one conversation per user at database level
CREATE UNIQUE INDEX "Conversation_userId_key" ON "Conversation"("userId");
