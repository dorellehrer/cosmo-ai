/**
 * Sub-Agent Detail API — GET /api/sub-agents/[id] (status) and DELETE (cancel)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSubAgentStatus, cancelSubAgent } from '@/lib/sub-agent';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const status = await getSubAgentStatus(session.user.id, id);
    if (!status) {
      return NextResponse.json({ error: 'Sub-agent not found' }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('[SubAgent API] GET error:', error);
    return NextResponse.json({ error: 'Failed to get sub-agent status' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(
      `sub-agent-cancel:${session.user.id}`,
      RATE_LIMIT_API,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id } = await params;

    const cancelled = await cancelSubAgent(session.user.id, id);
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Sub-agent not found or not running' },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: 'Sub-agent cancelled' });
  } catch (error) {
    console.error('[SubAgent API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to cancel sub-agent' }, { status: 500 });
  }
}
