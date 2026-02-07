-- AlterTable: Add preferredModel to User
ALTER TABLE "User" ADD COLUMN "preferredModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini';

-- AlterTable: Add model to Conversation
ALTER TABLE "Conversation" ADD COLUMN "model" TEXT;
