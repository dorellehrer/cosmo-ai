'use client';

import { useNotifications } from '@/contexts/NotificationsContext';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-h-[calc(100vh-2rem)] overflow-hidden pointer-events-none"
      aria-label="Notifications"
      role="region"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast notification={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
}
