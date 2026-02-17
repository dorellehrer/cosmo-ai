import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitDistributed, RATE_LIMIT_AUTH } from '@/lib/rate-limit';
import { deliverContactSubmission } from '@/lib/contact-delivery';

// Contact form API — sends to configured delivery channel (Webhook or AWS SES)

export async function POST(request: NextRequest) {
  // Rate limit: reuse auth preset (5 req/min) to prevent spam
  const rateLimitResult = await checkRateLimitDistributed(
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
    const { name, email, subject, message } = await request.json();

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const delivery = await deliverContactSubmission({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: String(subject || 'general').trim(),
      message: message.trim(),
    });

    return NextResponse.json({ success: true, delivery: delivery.method });
  } catch (error) {
    console.error('Contact form error:', error);

    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'Contact delivery is not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
