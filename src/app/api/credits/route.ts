import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';

/**
 * GET /api/credits — get user's current credit balance + purchase history
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await checkRateLimitDistributed(`credits:${session.user.id}`, RATE_LIMIT_API);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimit.headers }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        credits: true,
        reasoningEffort: true,
        creditPurchases: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            credits: true,
            amountCents: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      credits: user.credits,
      reasoningEffort: user.reasoningEffort,
      recentPurchases: user.creditPurchases,
    });
  } catch (error) {
    console.error('GET /api/credits error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
