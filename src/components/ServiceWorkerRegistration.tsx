'use client';

import { useEffect, useState } from 'react';

interface ServiceWorkerRegistrationState {
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
}

export function ServiceWorkerRegistration() {
  const [state, setState] = useState<ServiceWorkerRegistrationState>({
    registration: null,
    updateAvailable: false,
  });

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

        setState((prev) => ({ ...prev, registration }));

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
  }, []);

  const handleUpdate = () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
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
                A new version of Cosmo is ready
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

  return null;
}
