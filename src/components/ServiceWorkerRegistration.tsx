'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

interface ServiceWorkerRegistrationState {
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  pushSupported: boolean;
  pushSubscribed: boolean;
}

export function ServiceWorkerRegistration() {
  const { data: session } = useSession();
  const [state, setState] = useState<ServiceWorkerRegistrationState>({
    registration: null,
    updateAvailable: false,
    pushSupported: false,
    pushSubscribed: false,
  });

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (reg: globalThis.ServiceWorkerRegistration) => {
    if (!VAPID_PUBLIC_KEY || !session?.user) return;

    try {
      // Check if already subscribed
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setState((prev) => ({ ...prev, pushSubscribed: true }));
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (res.ok) {
        setState((prev) => ({ ...prev, pushSubscribed: true }));
        console.log('[PWA] Push notification subscription saved');
      }
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
    }
  }, [session?.user]);

  // Unsubscribe from push
  const unsubscribeFromPush = useCallback(async () => {
    if (!state.registration) return;
    try {
      const subscription = await state.registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
        setState((prev) => ({ ...prev, pushSubscribed: false }));
        console.log('[PWA] Push notifications unsubscribed');
      }
    } catch (error) {
      console.error('[PWA] Push unsubscribe failed:', error);
    }
  }, [state.registration]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Only register in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('[PWA] Service worker not registered in development');
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[PWA] Service worker registered:', registration.scope);

        const pushSupported = 'PushManager' in window && 'Notification' in window;
        setState((prev) => ({ ...prev, registration, pushSupported }));

        // Check existing push subscription
        if (pushSupported) {
          const existing = await registration.pushManager.getSubscription();
          if (existing) {
            setState((prev) => ({ ...prev, pushSubscribed: true }));
          }
        }

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New content available');
                setState((prev) => ({ ...prev, updateAvailable: true }));
              }
            });
          }
        });

        // Check for updates periodically (every hour)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    // Register after the page loads
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }

    // Handle controller change (new service worker activated)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NAVIGATE') {
        window.location.href = event.data.url;
      }
      if (event.data?.type === 'SYNC_MESSAGE_SENT') {
        console.log('[PWA] Offline message synced:', event.data.messageId);
        // Could dispatch a custom event for the chat page to listen to
        window.dispatchEvent(new CustomEvent('nova-message-synced', { detail: event.data }));
      }
    });
  }, []);

  // Auto-subscribe to push when user signs in (if permission already granted)
  useEffect(() => {
    if (session?.user && state.registration && state.pushSupported && !state.pushSubscribed) {
      if (Notification.permission === 'granted') {
        subscribeToPush(state.registration);
      }
    }
  }, [session?.user, state.registration, state.pushSupported, state.pushSubscribed, subscribeToPush]);

  const handleUpdate = () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handlePushToggle = () => {
    if (state.pushSubscribed) {
      unsubscribeFromPush();
    } else if (state.registration) {
      subscribeToPush(state.registration);
    }
  };

  // Show update banner when new version is available
  if (state.updateAvailable) {
    return (
      <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-violet-500/30 rounded-xl p-4 shadow-lg shadow-violet-500/10">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Update available!</p>
              <p className="text-white/60 text-xs mt-0.5">
                A new version of Nova is ready
              </p>
            </div>
            <button
              onClick={handleUpdate}
              className="flex-shrink-0 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show push notification prompt (only when logged in and not yet subscribed)
  if (session?.user && state.pushSupported && !state.pushSubscribed && Notification.permission === 'default') {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40 animate-slide-up">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-violet-500/20 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Enable notifications?</p>
              <p className="text-white/60 text-xs mt-0.5">
                Get notified when Nova finishes processing or has updates
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handlePushToggle}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-xs font-medium transition-colors"
                >
                  Enable
                </button>
                <button
                  onClick={() => setState((prev) => ({ ...prev, pushSupported: false }))}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 text-xs font-medium transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
