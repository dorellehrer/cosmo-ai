import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';
import { touchRunningAgentActivity, triggerAgentConfigReload } from '@/lib/agent';

type TrustMode = 'owner_only' | 'allowlist' | 'open';

const TRUST_MODES = new Set<TrustMode>(['owner_only', 'allowlist', 'open']);

function normalizeChannelType(channelType: string): string {
  return channelType.trim().toLowerCase();
}

function normalizePhoneLike(value: string): string {
  let normalized = value
    .trim()
    .toLowerCase()
    .replace(/^(whatsapp:|sms:|tel:)/, '')
    .replace(/[\s().-]/g, '');

  const hadPlus = normalized.startsWith('+');
  normalized = normalized.replace(/\+/g, '').replace(/\D/g, '');

  if (!normalized) return '';
  if (!hadPlus && normalized.startsWith('00')) {
    return `+${normalized.slice(2)}`;
  }

  return hadPlus ? `+${normalized}` : normalized;
}

function normalizeIdentifier(channelType: string, identifier: string): string {
  const normalizedChannel = normalizeChannelType(channelType);
  const raw = identifier.trim();

  if (!raw) return '';

  switch (normalizedChannel) {
    case 'whatsapp':
    case 'sms':
      return normalizePhoneLike(raw);
    case 'telegram':
      return raw.toLowerCase().replace(/^@+/, '');
    case 'email':
      return raw.toLowerCase();
    case 'discord':
    case 'slack':
    case 'webchat':
      return raw.toLowerCase();
    default:
      return raw.toLowerCase();
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimitDistributed(`agent:trust:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const userRows = await prisma.$queryRaw<Array<{ channelTrustMode: string }>>`
      SELECT "channelTrustMode"
      FROM "User"
      WHERE id = ${session.user.id}
      LIMIT 1
    `;

    const contactRows = await prisma.$queryRaw<Array<{
      id: string;
      channelType: string;
      identifier: string;
      label: string | null;
      isOwner: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT id, "channelType", identifier, label, "isOwner", "createdAt", "updatedAt"
      FROM "AgentTrustedContact"
      WHERE "userId" = ${session.user.id}
      ORDER BY "isOwner" DESC, "updatedAt" DESC
    `;

    return NextResponse.json({
      mode: (userRows[0]?.channelTrustMode || 'allowlist') as TrustMode,
      contacts: contactRows,
    });
  } catch (error) {
    console.error('Failed to fetch trust policy:', error);
    return NextResponse.json({ error: 'Failed to fetch trust policy' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimitDistributed(`agent:trust:update:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const body = await req.json();
    const mode = body?.mode as TrustMode | undefined;
    if (!mode || !TRUST_MODES.has(mode)) {
      return NextResponse.json({ error: 'Invalid trust mode' }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE "User"
      SET "channelTrustMode" = ${mode}
      WHERE id = ${session.user.id}
    `;

    await touchRunningAgentActivity(session.user.id).catch(() => {});
    await triggerAgentConfigReload(session.user.id).catch((err) => {
      console.warn('[agent/trust] config.reload failed:', err);
    });

    return NextResponse.json({ mode });
  } catch (error) {
    console.error('Failed to update trust policy:', error);
    return NextResponse.json({ error: 'Failed to update trust policy' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimitDistributed(`agent:trust:create:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const body = await req.json();
    const channelType = typeof body?.channelType === 'string' ? normalizeChannelType(body.channelType) : '';
    const identifierRaw = typeof body?.identifier === 'string' ? body.identifier : '';
    const label = typeof body?.label === 'string' ? body.label.trim() : null;
    const isOwner = Boolean(body?.isOwner);

    const identifier = normalizeIdentifier(channelType, identifierRaw);

    if (!channelType || !identifier) {
      return NextResponse.json({ error: 'channelType and identifier are required' }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<Array<{
      id: string;
      channelType: string;
      identifier: string;
      label: string | null;
      isOwner: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      INSERT INTO "AgentTrustedContact" (id, "userId", "channelType", identifier, label, "isOwner", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${session.user.id}, ${channelType}, ${identifier}, ${label}, ${isOwner}, NOW(), NOW())
      ON CONFLICT ("userId", "channelType", identifier)
      DO UPDATE SET
        label = EXCLUDED.label,
        "isOwner" = EXCLUDED."isOwner",
        "updatedAt" = NOW()
      RETURNING id, "channelType", identifier, label, "isOwner", "createdAt", "updatedAt"
    `;

    await touchRunningAgentActivity(session.user.id).catch(() => {});
    await triggerAgentConfigReload(session.user.id).catch((err) => {
      console.warn('[agent/trust] config.reload failed:', err);
    });

    return NextResponse.json({ contact: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to upsert trusted contact:', error);
    return NextResponse.json({ error: 'Failed to upsert trusted contact' }, { status: 500 });
  }
}
