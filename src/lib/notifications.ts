/**
 * Notification helper functions for common scenarios
 * Use these to maintain consistency across the app
 */

import type { NotificationType, NotificationCategory } from '@/contexts/NotificationsContext';

export interface NotificationPayload {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

// System notifications
export const systemNotifications = {
  welcome: (): NotificationPayload => ({
    type: 'info',
    category: 'system',
    title: 'Welcome to Nova! ✨',
    message: 'Your AI assistant is ready. Connect integrations to unlock the full experience.',
    action: { label: 'Setup Integrations', href: '/integrations' },
  }),

  newFeature: (featureName: string, description: string): NotificationPayload => ({
    type: 'info',
    category: 'system',
    title: `New Feature: ${featureName} ✨`,
    message: description,
    action: { label: 'Learn More', href: '/help' },
  }),

  tip: (title: string, message: string): NotificationPayload => ({
    type: 'info',
    category: 'system',
    title: `💡 ${title}`,
    message,
  }),

  maintenance: (message: string): NotificationPayload => ({
    type: 'warning',
    category: 'system',
    title: '🔧 Scheduled Maintenance',
    message,
  }),
};

// Integration notifications
export const integrationNotifications = {
  connected: (name: string, description: string): NotificationPayload => ({
    type: 'success',
    category: 'integration',
    title: `${name} Connected! 🎉`,
    message: `Your ${name} integration is now active. ${description}`,
    action: { label: 'View Integrations', href: '/integrations' },
  }),

  disconnected: (name: string, id: string): NotificationPayload => ({
    type: 'info',
    category: 'integration',
    title: `${name} Disconnected`,
    message: `Your ${name} integration has been disconnected.`,
    action: { label: 'Reconnect', href: `/integrations/${id}` },
  }),

  connectionError: (name: string, error?: string): NotificationPayload => ({
    type: 'error',
    category: 'integration',
    title: `${name} Connection Failed`,
    message: error || `Unable to connect to ${name}. Please check your credentials and try again.`,
    action: { label: 'Retry', href: '/integrations' },
  }),

  syncComplete: (name: string, itemCount: number): NotificationPayload => ({
    type: 'success',
    category: 'integration',
    title: `${name} Sync Complete`,
    message: `Successfully synced ${itemCount} items from ${name}.`,
  }),

  permissionRequired: (name: string, permission: string): NotificationPayload => ({
    type: 'warning',
    category: 'integration',
    title: `${name} Permission Needed`,
    message: `${name} requires ${permission} permission to work properly.`,
    action: { label: 'Update Permissions', href: '/integrations' },
  }),
};

// Usage notifications
export const usageNotifications = {
  approaching: (percent: number, resourceName: string = 'messages'): NotificationPayload => ({
    type: percent >= 90 ? 'warning' : 'info',
    category: 'usage',
    title: percent >= 90 ? 'Almost at limit!' : 'Usage Alert',
    message: `You've used ${percent}% of your ${resourceName} for this period.`,
    action: percent >= 75 ? { label: 'Upgrade Plan', href: '/pricing' } : undefined,
  }),

  limitReached: (resourceName: string = 'messages'): NotificationPayload => ({
    type: 'error',
    category: 'usage',
    title: 'Limit Reached',
    message: `You've used all your ${resourceName} for today. Upgrade for unlimited access.`,
    action: { label: 'Upgrade Now', href: '/pricing' },
  }),

  limitReset: (resourceName: string = 'messages'): NotificationPayload => ({
    type: 'success',
    category: 'usage',
    title: 'Limit Reset! 🎉',
    message: `Your ${resourceName} limit has been reset. You're ready to go!`,
  }),

  upgradeThanks: (planName: string): NotificationPayload => ({
    type: 'success',
    category: 'usage',
    title: `Welcome to ${planName}! 🚀`,
    message: `Thank you for upgrading! You now have access to all ${planName} features.`,
    action: { label: 'Explore Features', href: '/help' },
  }),
};

// Tips that can be shown periodically
export const TIPS: NotificationPayload[] = [
  {
    type: 'info',
    category: 'system',
    title: '💡 Quick Tip',
    message: 'Press ⌘K to quickly search or run any command.',
  },
  {
    type: 'info',
    category: 'system',
    title: '💡 Voice Commands',
    message: 'Try using voice commands! Click the microphone or say "Hey Nova".',
  },
  {
    type: 'info',
    category: 'system',
    title: '💡 Keyboard Shortcuts',
    message: 'Press ? to see all available keyboard shortcuts.',
    action: { label: 'View Shortcuts', href: '/shortcuts' },
  },
  {
    type: 'info',
    category: 'system',
    title: '💡 Connect More',
    message: 'Connect more integrations to unlock Nova\'s full potential!',
    action: { label: 'Browse Integrations', href: '/integrations' },
  },
];

/**
 * Get a random tip that hasn't been shown recently
 */
export function getRandomTip(): NotificationPayload {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}
