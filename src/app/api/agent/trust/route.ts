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

function isValidNormalizedIdentifier(channelType: string, identifier: string): boolean {
  if (!identifier) return false;

  switch (channelType) {
    case 'whatsapp':
    case 'sms':
      return /^\+?\d{8,15}$/.test(identifier);
    case 'telegram':
      return /^[a-z0-9_]{3,64}$/.test(identifier);
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    case 'discord':
    case 'slack':
    case 'webchat':
      return /^[a-z0-9._:@#+-]{2,128}$/.test(identifier);
    default:
      return identifier.length >= 2 && identifier.length <= 160;
  }
}

async function recordTrustAuditEvent(input: {
  userId: string;
  action: string;
  channelType?: string;
  senderIdentifier?: string;
  normalizedSender?: string;
}) {
  await prisma.$executeRaw`
    INSERT INTO "AgentTrustEvent" (
      id,
      "userId",
      "channelType",
      "senderIdentifier",
      "normalizedSender",
      action,
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${input.userId},
      ${input.channelType ?? 'system'},
      ${input.senderIdentifier ?? 'system'},
      ${input.normalizedSender ?? 'system'},
      ${input.action},
      NOW()
    )
  `;
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

    if (mode === 'owner_only') {
      const ownerCountRows = await prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "AgentTrustedContact"
        WHERE "userId" = ${session.user.id} AND "isOwner" = true
      `;
      const ownerCount = Number(ownerCountRows[0]?.count || 0);
      if (ownerCount < 1) {
        return NextResponse.json(
          { error: 'At least one owner contact is required for owner-only mode' },
          { status: 400 }
        );
      }
    }

    await prisma.$executeRaw`
      UPDATE "User"
      SET "channelTrustMode" = ${mode}
      WHERE id = ${session.user.id}
    `;

    await recordTrustAuditEvent({
      userId: session.user.id,
      action: 'policy_mode_changed',
      channelType: 'system',
      senderIdentifier: 'channelTrustMode',
      normalizedSender: mode,
    });

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

    if (!isValidNormalizedIdentifier(channelType, identifier)) {
      return NextResponse.json(
        { error: 'Invalid identifier format for channel type' },
        { status: 400 }
      );
    }

    if (!isOwner) {
      const existingRows = await prisma.$queryRaw<Array<{ isOwner: boolean }>>`
        SELECT "isOwner"
        FROM "AgentTrustedContact"
        WHERE "userId" = ${session.user.id}
          AND "channelType" = ${channelType}
          AND identifier = ${identifier}
        LIMIT 1
      `;

      if (existingRows[0]?.isOwner) {
        const ownerCountRows = await prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "AgentTrustedContact"
          WHERE "userId" = ${session.user.id} AND "isOwner" = true
        `;
        const ownerCount = Number(ownerCountRows[0]?.count || 0);
        if (ownerCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last owner contact. Add another owner first.' },
            { status: 400 }
          );
        }
      }
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

    await recordTrustAuditEvent({
      userId: session.user.id,
      action: isOwner ? 'trusted_contact_upserted_owner' : 'trusted_contact_upserted',
      channelType,
      senderIdentifier: identifier,
      normalizedSender: identifier,
    });

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
