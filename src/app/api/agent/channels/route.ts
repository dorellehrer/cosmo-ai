import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';
import { storeApiKeySecret } from '@/lib/aws';

// GET /api/agent/channels — List connected channels
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const rateLimit = checkRateLimit(`agent:channels:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const channels = await prisma.agentChannel.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Failed to fetch channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

// POST /api/agent/channels — Connect a new channel
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const rateLimitPost = checkRateLimit(`agent:channels:create:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimitPost.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitPost.headers }
      );
    }

    const body = await req.json();
    const { channelType, channelName, externalId, config } = body;

    if (!channelType || !channelName) {
      return NextResponse.json(
        { error: 'channelType and channelName are required' },
        { status: 400 }
      );
    }

    // Check if channel already exists
    const existing = await prisma.agentChannel.findFirst({
      where: {
        userId: session.user.id,
        channelType,
        externalId: externalId || null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This channel is already connected' },
        { status: 409 }
      );
    }

    // Determine capabilities based on channel type
    const capabilities = getChannelCapabilities(channelType);

    const channel = await prisma.agentChannel.create({
      data: {
        userId: session.user.id,
        channelType,
        channelName,
        externalId: externalId || null,
        status: 'pending',
        ...capabilities,
      },
    });

    // Store channel credentials in AWS Secrets Manager if config provided
    if (config && typeof config === 'object') {
      try {
        const secretArn = await storeApiKeySecret(
          session.user.id,
          `channel-${channelType}-${channel.id}`,
          JSON.stringify(config)
        );

        await prisma.agentChannel.update({
          where: { id: channel.id },
          data: {
            configSecretArn: secretArn,
            status: 'connected',
          },
        });

        return NextResponse.json({
          channel: { ...channel, configSecretArn: secretArn, status: 'connected' },
        }, { status: 201 });
      } catch (secretError) {
        console.error('Failed to store channel credentials:', secretError);
        // Channel was created but credentials failed — keep as pending
      }
    }

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error('Failed to connect channel:', error);
    return NextResponse.json({ error: 'Failed to connect channel' }, { status: 500 });
  }
}

function getChannelCapabilities(channelType: string) {
  switch (channelType) {
    case 'whatsapp':
      return { canSend: true, canReceive: true, supportsMedia: true, supportsGroups: true };
    case 'telegram':
      return { canSend: true, canReceive: true, supportsMedia: true, supportsGroups: true };
    case 'discord':
      return { canSend: true, canReceive: true, supportsMedia: true, supportsGroups: true };
    case 'slack':
      return { canSend: true, canReceive: true, supportsMedia: true, supportsGroups: true };
    case 'gmail':
      return { canSend: true, canReceive: true, supportsMedia: false, supportsGroups: false };
    case 'webchat':
      return { canSend: true, canReceive: true, supportsMedia: false, supportsGroups: false };
    default:
      return { canSend: true, canReceive: true, supportsMedia: false, supportsGroups: false };
  }
}
