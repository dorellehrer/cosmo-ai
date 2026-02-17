import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';

// DELETE /api/integrations/[provider] — disconnect an integration
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider } = await params;

    const rateLimit = await checkRateLimitDistributed(`integration-disconnect:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Delete the integration (tokens are deleted with it)
    const deleted = await prisma.userIntegration.deleteMany({
      where: {
        userId: session.user.id,
        provider,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Integration disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
