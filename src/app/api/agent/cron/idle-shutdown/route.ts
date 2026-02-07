import { NextResponse } from 'next/server';
import { stopIdleAgents } from '@/lib/agent';

/**
 * POST /api/agent/cron/idle-shutdown
 *
 * Called by an external scheduler (e.g., CloudWatch Events, GitHub Actions cron,
 * or an ECS scheduled task) to stop agents that have been idle too long.
 *
 * Protected by a shared secret — set CRON_SECRET in your environment.
 */
export async function POST(req: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await stopIdleAgents();
    return NextResponse.json({
      message: 'Idle shutdown sweep complete',
      ...result,
    });
  } catch (error) {
    console.error('Idle shutdown cron failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
