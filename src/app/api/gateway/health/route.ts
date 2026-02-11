/**
 * GET /api/gateway/health
 *
 * Health check for the Gateway Hub. Public endpoint.
 * Returns hub stats and connection counts.
 */

import { NextResponse } from 'next/server';
import { gatewayHub } from '@/lib/gateway/hub';

export async function GET() {
  try {
    const stats = gatewayHub.getStats();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      gateway: stats,
    });
  } catch (error) {
    console.error('Gateway health check failed:', error);
    return NextResponse.json(
      { status: 'unhealthy', error: 'Gateway check failed' },
      { status: 503 }
    );
  }
}
