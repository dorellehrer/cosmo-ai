'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNotifications } from './NotificationsContext';

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  services?: string[];
  connected: boolean;
  connectedAt?: string;
  email?: string; // For OAuth-connected services, store the connected account
}

export interface IntegrationsContextType {
  integrations: Integration[];
  getIntegration: (id: string) => Integration | undefined;
  connectIntegration: (id: string, email?: string) => void;
  disconnectIntegration: (id: string) => void;
  isConnected: (id: string) => boolean;
  connectedCount: number;
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
    services: ['Lights', 'Scenes', 'Rooms'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Music streaming & playback',
    icon: '🎵',
    color: 'from-green-500 to-green-600',
    services: ['Playback', 'Playlists', 'Search'],
  },
  {
    id: 'sonos',
    name: 'Sonos',
    description: 'Multi-room audio',
    icon: '🔊',
    color: 'from-gray-700 to-gray-900',
    services: ['Speakers', 'Groups', 'Volume'],
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
    services: ['Messages', 'Channels', 'Status'],
  },
];

const STORAGE_KEY = 'cosmo-integrations';

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const { addNotification } = useNotifications();
  const [integrations, setIntegrations] = useState<Integration[]>(() =>
    AVAILABLE_INTEGRATIONS.map((i) => ({ ...i, connected: false }))
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Integration>[];
        setIntegrations((prev) =>
          prev.map((integration) => {
            const storedData = parsed.find((p) => p.id === integration.id);
            if (storedData) {
              return {
                ...integration,
                connected: storedData.connected || false,
                connectedAt: storedData.connectedAt,
                email: storedData.email,
              };
            }
            return integration;
          })
        );
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when integrations change
  useEffect(() => {
    if (isLoaded) {
      try {
        const dataToStore = integrations.map(({ id, connected, connectedAt, email }) => ({
          id,
          connected,
          connectedAt,
          email,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
      } catch (error) {
        console.error('Failed to save integrations:', error);
      }
    }
  }, [integrations, isLoaded]);

  const getIntegration = useCallback(
    (id: string) => integrations.find((i) => i.id === id),
    [integrations]
  );

  const connectIntegration = useCallback((id: string, email?: string) => {
    const integration = integrations.find((i) => i.id === id);
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              connected: true,
              connectedAt: new Date().toISOString(),
              email,
            }
          : i
      )
    );
    
    if (integration) {
      addNotification({
        type: 'success',
        category: 'integration',
        title: `${integration.name} Connected! 🎉`,
        message: `Your ${integration.name} integration is now active. ${integration.description}`,
        action: {
          label: 'View Integrations',
          href: '/integrations',
        },
      });
    }
  }, [integrations, addNotification]);

  const disconnectIntegration = useCallback((id: string) => {
    const integration = integrations.find((i) => i.id === id);
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              connected: false,
              connectedAt: undefined,
              email: undefined,
            }
          : i
      )
    );
    
    if (integration) {
      addNotification({
        type: 'info',
        category: 'integration',
        title: `${integration.name} Disconnected`,
        message: `Your ${integration.name} integration has been disconnected.`,
        action: {
          label: 'Reconnect',
          href: `/integrations/${id}`,
        },
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
