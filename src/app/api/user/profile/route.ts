import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';
import { isPro } from '@/lib/stripe';
import { MODELS, DEFAULT_MODEL, REASONING_LEVELS } from '@/lib/ai/models';

// GET /api/user/profile — fetch current user profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rateLimit = checkRateLimit(`profile:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        preferredModel: true,
        systemPrompt: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        credits: true,
        reasoningEffort: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      isPro: isPro(user),
      preferredModel: user.preferredModel || DEFAULT_MODEL,
      systemPrompt: user.systemPrompt || '',
      credits: user.credits,
      reasoningEffort: user.reasoningEffort || 'low',
    });
  } catch (error) {
    console.error('GET /api/user/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/user/profile — update user profile (name, preferredModel)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rateLimit = checkRateLimit(`profile:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const body = await request.json();
    const data: Record<string, string | null> = {};

    // Name update
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      if (body.name.trim().length > 100) {
        return NextResponse.json({ error: 'Name too long (max 100 characters)' }, { status: 400 });
      }
      data.name = body.name.trim();
    }

    // Model preference update
    if (body.preferredModel !== undefined) {
      if (typeof body.preferredModel !== 'string' || !MODELS[body.preferredModel]) {
        return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
      }
      data.preferredModel = body.preferredModel;
    }

    // Reasoning effort update
    if (body.reasoningEffort !== undefined) {
      if (typeof body.reasoningEffort !== 'string' || !REASONING_LEVELS.includes(body.reasoningEffort as typeof REASONING_LEVELS[number])) {
        return NextResponse.json({ error: 'Invalid reasoning effort. Must be low, medium, or high.' }, { status: 400 });
      }
      data.reasoningEffort = body.reasoningEffort;
    }

    // System prompt update
    if (body.systemPrompt !== undefined) {
      if (typeof body.systemPrompt !== 'string') {
        return NextResponse.json({ error: 'Invalid system prompt' }, { status: 400 });
      }
      const trimmed = body.systemPrompt.trim();
      if (trimmed.length > 1000) {
        return NextResponse.json({ error: 'System prompt too long (max 1000 characters)' }, { status: 400 });
      }
      data.systemPrompt = trimmed || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, preferredModel: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('PATCH /api/user/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
