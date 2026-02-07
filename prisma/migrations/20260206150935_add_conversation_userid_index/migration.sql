-- AlterTable
ALTER TABLE "AgentInstance" ALTER COLUMN "name" SET DEFAULT 'Nova';

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");
