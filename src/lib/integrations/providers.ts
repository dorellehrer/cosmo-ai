export const OAUTH_PROVIDER_IDS = ['google', 'spotify', 'notion', 'slack', 'hue', 'sonos'] as const;
export const PREVIEW_PROVIDER_IDS = ['whatsapp', 'discord', 'phone'] as const;

export type OAuthProvider = typeof OAUTH_PROVIDER_IDS[number];
export type PreviewProvider = typeof PREVIEW_PROVIDER_IDS[number];
export type IntegrationProvider = OAuthProvider | PreviewProvider;

export type IntegrationConnectionMode = 'oauth' | 'preview';
export type IntegrationStatus = 'live' | 'coming_soon';

export interface IntegrationProviderMeta {
  id: IntegrationProvider;
  displayName: string;
  connectionMode: IntegrationConnectionMode;
  status: IntegrationStatus;
}

export interface PublicIntegrationSummary {
  live: string[];
  preview: string[];
}

export const INTEGRATION_PROVIDER_REGISTRY: Record<IntegrationProvider, IntegrationProviderMeta> = {
  google: { id: 'google', displayName: 'Google', connectionMode: 'oauth', status: 'live' },
  spotify: { id: 'spotify', displayName: 'Spotify', connectionMode: 'oauth', status: 'live' },
  notion: { id: 'notion', displayName: 'Notion', connectionMode: 'oauth', status: 'live' },
  slack: { id: 'slack', displayName: 'Slack', connectionMode: 'oauth', status: 'live' },
  hue: { id: 'hue', displayName: 'Philips Hue', connectionMode: 'oauth', status: 'live' },
  sonos: { id: 'sonos', displayName: 'Sonos', connectionMode: 'oauth', status: 'live' },

  // Preview-only providers (UI visible, connect flow disabled for now)
  whatsapp: { id: 'whatsapp', displayName: 'WhatsApp', connectionMode: 'preview', status: 'coming_soon' },
  discord: { id: 'discord', displayName: 'Discord', connectionMode: 'preview', status: 'coming_soon' },
  phone: { id: 'phone', displayName: 'AI Phone Calls', connectionMode: 'preview', status: 'coming_soon' },
};

export const ALL_PROVIDERS = [...OAUTH_PROVIDER_IDS, ...PREVIEW_PROVIDER_IDS] as const;
export type ProviderId = typeof ALL_PROVIDERS[number];

export function isOAuthProvider(provider: string): provider is OAuthProvider {
  return (OAUTH_PROVIDER_IDS as readonly string[]).includes(provider);
}

export function isPreviewProvider(provider: string): provider is PreviewProvider {
  return (PREVIEW_PROVIDER_IDS as readonly string[]).includes(provider);
}

export function getIntegrationProviderMeta(provider: string): IntegrationProviderMeta | null {
  if ((ALL_PROVIDERS as readonly string[]).includes(provider)) {
    return INTEGRATION_PROVIDER_REGISTRY[provider as IntegrationProvider];
  }
  return null;
}

export function getPublicIntegrationSummary(): PublicIntegrationSummary {
  const live = OAUTH_PROVIDER_IDS.map((providerId) => INTEGRATION_PROVIDER_REGISTRY[providerId].displayName);
  const preview = PREVIEW_PROVIDER_IDS.map((providerId) => INTEGRATION_PROVIDER_REGISTRY[providerId].displayName);
  return { live, preview };
}

export function formatIntegrationList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

