'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNotifications } from './NotificationsContext';
import { getIntegrationProviderMeta, isPreviewProvider } from '@/lib/integrations/providers';

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  services?: string[];
  connectionMode?: 'oauth' | 'preview';
  status?: 'live' | 'coming_soon';
  connected: boolean;
  connectedAt?: string;
  email?: string;
  expiresAt?: string;
}

export interface IntegrationsContextType {
  integrations: Integration[];
  getIntegration: (id: string) => Integration | undefined;
  connectIntegration: (id: string) => Promise<void>;
  disconnectIntegration: (id: string) => Promise<void>;
  isConnected: (id: string) => boolean;
  connectedCount: number;
  isLoading: boolean;
}

export const AVAILABLE_INTEGRATIONS: Omit<Integration, 'connected' | 'connectedAt' | 'email'>[] = [
  {
    id: 'google',
    name: 'Google',
    description: 'Calendar, Gmail, Drive',
    icon: '🔵',
    color: 'from-blue-500 to-green-500',
    services: ['Calendar', 'Gmail', 'Drive'],
  },
  {
    id: 'hue',
    name: 'Philips Hue',
    description: 'Smart lighting control',
    icon: '💡',
    color: 'from-amber-400 to-orange-500',
    services: ['Lights', 'Scenes', 'Colors'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Music playback & search',
    icon: '🎵',
    color: 'from-green-500 to-green-600',
    services: ['Playback', 'Now Playing', 'Search', 'Playlists'],
  },
  {
    id: 'sonos',
    name: 'Sonos',
    description: 'Multi-room audio',
    icon: '🔊',
    color: 'from-gray-700 to-gray-900',
    services: ['Playback', 'Volume', 'Groups'],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Notes, docs & databases',
    icon: '📝',
    color: 'from-gray-600 to-gray-800',
    services: ['Pages', 'Databases', 'Search'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication',
    icon: '💬',
    color: 'from-purple-500 to-pink-500',
    services: ['Messages', 'Search', 'Channels', 'DMs'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Send & read messages via AI',
    icon: '📱',
    color: 'from-green-400 to-green-600',
    services: ['Send Messages', 'Read Messages', 'Contacts', 'Group Chats'],
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Servers, channels & DMs',
    icon: '🎮',
    color: 'from-indigo-500 to-violet-600',
    services: ['Send Messages', 'Read Messages', 'Servers', 'Channels'],
  },
  {
    id: 'phone',
    name: 'AI Phone Calls',
    description: 'AI-powered voice calls • $0.10/min',
    icon: '📞',
    color: 'from-emerald-500 to-teal-600',
    services: ['Make Calls', 'Schedule Calls', 'Call Summaries', 'Transcripts'],
  },
];

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const { addNotification } = useNotifications();
  const [integrations, setIntegrations] = useState<Integration[]>(() =>
    AVAILABLE_INTEGRATIONS.map((i) => {
      const meta = getIntegrationProviderMeta(i.id);
      return {
        ...i,
        connectionMode: meta?.connectionMode || 'preview',
        status: meta?.status || 'coming_soon',
        connected: false,
      };
    })
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch connected integrations from server on mount
  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      if (!res.ok) {
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      const connected: { provider: string; email?: string; connectedAt: string; expiresAt?: string }[] = data.integrations || [];

      setIntegrations((prev) =>
        prev.map((integration) => {
          const match = connected.find((c) => c.provider === integration.id);
          if (match) {
            return {
              ...integration,
              connected: true,
              connectedAt: match.connectedAt,
              email: match.email || undefined,
              expiresAt: match.expiresAt || undefined,
            };
          }
          return { ...integration, connected: false, connectedAt: undefined, email: undefined, expiresAt: undefined };
        })
      );
    } catch {
      // Network error — keep defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Check for ?connected= or ?error= URL params (after OAuth redirect)
  useEffect(() => {
    const url = new URL(window.location.href);
    const connectedProvider = url.searchParams.get('connected');
    const errorMsg = url.searchParams.get('error');

    if (connectedProvider) {
      const integration = AVAILABLE_INTEGRATIONS.find((i) => i.id === connectedProvider);
      if (integration) {
        addNotification({
          type: 'success',
          category: 'integration',
          title: `${integration.name} Connected! 🎉`,
          message: `Your ${integration.name} integration is now active. ${integration.description}`,
          action: { label: 'View Integrations', href: '/integrations' },
        });
      }
      fetchIntegrations();
      url.searchParams.delete('connected');
      window.history.replaceState({}, '', url.pathname);
    }

    if (errorMsg) {
      addNotification({
        type: 'error',
        category: 'integration',
        title: 'Connection Failed',
        message: errorMsg,
      });
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.pathname);
    }
  }, [addNotification, fetchIntegrations]);

  const getIntegration = useCallback(
    (id: string) => integrations.find((i) => i.id === id),
    [integrations]
  );

  const connectIntegration = useCallback(async (id: string) => {
    if (isPreviewProvider(id)) {
      const integration = integrations.find((i) => i.id === id);
      addNotification({
        type: 'info',
        category: 'integration',
        title: 'Coming Soon',
        message: `${integration?.name || id} is in preview and not yet connectable.`,
      });
      return;
    }

    try {
      const res = await fetch(`/api/integrations/${id}/connect`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        const comingSoon = data?.code === 'NOT_YET_SUPPORTED';
        addNotification({
          type: comingSoon ? 'info' : 'error',
          category: 'integration',
          title: comingSoon ? 'Coming Soon' : 'Connection Failed',
          message: data.error || 'Failed to start connection',
        });
        return;
      }

      // Redirect to OAuth provider
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      addNotification({
        type: 'error',
        category: 'integration',
        title: 'Connection Failed',
        message: 'Network error — please try again',
      });
    }
  }, [addNotification, integrations]);

  const disconnectIntegration = useCallback(async (id: string) => {
    const integration = integrations.find((i) => i.id === id);

    try {
      const res = await fetch(`/api/integrations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to disconnect');
      }

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, connected: false, connectedAt: undefined, email: undefined } : i
        )
      );

      if (integration) {
        addNotification({
          type: 'info',
          category: 'integration',
          title: `${integration.name} Disconnected`,
          message: `Your ${integration.name} integration has been disconnected.`,
          action: { label: 'Reconnect', href: `/integrations/${id}` },
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        category: 'integration',
        title: 'Disconnect Failed',
        message: error instanceof Error ? error.message : 'Please try again',
      });
    }
  }, [integrations, addNotification]);

  const isConnected = useCallback(
    (id: string) => integrations.find((i) => i.id === id)?.connected || false,
    [integrations]
  );

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <IntegrationsContext.Provider
      value={{
        integrations,
        getIntegration,
        connectIntegration,
        disconnectIntegration,
        isConnected,
        connectedCount,
        isLoading,
      }}
    >
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrations() {
  const context = useContext(IntegrationsContext);
  if (!context) {
    throw new Error('useIntegrations must be used within an IntegrationsProvider');
  }
  return context;
}
