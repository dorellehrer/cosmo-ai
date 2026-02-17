import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stopAgent, restartAgent, destroyAgent, refreshAgentStatus, touchRunningAgentActivity } from '@/lib/agent';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';
import type { AgentStatus } from '@/types/agent';

// GET /api/agent/[id] — Get agent details with status refresh
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const rateLimit = await checkRateLimitDistributed(`agent:detail:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const { id } = await params;

    const agent = await refreshAgentStatus(session.user.id, id);

    // Fetch related data
    const [channels, skills, sessionCount, memoryCount] = await Promise.all([
      prisma.agentChannel.findMany({ where: { userId: session.user.id } }),
      prisma.agentSkill.findMany({ where: { userId: session.user.id } }),
      prisma.agentSession.count({ where: { agentInstanceId: id } }),
      prisma.agentMemory.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        personality: agent.personality,
        status: agent.status as AgentStatus,
        modelProvider: agent.modelProvider,
        modelName: agent.modelName,
        wsEndpoint: agent.wsEndpoint,
        publicIp: agent.publicIp,
        heartbeatEnabled: agent.heartbeatEnabled,
        heartbeatInterval: agent.heartbeatInterval,
        activeHoursStart: agent.activeHoursStart,
        activeHoursEnd: agent.activeHoursEnd,
        activeTimezone: agent.activeTimezone,
        lastHeartbeat: agent.lastHeartbeat?.toISOString() || null,
        lastActivity: agent.lastActivity?.toISOString() || null,
        errorMessage: agent.errorMessage,
        createdAt: agent.createdAt.toISOString(),
      },
      channels: channels.map(c => ({
        id: c.id,
        channelType: c.channelType,
        channelName: c.channelName,
        status: c.status,
        canSend: c.canSend,
        canReceive: c.canReceive,
        supportsMedia: c.supportsMedia,
        supportsGroups: c.supportsGroups,
        lastMessage: c.lastMessage?.toISOString() || null,
        errorMessage: c.errorMessage,
      })),
      skills: skills.map(s => ({
        id: s.id,
        skillId: s.skillId,
        name: s.name,
        description: s.description,
        version: s.version,
        enabled: s.enabled,
        source: s.source,
        installedAt: s.installedAt.toISOString(),
      })),
      stats: {
        sessionCount,
        memoryCount,
      },
    });
  } catch (error) {
    console.error('Failed to get agent:', error);
    return NextResponse.json({ error: 'Failed to get agent' }, { status: 500 });
  }
}

// PATCH /api/agent/[id] — Update agent settings or perform actions
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const rateLimitPatch = await checkRateLimitDistributed(`agent:update:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimitPatch.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitPatch.headers }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Handle actions
    if (body.action) {
      switch (body.action) {
        case 'stop':
          await stopAgent(session.user.id, id);
          return NextResponse.json({ message: 'Agent stopped' });

        case 'restart':
          await restartAgent(session.user.id, id);
          return NextResponse.json({ message: 'Agent restarting' });

        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    // Handle settings update
    const allowedFields = [
      'name', 'personality', 'heartbeatEnabled', 'heartbeatInterval',
      'heartbeatPrompt', 'activeHoursStart', 'activeHoursEnd', 'activeTimezone',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate field values
    const validationErrors: string[] = [];

    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0 || updateData.name.length > 100) {
        validationErrors.push('name must be a non-empty string up to 100 characters');
      } else {
        updateData.name = (updateData.name as string).trim();
      }
    }

    if (updateData.personality !== undefined) {
      const allowedPersonalities = ['friendly', 'professional', 'casual', 'concise', 'creative'];
      if (typeof updateData.personality !== 'string' || !allowedPersonalities.includes(updateData.personality)) {
        validationErrors.push(`personality must be one of: ${allowedPersonalities.join(', ')}`);
      }
    }

    if (updateData.heartbeatEnabled !== undefined) {
      if (typeof updateData.heartbeatEnabled !== 'boolean') {
        validationErrors.push('heartbeatEnabled must be a boolean');
      }
    }

    if (updateData.heartbeatInterval !== undefined) {
      const allowedIntervals = ['15m', '30m', '1h', '2h', '4h', '8h', '12h', '24h'];
      if (typeof updateData.heartbeatInterval !== 'string' || !allowedIntervals.includes(updateData.heartbeatInterval)) {
        validationErrors.push(`heartbeatInterval must be one of: ${allowedIntervals.join(', ')}`);
      }
    }

    if (updateData.heartbeatPrompt !== undefined) {
      if (updateData.heartbeatPrompt !== null && (typeof updateData.heartbeatPrompt !== 'string' || updateData.heartbeatPrompt.length > 500)) {
        validationErrors.push('heartbeatPrompt must be a string up to 500 characters or null');
      }
    }

    if (updateData.activeHoursStart !== undefined) {
      if (typeof updateData.activeHoursStart !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(updateData.activeHoursStart)) {
        validationErrors.push('activeHoursStart must be in HH:MM format (00:00–23:59)');
      }
    }

    if (updateData.activeHoursEnd !== undefined) {
      if (typeof updateData.activeHoursEnd !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(updateData.activeHoursEnd)) {
        validationErrors.push('activeHoursEnd must be in HH:MM format (00:00–23:59)');
      }
    }

    if (updateData.activeTimezone !== undefined) {
      if (typeof updateData.activeTimezone !== 'string' || updateData.activeTimezone.length > 50) {
        validationErrors.push('activeTimezone must be a valid timezone string');
      }
      // Validate it's a real IANA timezone
      try {
        Intl.DateTimeFormat(undefined, { timeZone: updateData.activeTimezone as string });
      } catch {
        validationErrors.push('activeTimezone is not a recognized IANA timezone');
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: validationErrors }, { status: 400 });
    }

    const agent = await prisma.agentInstance.updateMany({
      where: { id, userId: session.user.id },
      data: updateData,
    });

    if (agent.count === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    await touchRunningAgentActivity(session.user.id).catch(() => {});

    return NextResponse.json({ message: 'Agent updated' });
  } catch (error) {
    console.error('Failed to update agent:', error);
    const message = error instanceof Error ? error.message : 'Failed to update agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/agent/[id] — Destroy an agent
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const rateLimitDelete = await checkRateLimitDistributed(`agent:destroy:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimitDelete.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitDelete.headers }
      );
    }

    const { id } = await params;
    await destroyAgent(session.user.id, id);

    return NextResponse.json({ message: 'Agent destroyed' });
  } catch (error) {
    console.error('Failed to destroy agent:', error);
    const message = error instanceof Error ? error.message : 'Failed to destroy agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
