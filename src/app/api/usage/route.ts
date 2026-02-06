import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserTier, TIERS, getRemainingMessages } from '@/lib/stripe';

// Get today's date in YYYY-MM-DD format
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get today's usage
    const today = getToday();
    const usageRecord = await prisma.usageRecord.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    const currentUsage = usageRecord?.count || 0;
    const tier = getUserTier(user.stripeSubscriptionId, user.stripeCurrentPeriodEnd);
    const tierConfig = TIERS[tier];
    const remaining = getRemainingMessages(tier, currentUsage);

    return NextResponse.json({
      tier,
      tierName: tierConfig.name,
      limit: tierConfig.messagesPerDay,
      used: currentUsage,
      remaining,
      subscriptionEnd: user.stripeCurrentPeriodEnd,
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage' },
      { status: 500 }
    );
  }
}
