import crypto from 'crypto';
import {
  ALL_PROVIDERS,
  getIntegrationProviderMeta,
  INTEGRATION_PROVIDER_REGISTRY,
  isOAuthProvider,
  isPreviewProvider,
  OAUTH_PROVIDER_IDS,
  PREVIEW_PROVIDER_IDS,
} from './integrations/providers';
import type {
  IntegrationProviderMeta,
  OAuthProvider,
  PreviewProvider,
  ProviderId,
} from './integrations/providers';

// ──────────────────────────────────────────────
// Token Encryption (AES-256-GCM)
// ──────────────────────────────────────────────

const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY must be at least 32 characters');
  }
  return crypto.scryptSync(ENCRYPTION_KEY, 'nova-integrations-salt', 32);
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptToken(ciphertext: string): string {
  const key = getKey();
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':');
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error('Invalid encrypted token format');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export {
  ALL_PROVIDERS,
  getIntegrationProviderMeta,
  INTEGRATION_PROVIDER_REGISTRY,
  isOAuthProvider,
  isPreviewProvider,
  OAUTH_PROVIDER_IDS,
  PREVIEW_PROVIDER_IDS,
};
export type { IntegrationProviderMeta, OAuthProvider, PreviewProvider, ProviderId };

// ──────────────────────────────────────────────
// OAuth Provider Configuration
// ──────────────────────────────────────────────

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Extra query params for the authorization URL */
  extraAuthParams?: Record<string, string>;
}

export const OAUTH_PROVIDERS: Record<OAuthProvider, () => OAuthProviderConfig> = {
  google: () => ({
    clientId: process.env.GOOGLE_INTEGRATION_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_INTEGRATION_CLIENT_SECRET || '',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    extraAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  }),
  spotify: () => ({
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: [
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'playlist-read-private',
      'user-read-email',
    ],
  }),
  notion: () => ({
    clientId: process.env.NOTION_CLIENT_ID || '',
    clientSecret: process.env.NOTION_CLIENT_SECRET || '',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [], // Notion uses owner-based permissions, no scopes
    extraAuthParams: {
      owner: 'user',
    },
  }),
  slack: () => ({
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: [
      'channels:read',
      'chat:write',
      'search:read',
    ],
  }),
  hue: () => ({
    clientId: process.env.HUE_CLIENT_ID || '',
    clientSecret: process.env.HUE_CLIENT_SECRET || '',
    authUrl: 'https://api.meethue.com/v2/oauth2/authorize',
    tokenUrl: 'https://api.meethue.com/v2/oauth2/token',
    scopes: [],
  }),
  sonos: () => ({
    clientId: process.env.SONOS_CLIENT_ID || '',
    clientSecret: process.env.SONOS_CLIENT_SECRET || '',
    authUrl: 'https://api.sonos.com/login/v3/oauth',
    tokenUrl: 'https://api.sonos.com/login/v3/oauth/access',
    scopes: ['playback-control-all'],
  }),
};

/** Providers that are UI-visible but not connectable yet. */
export const NON_OAUTH_PROVIDERS: PreviewProvider[] = [...PREVIEW_PROVIDER_IDS];

// ──────────────────────────────────────────────
// OAuth state integrity (HMAC-signed)
// ──────────────────────────────────────────────

const DEFAULT_STATE_TTL_SECONDS = 10 * 60;

type OAuthStateErrorCode =
  | 'OAUTH_STATE_MALFORMED'
  | 'OAUTH_STATE_INVALID_SIGNATURE'
  | 'OAUTH_STATE_EXPIRED'
  | 'OAUTH_STATE_PROVIDER_MISMATCH';

export interface OAuthStatePayload {
  userId: string;
  nonce: string;
  provider: OAuthProvider;
  iat: number;
  exp: number;
}

function getStateSigningSecret(): string {
  const secret = process.env.INTEGRATION_OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!secret || secret.length < 16) {
    throw new Error('Missing INTEGRATION_OAUTH_STATE_SECRET (or NEXTAUTH_SECRET) for OAuth state signing');
  }
  return secret;
}

function signStatePart(payloadB64: string): string {
  const hmac = crypto.createHmac('sha256', getStateSigningSecret());
  hmac.update(payloadB64);
  return hmac.digest('base64url');
}

export function createSignedOAuthState(input: {
  userId: string;
  nonce: string;
  provider: OAuthProvider;
  nowMs?: number;
  ttlSeconds?: number;
}): string {
  const nowMs = input.nowMs ?? Date.now();
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_STATE_TTL_SECONDS;

  const payload: OAuthStatePayload = {
    userId: input.userId,
    nonce: input.nonce,
    provider: input.provider,
    iat: nowMs,
    exp: nowMs + ttlSeconds * 1000,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signatureB64 = signStatePart(payloadB64);
  return `${payloadB64}.${signatureB64}`;
}

export function verifySignedOAuthState(state: string, expectedProvider?: string): {
  ok: true;
  payload: OAuthStatePayload;
} | {
  ok: false;
  code: OAuthStateErrorCode;
} {
  const [payloadB64, sigB64] = state.split('.');
  if (!payloadB64 || !sigB64) {
    return { ok: false, code: 'OAUTH_STATE_MALFORMED' };
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as OAuthStatePayload;
  } catch {
    return { ok: false, code: 'OAUTH_STATE_MALFORMED' };
  }

  if (!payload?.userId || !payload?.nonce || !payload?.provider || !payload?.exp) {
    return { ok: false, code: 'OAUTH_STATE_MALFORMED' };
  }

  const expectedSig = signStatePart(payloadB64);
  const sigBuf = Buffer.from(sigB64);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, code: 'OAUTH_STATE_INVALID_SIGNATURE' };
  }

  if (Date.now() > payload.exp) {
    return { ok: false, code: 'OAUTH_STATE_EXPIRED' };
  }

  if (expectedProvider && payload.provider !== expectedProvider) {
    return { ok: false, code: 'OAUTH_STATE_PROVIDER_MISMATCH' };
  }

  return { ok: true, payload };
}

// ──────────────────────────────────────────────
// OAuth Helpers
// ──────────────────────────────────────────────

export function getCallbackUrl(provider: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/api/integrations/${provider}/callback`;
}

export function buildAuthorizationUrl(provider: string, state: string): string {
  if (!isOAuthProvider(provider)) throw new Error(`Unknown OAuth provider: ${provider}`);
  const config = OAUTH_PROVIDERS[provider]();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getCallbackUrl(provider),
    response_type: 'code',
    state,
    ...(config.scopes.length > 0 ? { scope: config.scopes.join(' ') } : {}),
    ...config.extraAuthParams,
  });

  return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForTokens(provider: string, code: string) {
  if (!isOAuthProvider(provider)) throw new Error(`Unknown OAuth provider: ${provider}`);
  const config = OAUTH_PROVIDERS[provider]();

  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: getCallbackUrl(provider),
    client_id: config.clientId,
    client_secret: config.clientSecret,
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed for ${provider}: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  }>;
}

export async function refreshAccessToken(provider: string, refreshToken: string) {
  if (!isOAuthProvider(provider)) throw new Error(`Unknown OAuth provider: ${provider}`);
  const config = OAUTH_PROVIDERS[provider]();

  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed for ${provider}: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  }>;
}

// ──────────────────────────────────────────────
// Provider-Specific User Info
// ──────────────────────────────────────────────

export async function fetchProviderUserInfo(
  provider: string,
  accessToken: string,
): Promise<{ email?: string; id?: string }> {
  switch (provider) {
    case 'google': {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return { email: data.email, id: data.id };
    }
    case 'spotify': {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return { email: data.email, id: data.id };
    }
    case 'notion': {
      // Notion returns user info in the token exchange response
      return {};
    }
    case 'slack': {
      const res = await fetch('https://slack.com/api/users.identity', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return { email: data.user?.email, id: data.user?.id };
    }
    case 'hue': {
      const res = await fetch('https://api.meethue.com/route/api/config', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        return { id: data.bridgeid || 'hue-user' };
      }
      return { id: 'hue-user' };
    }
    case 'sonos': {
      const res = await fetch('https://api.ws.sonos.com/control/api/v1/households', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const hhId = data.households?.[0]?.id;
        return { id: hhId || 'sonos-user' };
      }
      return { id: 'sonos-user' };
    }
    default:
      return {};
  }
}
