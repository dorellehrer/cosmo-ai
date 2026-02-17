import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_API } from '@/lib/rate-limit';
import { touchRunningAgentActivity, triggerAgentConfigReload } from '@/lib/agent';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimitDistributed(`agent:trust:delete:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const existingRows = await prisma.$queryRaw<Array<{ isOwner: boolean }>>`
      SELECT "isOwner"
      FROM "AgentTrustedContact"
      WHERE id = ${id} AND "userId" = ${session.user.id}
      LIMIT 1
    `;

    if (!existingRows[0]) {
      return NextResponse.json({ error: 'Trusted contact not found' }, { status: 404 });
    }

    if (existingRows[0].isOwner) {
      const ownerCountRows = await prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "AgentTrustedContact"
        WHERE "userId" = ${session.user.id} AND "isOwner" = true
      `;
      const ownerCount = Number(ownerCountRows[0]?.count || 0);
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last owner contact. Add another owner first.' },
          { status: 400 }
        );
      }
    }

    const deleted = await prisma.$executeRaw`
      DELETE FROM "AgentTrustedContact"
      WHERE id = ${id} AND "userId" = ${session.user.id}
    `;

    await touchRunningAgentActivity(session.user.id).catch(() => {});
    await triggerAgentConfigReload(session.user.id).catch((err) => {
      console.warn('[agent/trust] config.reload failed:', err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete trusted contact:', error);
    return NextResponse.json({ error: 'Failed to delete trusted contact' }, { status: 500 });
  }
}
