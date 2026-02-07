import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildAuthorizationUrl, OAUTH_PROVIDERS, NON_OAUTH_PROVIDERS } from '@/lib/integrations';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';
import crypto from 'crypto';

// POST /api/integrations/[provider]/connect — initiate OAuth flow
export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider } = await params;

    const rateLimit = checkRateLimit(`integration-connect:${session.user.id}`, RATE_LIMIT_API);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if provider uses standard OAuth
    if (NON_OAUTH_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `${provider} uses a custom connection flow — not yet supported` },
        { status: 400 }
      );
    }

    if (!OAUTH_PROVIDERS[provider]) {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    // Verify provider credentials are configured
    const config = OAUTH_PROVIDERS[provider]();
    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json(
        { error: `${provider} integration is not configured. Missing API credentials.` },
        { status: 503 }
      );
    }

    // Generate state parameter (CSRF protection) — includes userId for verification
    const statePayload = JSON.stringify({
      userId: session.user.id,
      nonce: crypto.randomBytes(16).toString('hex'),
      ts: Date.now(),
    });
    const state = Buffer.from(statePayload).toString('base64url');

    const authUrl = buildAuthorizationUrl(provider, state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Integration connect error:', error);
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
  }
}
