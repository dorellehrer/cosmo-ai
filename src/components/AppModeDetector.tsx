'use client';

import { useEffect } from 'react';

/**
 * Detects whether the app is running as a PWA (standalone), 
 * Electron desktop app, or regular browser, and sets a 
 * data-app-mode attribute on <html> for CSS targeting.
 * 
 * Values: 'pwa' | 'desktop' | 'browser'
 */
export function AppModeDetector() {
  useEffect(() => {
    const html = document.documentElement;

    // Check Electron first (injected by preload)
    const isElectron = !!(window as unknown as Record<string, unknown>).electronAPI;

    // Check PWA / standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (navigator as unknown as Record<string, unknown>).standalone === true; // iOS

    if (isElectron) {
      html.setAttribute('data-app-mode', 'desktop');
    } else if (isStandalone) {
      html.setAttribute('data-app-mode', 'pwa');
    } else {
      html.setAttribute('data-app-mode', 'browser');
    }

    // Listen for display mode changes (e.g., user installs PWA while browsing)
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => {
      if (!isElectron) {
        html.setAttribute('data-app-mode', e.matches ? 'pwa' : 'browser');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return null;
}
