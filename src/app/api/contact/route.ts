import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMIT_AUTH } from '@/lib/rate-limit';

// Contact form API — sends email notification via AWS SES
// Falls back to logging if SES is not configured

export async function POST(request: NextRequest) {
  // Rate limit: reuse auth preset (5 req/min) to prevent spam
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

    const subjectMap: Record<string, string> = {
      general: 'General Inquiry',
      support: 'Support Request',
      billing: 'Billing Question',
      feedback: 'Feedback',
      partnership: 'Partnership Inquiry',
    };

    const emailSubject = `[Nova Contact] ${subjectMap[subject] || 'General'} from ${name}`;
    const emailBody = [
      `New contact form submission:`,
      ``,
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subjectMap[subject] || subject}`,
      ``,
      `Message:`,
      message,
      ``,
      `---`,
      `Sent from Nova AI contact form at ${new Date().toISOString()}`,
    ].join('\n');

    // Log the submission (appears in CloudWatch)
    // TODO: Add SES email delivery once domain is verified
    console.log('CONTACT FORM SUBMISSION:', emailSubject);
    console.log(emailBody);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
