/**
 * GET /api/gateway
 *
 * WebSocket upgrade endpoint for device connections.
 * Devices connect here and register via the Gateway Hub protocol.
 *
 * Next.js 16 doesn't natively support WebSocket upgrade in App Router,
 * so this uses the Node.js HTTP server upgrade path via a custom server
 * or middleware. For now, this endpoint serves as the registration and
 * REST fallback, while the WebSocket server is initialised separately.
 *
 * In production, the WebSocket server runs on the same port via
 * a custom server setup or a separate micro-service behind the ALB.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';
import { gatewayHub } from '@/lib/gateway/hub';
import { getDeviceSummary } from '@/lib/gateway/message-router';

/**
 * GET /api/gateway
 * Returns the current gateway status and connected devices for the authenticated user.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`gateway:${session.user.id}`, RATE_LIMIT_API);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
  }

  try {
    const summary = getDeviceSummary(session.user.id);
    const stats = gatewayHub.getStats();

    return NextResponse.json({
      status: 'ok',
      user: {
        ...summary,
      },
      hub: {
        totalConnections: stats.totalConnections,
        totalUsers: stats.totalUsers,
      },
    });
  } catch (error) {
    console.error('Gateway status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
