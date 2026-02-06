'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';

interface UsageData {
  used: number;
  limit: number;
  resetDate?: Date;
}

const STORAGE_KEY = 'cosmo-usage-notified';

export function useUsageNotifications() {
  const { addNotification } = useNotifications();
  const notifiedRef = useRef<Set<string>>(new Set());

  // Load previously notified thresholds from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        notifiedRef.current = new Set(parsed);
      }
    } catch (error) {
      console.error('Failed to load usage notification state:', error);
    }
  }, []);

  const saveNotifiedState = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...notifiedRef.current]));
    } catch (error) {
      console.error('Failed to save usage notification state:', error);
    }
  }, []);

  const checkUsage = useCallback(
    (usage: UsageData, resourceName: string = 'messages') => {
      const percentage = (usage.used / usage.limit) * 100;
      const today = new Date().toDateString();
      
      // Thresholds to notify at
      const thresholds = [
        { percent: 50, type: 'info' as const, title: 'Halfway there!' },
        { percent: 75, type: 'warning' as const, title: 'Usage Alert' },
        { percent: 90, type: 'warning' as const, title: 'Almost at limit!' },
        { percent: 100, type: 'error' as const, title: 'Limit Reached' },
      ];

      for (const threshold of thresholds) {
        const key = `${resourceName}-${threshold.percent}-${today}`;
        
        if (percentage >= threshold.percent && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          saveNotifiedState();

          const remaining = usage.limit - usage.used;
          const resetInfo = usage.resetDate
            ? ` Resets ${usage.resetDate.toLocaleDateString()}.`
            : '';

          if (threshold.percent >= 100) {
            addNotification({
              type: threshold.type,
              category: 'usage',
              title: threshold.title,
              message: `You've used all ${usage.limit} ${resourceName} for today.${resetInfo}`,
              action: {
                label: 'Upgrade Plan',
                href: '/pricing',
              },
            });
          } else {
            addNotification({
              type: threshold.type,
              category: 'usage',
              title: threshold.title,
              message: `You've used ${usage.used} of ${usage.limit} ${resourceName} (${Math.round(percentage)}%). ${remaining} remaining.${resetInfo}`,
              action:
                percentage >= 90
                  ? {
                      label: 'Upgrade Plan',
                      href: '/pricing',
                    }
                  : undefined,
            });
          }
          
          // Only notify for the highest applicable threshold
          break;
        }
      }
    },
    [addNotification, saveNotifiedState]
  );

  const resetNotifications = useCallback(() => {
    notifiedRef.current.clear();
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    checkUsage,
    resetNotifications,
  };
}
