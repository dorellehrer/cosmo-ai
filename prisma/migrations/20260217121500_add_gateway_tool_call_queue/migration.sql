-- CreateTable: GatewayToolCall
CREATE TABLE "GatewayToolCall" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requiredCapability" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "error" TEXT,
    "processorInstance" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GatewayToolCall_status_createdAt_idx" ON "GatewayToolCall"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GatewayToolCall_userId_requiredCapability_status_idx" ON "GatewayToolCall"("userId", "requiredCapability", "status");

-- CreateIndex
CREATE INDEX "GatewayToolCall_expiresAt_idx" ON "GatewayToolCall"("expiresAt");
