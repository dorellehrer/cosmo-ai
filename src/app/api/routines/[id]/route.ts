import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';
import { isValidCron, getNextRun } from '@/lib/cron';

// PATCH /api/routines/[id] — update routine (toggle, rename, reschedule)
export async function PATCH(
  request: Request,
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

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      data.name = body.name.trim();
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || null;
    }

    if (body.schedule !== undefined) {
      if (!isValidCron(body.schedule)) {
        return NextResponse.json({ error: 'Invalid cron schedule' }, { status: 400 });
      }
      data.schedule = body.schedule;
      data.nextRun = getNextRun(body.schedule);
    }

    if (body.toolChain !== undefined) {
      if (!Array.isArray(body.toolChain) || body.toolChain.length === 0) {
        return NextResponse.json({ error: 'Tool chain must be a non-empty array' }, { status: 400 });
      }
      data.toolChain = JSON.stringify(body.toolChain);
    }

    if (body.enabled !== undefined) {
      data.enabled = Boolean(body.enabled);
      // Recalculate next run when re-enabling
      if (data.enabled) {
        data.nextRun = getNextRun(body.schedule || routine.schedule);
      }
    }

    const updated = await prisma.routine.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      schedule: updated.schedule,
      toolChain: JSON.parse(updated.toolChain),
      enabled: updated.enabled,
      lastRun: updated.lastRun,
      nextRun: updated.nextRun,
    });
  } catch (error) {
    console.error('PATCH /api/routines/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/routines/[id] — delete a routine
export async function DELETE(
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

    await prisma.routine.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/routines/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
