/**
 * Sub-Agents API — GET /api/sub-agents (list)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listSubAgents } from '@/lib/sub-agent';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(
      `sub-agents:${session.user.id}`,
      RATE_LIMIT_API,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listSubAgents(session.user.id, { status, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[SubAgents API] GET error:', error);
    return NextResponse.json({ error: 'Failed to list sub-agents' }, { status: 500 });
  }
}
