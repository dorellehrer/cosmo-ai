import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';

// GET /api/integrations — list user's connected integrations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimitDistributed(`integrations:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const integrations = await prisma.userIntegration.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        email: true,
        providerAccountId: true,
        connectedAt: true,
        scope: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error('Failed to list integrations:', error);
    return NextResponse.json({ error: 'Failed to list integrations' }, { status: 500 });
  }
}
