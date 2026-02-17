import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';

// GET /api/routines/[id]/history — get execution history for a routine
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const rateLimit = await checkRateLimitDistributed(`routines:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimit.headers });
    }

    // Verify ownership
    const routine = await prisma.routine.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    const executions = await prisma.routineExecution.findMany({
      where: { routineId: id },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(executions.map((e) => ({
      id: e.id,
      status: e.status,
      result: e.result ? JSON.parse(e.result) : null,
      error: e.error,
      startedAt: e.startedAt,
      finishedAt: e.finishedAt,
    })));
  } catch (error) {
    console.error('GET /api/routines/[id]/history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
