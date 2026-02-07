import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  exchangeCodeForTokens,
  fetchProviderUserInfo,
  encryptToken,
  OAUTH_PROVIDERS,
} from '@/lib/integrations';

// GET /api/integrations/[provider]/callback — OAuth redirect handler
export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
      console.error(`OAuth error for ${provider}:`, error);
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent(`Connection denied: ${error}`)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Missing authorization code')}`
      );
    }

    // Decode and validate state
    let stateData: { userId: string; nonce: string; ts: number };
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf8');
      stateData = JSON.parse(decoded);
    } catch {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Invalid state parameter')}`
      );
    }

    // Validate state age (max 10 minutes)
    if (Date.now() - stateData.ts > 10 * 60 * 1000) {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Authorization expired — please try again')}`
      );
    }

    const userId = stateData.userId;

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('User not found')}`
      );
    }

    // Verify provider is valid
    if (!OAUTH_PROVIDERS[provider]) {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent(`Unknown provider: ${provider}`)}`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(provider, code);

    // Fetch user info from provider
    const providerUser = await fetchProviderUserInfo(provider, tokens.access_token);

    // Calculate token expiry
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Encrypt tokens before storage
    const encryptedAccess = encryptToken(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    // Upsert integration (reconnecting replaces old tokens)
    await prisma.userIntegration.upsert({
      where: {
        userId_provider: { userId, provider },
      },
      create: {
        userId,
        provider,
        providerAccountId: providerUser.id || null,
        email: providerUser.email || null,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || null,
        expiresAt,
      },
      update: {
        providerAccountId: providerUser.id || null,
        email: providerUser.email || null,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || null,
        expiresAt,
        connectedAt: new Date(),
      },
    });

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      `${baseUrl}/integrations?connected=${encodeURIComponent(provider)}`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent('Connection failed — please try again')}`
    );
  }
}
