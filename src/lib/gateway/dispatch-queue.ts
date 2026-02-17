import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { ToolResultPayload } from './protocol';

export interface GatewayToolCallJob {
  id: string;
  userId: string;
  requiredCapability: string;
  tool: string;
  params: Record<string, unknown>;
  expiresAt: Date;
}

interface AwaitedGatewayToolCallResult {
  success: boolean;
  result: ToolResultPayload;
  processorInstance: string | null;
}

const POLL_INTERVAL_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

export async function enqueueGatewayToolCall(input: {
  userId: string;
  requiredCapability: string;
  tool: string;
  params: Record<string, unknown>;
  timeoutMs: number;
}): Promise<{ id: string; expiresAt: Date }> {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + Math.max(1000, input.timeoutMs));

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "GatewayToolCall" (
        "id",
        "userId",
        "requiredCapability",
        "tool",
        "params",
        "status",
        "expiresAt",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', $6, NOW(), NOW())
    `,
    id,
    input.userId,
    input.requiredCapability,
    input.tool,
    JSON.stringify(input.params),
    expiresAt,
  );

  return { id, expiresAt };
}

export async function awaitGatewayToolCallResult(
  id: string,
  timeoutMs: number,
): Promise<AwaitedGatewayToolCallResult> {
  const deadline = Date.now() + Math.max(1000, timeoutMs);

  while (Date.now() < deadline) {
    const rows = await prisma.$queryRawUnsafe<Array<{
      status: string;
      result: unknown;
      error: string | null;
      processorInstance: string | null;
    }>>(
      `
        SELECT status, result, error, "processorInstance"
        FROM "GatewayToolCall"
        WHERE id = $1
        LIMIT 1
      `,
      id,
    );

    const row = rows[0];
    if (!row) {
      return {
        success: false,
        result: { success: false, error: 'Distributed tool call no longer exists' },
        processorInstance: null,
      };
    }

    if (row.status === 'completed') {
      const parsed = parseJsonRecord(row.result);
      return {
        success: true,
        result: {
          success: parsed.success === true,
          result: parsed.result,
          error: typeof parsed.error === 'string' ? parsed.error : undefined,
        },
        processorInstance: row.processorInstance,
      };
    }

    if (row.status === 'failed' || row.status === 'expired') {
      return {
        success: false,
        result: {
          success: false,
          error: row.error || 'Distributed tool call failed',
        },
        processorInstance: row.processorInstance,
      };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE "GatewayToolCall"
      SET status = 'expired', error = COALESCE(error, 'Timed out waiting for distributed tool call'), "updatedAt" = NOW()
      WHERE id = $1 AND status IN ('pending', 'processing')
    `,
    id,
  );

  return {
    success: false,
    result: {
      success: false,
      error: 'Timed out waiting for distributed tool call',
    },
    processorInstance: null,
  };
}

export async function claimGatewayToolCallForInstance(
  instanceId: string,
  userIds: string[],
  capabilities: string[],
): Promise<GatewayToolCallJob | null> {
  if (userIds.length === 0 || capabilities.length === 0) {
    return null;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    userId: string;
    requiredCapability: string;
    tool: string;
    params: unknown;
    expiresAt: Date;
  }>>(
    `
      WITH candidate AS (
        SELECT id
        FROM "GatewayToolCall"
        WHERE status = 'pending'
          AND "expiresAt" > NOW()
          AND "userId" = ANY($1::text[])
          AND "requiredCapability" = ANY($2::text[])
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "GatewayToolCall" q
      SET status = 'processing', "processorInstance" = $3, "startedAt" = NOW(), "updatedAt" = NOW()
      FROM candidate
      WHERE q.id = candidate.id
      RETURNING q.id, q."userId", q."requiredCapability", q.tool, q.params, q."expiresAt"
    `,
    userIds,
    capabilities,
    instanceId,
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.userId,
    requiredCapability: row.requiredCapability,
    tool: row.tool,
    params: parseJsonRecord(row.params),
    expiresAt: new Date(row.expiresAt),
  };
}

export async function completeGatewayToolCall(
  id: string,
  result: ToolResultPayload,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `
      UPDATE "GatewayToolCall"
      SET status = 'completed', result = $2::jsonb, error = NULL, "completedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = $1
    `,
    id,
    JSON.stringify(result),
  );
}

export async function failGatewayToolCall(
  id: string,
  error: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `
      UPDATE "GatewayToolCall"
      SET status = 'failed', error = $2, "completedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = $1
    `,
    id,
    error,
  );
}

export async function expireStaleGatewayToolCalls(): Promise<number> {
  const result = await prisma.$executeRawUnsafe(
    `
      UPDATE "GatewayToolCall"
      SET status = 'expired', error = COALESCE(error, 'Expired before processing'), "updatedAt" = NOW()
      WHERE status IN ('pending', 'processing')
        AND "expiresAt" <= NOW()
    `,
  );

  return Number(result);
}

export async function getGatewayDispatchQueueStats(): Promise<{
  pending: number;
  processing: number;
  completedLastHour: number;
  expiredLastHour: number;
  failedLastHour: number;
}> {
  const rows = await prisma.$queryRawUnsafe<Array<{ status: string; count: bigint | number }>>(
    `
      SELECT status, COUNT(*)::bigint AS count
      FROM "GatewayToolCall"
      WHERE status IN ('pending', 'processing')
      GROUP BY status
    `,
  );

  const hourlyRows = await prisma.$queryRawUnsafe<Array<{ status: string; count: bigint | number }>>(
    `
      SELECT status, COUNT(*)::bigint AS count
      FROM "GatewayToolCall"
      WHERE status IN ('completed', 'expired', 'failed')
        AND "updatedAt" >= NOW() - INTERVAL '1 hour'
      GROUP BY status
    `,
  );

  const pending = rows.find((r) => r.status === 'pending');
  const processing = rows.find((r) => r.status === 'processing');
  const completed = hourlyRows.find((r) => r.status === 'completed');
  const expired = hourlyRows.find((r) => r.status === 'expired');
  const failed = hourlyRows.find((r) => r.status === 'failed');

  return {
    pending: Number(pending?.count || 0),
    processing: Number(processing?.count || 0),
    completedLastHour: Number(completed?.count || 0),
    expiredLastHour: Number(expired?.count || 0),
    failedLastHour: Number(failed?.count || 0),
  };
}
