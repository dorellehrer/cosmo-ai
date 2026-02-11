-- CreateExtension: pgvector (must be run by a superuser or rds_superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable: Memory (semantic memory with pgvector embeddings)
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "embedding" vector(1536),
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'extracted',
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SubAgent (background task execution)
CREATE TABLE "SubAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentConversationId" TEXT,
    "task" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "result" TEXT,
    "error" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-5-mini',
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "steps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SubAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Memory_userId_idx" ON "Memory"("userId");
CREATE INDEX "Memory_userId_category_idx" ON "Memory"("userId", "category");
CREATE INDEX "Memory_importance_idx" ON "Memory"("importance");

-- CreateIndex
CREATE INDEX "SubAgent_userId_idx" ON "SubAgent"("userId");
CREATE INDEX "SubAgent_userId_status_idx" ON "SubAgent"("userId", "status");
CREATE INDEX "SubAgent_parentConversationId_idx" ON "SubAgent"("parentConversationId");

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubAgent" ADD CONSTRAINT "SubAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubAgent" ADD CONSTRAINT "SubAgent_parentConversationId_fkey" FOREIGN KEY ("parentConversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- HNSW index for fast nearest-neighbor recall (cosine distance)
CREATE INDEX "Memory_embedding_idx" ON "Memory" USING hnsw ("embedding" vector_cosine_ops);
