'use client';

import { useNotifications } from '@/contexts/NotificationsContext';

/**
 * Demo component for testing notifications.
 * Add this to any page to test the notification system.
 * 
 * Usage: <NotificationDemo />
 */
export function NotificationDemo() {
  const { addNotification } = useNotifications();

  const testNotifications = [
    {
      type: 'success' as const,
      category: 'integration' as const,
      title: 'Google Connected! 🎉',
      message: 'Your Google account has been successfully linked. You can now access Calendar, Gmail, and Drive.',
      action: { label: 'View Integrations', href: '/integrations' },
    },
    {
      type: 'error' as const,
      category: 'integration' as const,
      title: 'Connection Failed',
      message: 'Unable to connect to Spotify. Please check your credentials and try again.',
      action: { label: 'Retry', href: '/integrations/spotify' },
    },
    {
      type: 'warning' as const,
      category: 'usage' as const,
      title: 'Usage Alert',
      message: "You've used 75% of your monthly message limit. Consider upgrading for unlimited access.",
      action: { label: 'Upgrade Plan', href: '/pricing' },
    },
    {
      type: 'info' as const,
      category: 'system' as const,
      title: 'New Feature Available ✨',
      message: 'Try our new voice commands! Say "Hey Cosmo" to get started.',
      action: { label: 'Learn More', href: '/help' },
    },
  ];

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
      <h3 className="text-sm font-semibold text-white/70">🔔 Notification Demo</h3>
      <div className="flex flex-wrap gap-2">
        {testNotifications.map((notif, index) => (
          <button
            key={index}
            onClick={() => addNotification(notif)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${notif.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : ''}
              ${notif.type === 'error' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : ''}
              ${notif.type === 'warning' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : ''}
              ${notif.type === 'info' ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : ''}
            `}
          >
            {notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
