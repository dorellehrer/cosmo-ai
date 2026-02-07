import crypto from 'crypto';

// ──────────────────────────────────────────────
// Token Encryption (AES-256-GCM)
// ──────────────────────────────────────────────

const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

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

export const OAUTH_PROVIDERS: Record<string, () => OAuthProviderConfig> = {
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

/** Providers that don't use standard OAuth (need custom flow) */
export const NON_OAUTH_PROVIDERS: string[] = [];

/** All known provider IDs */
export const ALL_PROVIDERS = ['google', 'spotify', 'notion', 'slack', 'hue', 'sonos'] as const;
export type ProviderId = typeof ALL_PROVIDERS[number];

// ──────────────────────────────────────────────
// OAuth Helpers
// ──────────────────────────────────────────────

export function getCallbackUrl(provider: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/api/integrations/${provider}/callback`;
}

export function buildAuthorizationUrl(provider: string, state: string): string {
  const config = OAUTH_PROVIDERS[provider]?.();
  if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);

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
  const config = OAUTH_PROVIDERS[provider]?.();
  if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);

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
  const config = OAUTH_PROVIDERS[provider]?.();
  if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);

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
  accessToken: string
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
      // Hue CLIP v2 API — get bridge configuration
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
      // Sonos Control API — get households
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
