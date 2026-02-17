/**
 * GET /api/gateway/health
 *
 * Health check for the Gateway Hub. Public endpoint.
 * Returns hub stats and connection counts.
 */

import { NextResponse } from 'next/server';
import { gatewayHub } from '@/lib/gateway/hub';
import { getGatewayClusterPresenceStats } from '@/lib/gateway/device-registry';
import { getGatewayDispatchQueueStats } from '@/lib/gateway/dispatch-queue';

export async function GET() {
  try {
    const [stats, cluster, dispatchQueue] = await Promise.all([
      Promise.resolve(gatewayHub.getStats()),
      getGatewayClusterPresenceStats(),
      getGatewayDispatchQueueStats(),
    ]);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      gateway: {
        local: stats,
        cluster,
        dispatchQueue,
      },
    });
  } catch (error) {
    console.error('Gateway health check failed:', error);
    return NextResponse.json(
      { status: 'unhealthy', error: 'Gateway check failed' },
      { status: 503 }
    );
  }
}
