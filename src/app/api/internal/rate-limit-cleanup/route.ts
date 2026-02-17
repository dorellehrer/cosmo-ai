import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredRateLimitBuckets } from '@/lib/rate-limit';

function isAuthorized(request: NextRequest): boolean {
  const token = process.env.RATE_LIMIT_MAINTENANCE_TOKEN || process.env.CRON_SECRET || '';
  if (!token) return false;

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = request.headers.get('x-maintenance-token') || '';

  return bearerToken === token || headerToken === token;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const batchSize = Math.min(Math.max(parseInt(searchParams.get('batchSize') || '5000', 10), 1), 20000);
    const maxBatches = Math.min(Math.max(parseInt(searchParams.get('maxBatches') || '3', 10), 1), 20);
    const graceSeconds = Math.max(parseInt(searchParams.get('graceSeconds') || '3600', 10), 0);

    let totalDeleted = 0;
    let batches = 0;

    while (batches < maxBatches) {
      const deleted = await cleanupExpiredRateLimitBuckets({ batchSize, graceSeconds });
      batches++;
      totalDeleted += deleted;

      if (deleted < batchSize) {
        break;
      }
    }

    console.log(`[rate-limit-cleanup] deleted=${totalDeleted} batches=${batches} batchSize=${batchSize} graceSeconds=${graceSeconds}`);

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      batches,
      batchSize,
      graceSeconds,
    });
  } catch (error) {
    console.error('Rate-limit cleanup failed:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
