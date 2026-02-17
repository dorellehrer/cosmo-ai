import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitDistributed, RATE_LIMIT_AUTH } from '@/lib/rate-limit';
import { stripe } from '@/lib/stripe';
import { destroyAgent } from '@/lib/agent';

// DELETE /api/user/delete — permanently delete user account and all data
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rateLimit = await checkRateLimitDistributed(`delete:${session.user.id}`, RATE_LIMIT_AUTH);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const userId = session.user.id;

    // Fetch user for Stripe cleanup
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true, stripeCustomerId: true },
    });

    // Cancel Stripe subscription if active
    if (user?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (err) {
        console.error('Failed to cancel Stripe subscription:', err);
      }
    }

    // Stop and destroy all running agent containers
    const agents = await prisma.agentInstance.findMany({
      where: { userId, status: { in: ['running', 'provisioning', 'stopped'] } },
    });
    for (const agent of agents) {
      try {
        await destroyAgent(userId, agent.id);
      } catch (err) {
        console.error(`Failed to destroy agent ${agent.id}:`, err);
      }
    }

    // Delete all user data in dependency order
    await prisma.$transaction([
      prisma.agentMemory.deleteMany({ where: { userId } }),
      prisma.agentChannel.deleteMany({ where: { userId } }),
      prisma.agentSkill.deleteMany({ where: { userId } }),
      prisma.agentInstance.deleteMany({ where: { userId } }),
      prisma.message.deleteMany({ where: { conversation: { userId } } }),
      prisma.conversation.deleteMany({ where: { userId } }),
      prisma.usageRecord.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/user/delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
