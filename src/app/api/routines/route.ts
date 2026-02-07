import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';
import { isValidCron, getNextRun } from '@/lib/cron';

// GET /api/routines — list user's routines
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rateLimit = checkRateLimit(`routines:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimit.headers });
    }

    const routines = await prisma.routine.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json(routines.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      schedule: r.schedule,
      toolChain: JSON.parse(r.toolChain),
      enabled: r.enabled,
      lastRun: r.lastRun,
      nextRun: r.nextRun,
      lastExecution: r.executions[0] || null,
      createdAt: r.createdAt,
    })));
  } catch (error) {
    console.error('GET /api/routines error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/routines — create a new routine
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rateLimit = checkRateLimit(`routines:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimit.headers });
    }

    const body = await request.json();
    const { name, description, schedule, toolChain } = body;

    // Validate
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!schedule || !isValidCron(schedule)) {
      return NextResponse.json({ error: 'Invalid cron schedule' }, { status: 400 });
    }
    if (!toolChain || !Array.isArray(toolChain) || toolChain.length === 0) {
      return NextResponse.json({ error: 'Tool chain must be a non-empty array' }, { status: 400 });
    }

    // Validate each step
    for (const step of toolChain) {
      if (!step.toolName || typeof step.toolName !== 'string') {
        return NextResponse.json({ error: 'Each step must have a toolName' }, { status: 400 });
      }
    }

    // Limit routines per user
    const existingCount = await prisma.routine.count({ where: { userId: session.user.id } });
    if (existingCount >= 20) {
      return NextResponse.json({ error: 'Maximum 20 routines allowed' }, { status: 400 });
    }

    const nextRun = getNextRun(schedule);

    const routine = await prisma.routine.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        schedule,
        toolChain: JSON.stringify(toolChain),
        nextRun,
      },
    });

    return NextResponse.json({
      id: routine.id,
      name: routine.name,
      description: routine.description,
      schedule: routine.schedule,
      toolChain,
      enabled: routine.enabled,
      nextRun: routine.nextRun,
      createdAt: routine.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/routines error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
