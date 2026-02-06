'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(iOS);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate 
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    // Show again after 7 days
    if (daysSinceDismissed < 7) {
      return;
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Small delay before showing to not be too aggressive
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show custom instructions after a delay
    if (iOS && !dismissed) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  }, []);

  // Don't render if installed or not showing
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Main Install Banner */}
      <div 
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up"
        role="dialog"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-description"
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-violet-500/10">
          <div className="flex items-start gap-4">
            {/* App Icon */}
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-2xl">✨</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 
                id="pwa-install-title" 
                className="text-white font-semibold text-lg"
              >
                Install Cosmo AI
              </h3>
              <p 
                id="pwa-install-description" 
                className="text-white/60 text-sm mt-1"
              >
                Add to your home screen for the best experience
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-white text-sm font-medium transition-all"
                >
                  {isIOS ? 'How to Install' : 'Install'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-white/60 hover:text-white text-sm font-medium transition-colors"
                  aria-label="Dismiss install prompt"
                >
                  Not now
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-white/40 hover:text-white/80 transition-colors"
              aria-label="Close install prompt"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div 
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={handleDismiss}
        >
          <div 
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              Install Cosmo AI on iOS
            </h3>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold text-sm">
                  1
                </div>
                <div>
                  <p className="text-white font-medium">Tap the Share button</p>
                  <p className="text-white/60 text-sm mt-1">
                    At the bottom of Safari, tap{' '}
                    <svg className="inline w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold text-sm">
                  2
                </div>
                <div>
                  <p className="text-white font-medium">Scroll and tap "Add to Home Screen"</p>
                  <p className="text-white/60 text-sm mt-1">
                    Look for the icon with a + symbol
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold text-sm">
                  3
                </div>
                <div>
                  <p className="text-white font-medium">Tap "Add"</p>
                  <p className="text-white/60 text-sm mt-1">
                    Cosmo will appear on your home screen
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-white font-semibold transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
