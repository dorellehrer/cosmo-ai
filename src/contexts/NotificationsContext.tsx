'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationCategory = 'system' | 'integration' | 'usage';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  // Toast management
  toasts: Notification[];
  dismissToast: (id: string) => void;
}

const STORAGE_KEY = 'cosmo-notifications';
const MAX_NOTIFICATIONS = 50;
const TOAST_DURATION = 5000;

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(
          parsed.map((n: Notification) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when notifications change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      } catch (error) {
        console.error('Failed to save notifications:', error);
      }
    }
  }, [notifications, isLoaded]);

  // Welcome notification on first visit
  useEffect(() => {
    if (isLoaded && notifications.length === 0) {
      const hasSeenWelcome = localStorage.getItem('cosmo-welcomed');
      if (!hasSeenWelcome) {
        addNotification({
          type: 'info',
          category: 'system',
          title: 'Welcome to Cosmo! ✨',
          message: 'Your AI assistant is ready. Connect integrations to unlock the full experience.',
          action: {
            label: 'Setup Integrations',
            href: '/integrations',
          },
        });
        localStorage.setItem('cosmo-welcomed', 'true');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        read: false,
        timestamp: new Date(),
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
        return updated;
      });

      // Add to toasts for visual feedback
      setToasts((prev) => [...prev, newNotification]);

      // Auto-dismiss toast after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newNotification.id));
      }, TOAST_DURATION);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
