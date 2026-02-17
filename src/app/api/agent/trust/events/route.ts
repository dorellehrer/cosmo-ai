import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimitDistributed(`agent:trust:events:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers },
      );
    }

    const url = new URL(req.url);
    const hoursRaw = parseInt(url.searchParams.get('hours') || '24', 10);
    const hours = Number.isFinite(hoursRaw) ? Math.min(Math.max(hoursRaw, 1), 168) : 24;

    const totalsRows = await prisma.$queryRaw<Array<{ totalBlocked: bigint | number | string }>>`
      SELECT COUNT(*)::bigint AS "totalBlocked"
      FROM "AgentTrustEvent"
      WHERE "userId" = ${session.user.id}
        AND action = 'blocked_untrusted'
        AND "createdAt" >= NOW() - (${hours} * INTERVAL '1 hour')
    `;

    const byChannelRows = await prisma.$queryRaw<Array<{ channelType: string; count: bigint | number | string }>>`
      SELECT "channelType", COUNT(*)::bigint AS count
      FROM "AgentTrustEvent"
      WHERE "userId" = ${session.user.id}
        AND action = 'blocked_untrusted'
        AND "createdAt" >= NOW() - (${hours} * INTERVAL '1 hour')
      GROUP BY "channelType"
      ORDER BY count DESC
    `;

    const recentRows = await prisma.$queryRaw<Array<{
      id: string;
      channelType: string;
      senderIdentifier: string;
      normalizedSender: string;
      action: string;
      createdAt: Date;
    }>>`
      SELECT id, "channelType", "senderIdentifier", "normalizedSender", action, "createdAt"
      FROM "AgentTrustEvent"
      WHERE "userId" = ${session.user.id}
        AND action = 'blocked_untrusted'
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;

    const auditRows = await prisma.$queryRaw<Array<{ action: string; count: bigint | number | string }>>`
      SELECT action, COUNT(*)::bigint AS count
      FROM "AgentTrustEvent"
      WHERE "userId" = ${session.user.id}
        AND action <> 'blocked_untrusted'
        AND "createdAt" >= NOW() - (${hours} * INTERVAL '1 hour')
      GROUP BY action
      ORDER BY count DESC
    `;

    return NextResponse.json({
      windowHours: hours,
      totalBlocked: Number(totalsRows[0]?.totalBlocked || 0),
      byChannel: byChannelRows.map((row) => ({
        channelType: row.channelType,
        count: Number(row.count || 0),
      })),
      audit: auditRows.map((row) => ({
        action: row.action,
        count: Number(row.count || 0),
      })),
      recent: recentRows,
    });
  } catch (error) {
    console.error('Failed to fetch trust events:', error);
    return NextResponse.json({ error: 'Failed to fetch trust events' }, { status: 500 });
  }
}
