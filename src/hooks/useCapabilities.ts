'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Unified capability detection for PWA, Electron, and web.
 * Detects what's available on the current platform and provides
 * a single interface for capability-dependent UI.
 */

// Types for Electron novaDesktop API
interface NovaDesktop {
  platform: string;
  isDesktopApp: boolean;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getVersion: () => Promise<string>;
  showNotification: (title: string, body: string) => void;
  readFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<{
    name: string;
    path: string;
    content: string;
    size: number;
    modified: string;
  } | null>;
  saveFile: (options: { content: string; defaultName?: string }) => Promise<{ path: string; name: string } | null>;
  selectFolder: () => Promise<{ path: string; entries: { name: string; isDirectory: boolean; size?: number }[] } | null>;
  clipboardRead: () => Promise<{ text: string; html: string; hasImage: boolean }>;
  clipboardWrite: (data: { text?: string; html?: string }) => Promise<boolean>;
  clipboardReadImage: () => Promise<string | null>;
  captureScreen: () => Promise<string | null>;
  captureWindow: () => Promise<string | null>;
  getSystemInfo: () => Promise<Record<string, string | number>>;
  openExternal: (url: string) => Promise<boolean>;
  openPath: (filePath: string) => Promise<{ success?: boolean; error?: string }>;
  showInFolder: (filePath: string) => Promise<boolean>;
  capabilities: string[];
}

declare global {
  interface Window {
    novaDesktop?: NovaDesktop;
  }
}

export interface PlatformCapabilities {
  // Platform type
  isDesktop: boolean;
  isPWA: boolean;
  isWeb: boolean;
  platform: 'desktop' | 'pwa' | 'web';

  // Feature flags
  canReadFiles: boolean;
  canSaveFiles: boolean;
  canCopyClipboard: boolean;
  canReadClipboard: boolean;
  canScreenshot: boolean;
  canShare: boolean;
  canGeolocate: boolean;
  canNotify: boolean;
  canWakeLock: boolean;
  canGetSystemInfo: boolean;

  // Actions
  readFile: () => Promise<{ name: string; content: string; size: number } | null>;
  saveFile: (content: string, defaultName?: string) => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<boolean>;
  readClipboard: () => Promise<string | null>;
  shareContent: (data: { title?: string; text?: string; url?: string }) => Promise<boolean>;
  getLocation: () => Promise<{ lat: number; lon: number; city?: string } | null>;
  requestWakeLock: () => Promise<(() => void) | null>;
  getSystemInfo: () => Promise<Record<string, string | number> | null>;
}

export function useCapabilities(): PlatformCapabilities {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    setIsDesktop(!!window.novaDesktop?.isDesktopApp);
    setIsPWA(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }, []);

  const isWeb = !isDesktop && !isPWA;
  const platform = isDesktop ? 'desktop' as const : isPWA ? 'pwa' as const : 'web' as const;

  // ── File System ──
  const canReadFiles = isDesktop || ('showOpenFilePicker' in window);
  const canSaveFiles = isDesktop || ('showSaveFilePicker' in window);

  const readFile = useCallback(async () => {
    if (isDesktop && window.novaDesktop) {
      return window.novaDesktop.readFile();
    }
    // Web / PWA: File System Access API (Chromium only)
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as Window & { showOpenFilePicker: () => Promise<FileSystemFileHandle[]> }).showOpenFilePicker();
        const file = await fileHandle.getFile();
        const content = await file.text();
        return { name: file.name, content, size: file.size };
      } catch {
        return null; // User canceled
      }
    }
    // Fallback: input file
    return new Promise<{ name: string; content: string; size: number } | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.json,.csv,.xml,.yaml,.yml';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        const content = await file.text();
        resolve({ name: file.name, content, size: file.size });
      };
      input.click();
    });
  }, [isDesktop]);

  const saveFile = useCallback(async (content: string, defaultName?: string) => {
    if (isDesktop && window.novaDesktop) {
      const result = await window.novaDesktop.saveFile({ content, defaultName });
      return !!result;
    }
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as Window & { showSaveFilePicker: (opts: { suggestedName: string }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: defaultName || 'untitled.txt',
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
      } catch {
        return false;
      }
    }
    // Fallback: download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName || 'untitled.txt';
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }, [isDesktop]);

  // ── Clipboard ──
  const canCopyClipboard = true;
  const canReadClipboard = isDesktop || !!navigator.clipboard?.readText;

  const copyToClipboard = useCallback(async (text: string) => {
    if (isDesktop && window.novaDesktop) {
      return window.novaDesktop.clipboardWrite({ text });
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, [isDesktop]);

  const readClipboard = useCallback(async () => {
    if (isDesktop && window.novaDesktop) {
      const data = await window.novaDesktop.clipboardRead();
      return data.text || null;
    }
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }, [isDesktop]);

  // ── Share ──
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const shareContent = useCallback(async (data: { title?: string; text?: string; url?: string }) => {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch {
        return false;
      }
    }
    // Fallback: copy to clipboard
    const shareText = data.url || data.text || '';
    return copyToClipboard(shareText);
  }, [copyToClipboard]);

  // ── Geolocation ──
  const canGeolocate = typeof navigator !== 'undefined' && !!navigator.geolocation;
  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) return null;
    return new Promise<{ lat: number; lon: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 10000 }
      );
    });
  }, []);

  // ── Notifications ──
  const canNotify = isDesktop || ('Notification' in window);

  // ── Wake Lock ──
  const canWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return null;
    try {
      const lock = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen');
      return () => { lock.release(); };
    } catch {
      return null;
    }
  }, []);

  // ── Screenshot ──
  const canScreenshot = isDesktop;

  // ── System Info ──
  const canGetSystemInfo = isDesktop;
  const getSystemInfo = useCallback(async () => {
    if (isDesktop && window.novaDesktop) {
      return window.novaDesktop.getSystemInfo();
    }
    // Web: limited info
    return {
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine ? 'Yes' : 'No',
      cookieEnabled: navigator.cookieEnabled ? 'Yes' : 'No',
    };
  }, [isDesktop]);

  return {
    isDesktop,
    isPWA,
    isWeb,
    platform,
    canReadFiles,
    canSaveFiles,
    canCopyClipboard,
    canReadClipboard,
    canScreenshot,
    canShare,
    canGeolocate,
    canNotify,
    canWakeLock,
    canGetSystemInfo,
    readFile,
    saveFile,
    copyToClipboard,
    readClipboard,
    shareContent,
    getLocation,
    requestWakeLock,
    getSystemInfo,
  };
}
