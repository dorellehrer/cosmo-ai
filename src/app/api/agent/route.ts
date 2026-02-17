import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { provisionAgent } from '@/lib/agent';
import { checkRateLimitDistributed, RATE_LIMIT_API, RATE_LIMIT_AGENT_PROVISION } from '@/lib/rate-limit';
import { isPro } from '@/lib/stripe';
import type { AgentStatus, ProvisionAgentRequest, ProvisioningEvent } from '@/types/agent';

// GET /api/agent — List user's agent instances
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const rateLimit = await checkRateLimitDistributed(`agent:list:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const agents = await prisma.agentInstance.findMany({
      where: {
        userId: session.user.id,
        status: { not: 'destroyed' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        personality: a.personality,
        status: a.status as AgentStatus,
        modelProvider: a.modelProvider,
        modelName: a.modelName,
        wsEndpoint: a.wsEndpoint,
        publicIp: a.publicIp,
        heartbeatEnabled: a.heartbeatEnabled,
        heartbeatInterval: a.heartbeatInterval,
        activeHoursStart: a.activeHoursStart,
        activeHoursEnd: a.activeHoursEnd,
        activeTimezone: a.activeTimezone,
        lastHeartbeat: a.lastHeartbeat?.toISOString() || null,
        lastActivity: a.lastActivity?.toISOString() || null,
        errorMessage: a.errorMessage,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

// POST /api/agent — Provision a new agent (SSE stream)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check — agent provisioning is very expensive
    const rateLimit = await checkRateLimitDistributed(`agent:provision:${session.user.id}`, RATE_LIMIT_AGENT_PROVISION);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    // Only Pro users can provision agents (they cost ~$8.50/mo each on Fargate)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeSubscriptionId: true, stripeCurrentPeriodEnd: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isPro(user)) {
      return NextResponse.json(
        { error: 'Agent provisioning requires a Pro subscription. Upgrade at /pricing.' },
        { status: 403 }
      );
    }

    // Check if user already has an active agent (limit 1 for pro)
    const existingAgent = await prisma.agentInstance.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['pending', 'provisioning', 'running', 'stopped'] },
      },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: 'You already have an active agent. Stop or destroy it first.' },
        { status: 409 }
      );
    }

    const body: ProvisionAgentRequest = await req.json();

    // Validate required fields
    if (!body.name || !body.modelProvider || !body.modelName || !body.apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: name, modelProvider, modelName, apiKey' },
        { status: 400 }
      );
    }

    // Stream provisioning events via SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: ProvisioningEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        for await (const event of provisionAgent(session.user.id, body)) {
          sendEvent(event);
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Failed to provision agent:', error);
    return NextResponse.json({ error: 'Failed to provision agent' }, { status: 500 });
  }
}
