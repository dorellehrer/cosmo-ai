import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMIT_AUTH } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 5 req/min per IP to prevent spam
  const rateLimitResult = checkRateLimit(
    request.headers.get('x-forwarded-for') || 'unknown',
    RATE_LIMIT_AUTH
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const { email, source } = await request.json();

    // Validate email
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Upsert: if already subscribed, just update source & re-subscribe
    await prisma.newsletterSubscriber.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {
        source: source || 'waitlist',
        unsubscribedAt: null, // Re-subscribe if previously unsubscribed
      },
      create: {
        email: email.toLowerCase().trim(),
        source: source || 'waitlist',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
