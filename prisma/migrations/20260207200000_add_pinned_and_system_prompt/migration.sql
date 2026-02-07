-- Add pinned field to Conversation
ALTER TABLE "Conversation" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

-- Add systemPrompt field to User
ALTER TABLE "User" ADD COLUMN "systemPrompt" TEXT;
