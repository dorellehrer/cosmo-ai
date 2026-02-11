'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Unified capability detection for PWA, Electron, and web.
 * Detects what's available on the current platform and provides
 * a single interface for capability-dependent UI.
 */

// Types for Electron novaDesktop API
interface NovaDesktopAutomation {
  calendar: {
    listEvents: (options?: { days?: number; calendarName?: string }) => Promise<unknown>;
    createEvent: (options: { title: string; startDate: string; endDate: string; calendarName?: string; location?: string; notes?: string; allDay?: boolean }) => Promise<unknown>;
    listCalendars: () => Promise<unknown>;
  };
  reminders: {
    list: (options?: { listName?: string; includeCompleted?: boolean }) => Promise<unknown>;
    create: (options: { name: string; listName?: string; dueDate?: string; notes?: string; priority?: number }) => Promise<unknown>;
    listLists: () => Promise<unknown>;
  };
  mail: {
    search: (options: { query: string; account?: string; limit?: number }) => Promise<unknown>;
    send: (options: { to: string; subject: string; body: string; cc?: string }) => Promise<unknown>;
    unreadCount: () => Promise<unknown>;
  };
  notes: {
    create: (options: { title: string; body: string; folder?: string }) => Promise<unknown>;
    search: (options: { query: string; limit?: number }) => Promise<unknown>;
  };
  system: {
    getVolume: () => Promise<unknown>;
    setVolume: (options: { volume?: number; muted?: boolean }) => Promise<unknown>;
    getBrightness: () => Promise<unknown>;
    setBrightness: (options: { brightness: number }) => Promise<unknown>;
    getDarkMode: () => Promise<unknown>;
    setDarkMode: (options: { enabled: boolean }) => Promise<unknown>;
    getDnd: () => Promise<unknown>;
    toggleDnd: () => Promise<unknown>;
    sleep: () => Promise<unknown>;
    lockScreen: () => Promise<unknown>;
    emptyTrash: () => Promise<unknown>;
  };
  app: {
    list: () => Promise<unknown>;
    launch: (options: { name: string }) => Promise<unknown>;
    quit: (options: { name: string; force?: boolean }) => Promise<unknown>;
    focus: (options: { name: string }) => Promise<unknown>;
    isRunning: (options: { name: string }) => Promise<unknown>;
  };
  fs: {
    readFile: (options: { path: string }) => Promise<unknown>;
    writeFile: (options: { path: string; content: string; append?: boolean }) => Promise<unknown>;
    listDir: (options: { path: string; recursive?: boolean }) => Promise<unknown>;
    search: (options: { directory: string; pattern: string; maxResults?: number }) => Promise<unknown>;
    moveToTrash: (options: { path: string }) => Promise<unknown>;
    revealInFinder: (options: { path: string }) => Promise<unknown>;
    watch: (dirPath: string) => Promise<unknown>;
    unwatch: (id: string) => Promise<unknown>;
    onChange: (callback: (data: { id: string; event: string; filename: string }) => void) => () => void;
  };
  window: {
    list: () => Promise<unknown>;
    resize: (options: { app: string; position?: { x: number; y: number }; size?: { width: number; height: number } }) => Promise<unknown>;
    minimizeAll: () => Promise<unknown>;
  };
  accessibility: {
    check: () => Promise<unknown>;
    request: () => Promise<unknown>;
    click: (options: { app: string; element: string; elementType?: string }) => Promise<unknown>;
    type: (options: { text: string; app?: string }) => Promise<unknown>;
    pressKey: (options: { key: string; modifiers?: string[] }) => Promise<unknown>;
    readScreen: (options: { app: string }) => Promise<unknown>;
  };
  shell: {
    run: (options: { command: string }) => Promise<unknown>;
  };
  spotlight: {
    search: (options: { query: string; kind?: string; limit?: number }) => Promise<unknown>;
  };
  speak: (options: { text: string; voice?: string; rate?: number }) => Promise<unknown>;
  listVoices: () => Promise<unknown>;
}

interface NovaDesktopRoutines {
  list: () => Promise<unknown>;
  add: (routine: { name: string; schedule: string; enabled: boolean; toolChain: Array<{ toolName: string; params?: Record<string, string> }> }) => Promise<unknown>;
  update: (id: string, updates: Record<string, unknown>) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
  runNow: (id: string) => Promise<unknown>;
  onExecuted: (callback: (data: { id: string; name: string; lastRun: string; result: string }) => void) => () => void;
}

interface NovaDesktopPower {
  onSuspend: (callback: () => void) => () => void;
  onResume: (callback: () => void) => () => void;
  onLock: (callback: () => void) => () => void;
  onUnlock: (callback: () => void) => () => void;
  onIdle: (callback: (data: { seconds: number }) => void) => () => void;
}

interface NovaDesktop {
  platform: string;
  isDesktopApp: boolean;
  isMac: boolean;
  isWindows: boolean;
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
  toggleQuickChat: () => void;
  checkForUpdates: () => Promise<unknown>;
  installUpdate: () => Promise<unknown>;
  onUpdateStatus: (callback: (data: { status: string; version?: string }) => void) => () => void;
  onUpdateProgress: (callback: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void;
  automation: NovaDesktopAutomation;
  routines: NovaDesktopRoutines;
  power: NovaDesktopPower;
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
  isMac: boolean;
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

  // Desktop automation flags
  canAutomate: boolean;
  canAccessCalendar: boolean;
  canAccessReminders: boolean;
  canAccessMail: boolean;
  canAccessNotes: boolean;
  canControlSystem: boolean;
  canControlApps: boolean;
  canManageWindows: boolean;
  canAccessibility: boolean;
  canSpotlight: boolean;
  canSpeak: boolean;
  canHeadlessFs: boolean;
  canRunShell: boolean;
  canLocalRoutines: boolean;
  canPowerMonitor: boolean;

  // Actions
  readFile: () => Promise<{ name: string; content: string; size: number } | null>;
  saveFile: (content: string, defaultName?: string) => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<boolean>;
  readClipboard: () => Promise<string | null>;
  shareContent: (data: { title?: string; text?: string; url?: string }) => Promise<boolean>;
  getLocation: () => Promise<{ lat: number; lon: number; city?: string } | null>;
  requestWakeLock: () => Promise<(() => void) | null>;
  getSystemInfo: () => Promise<Record<string, string | number> | null>;

  // Desktop-only raw access (null on non-desktop)
  automation: NovaDesktopAutomation | null;
  routines: NovaDesktopRoutines | null;
  power: NovaDesktopPower | null;
}

export function useCapabilities(): PlatformCapabilities {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const nd = window.novaDesktop;
    setIsDesktop(!!nd?.isDesktopApp);
    setIsMac(!!nd?.isMac);
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

  // ── Desktop Automation Capabilities ──
  const caps = isDesktop ? (window.novaDesktop?.capabilities ?? []) : [];
  const hasCap = (c: string) => caps.includes(c);

  const canAutomate = isDesktop && isMac && hasCap('automation');
  const canAccessCalendar = canAutomate && hasCap('calendar');
  const canAccessReminders = canAutomate && hasCap('reminders');
  const canAccessMail = canAutomate && hasCap('mail');
  const canAccessNotes = canAutomate && hasCap('notes');
  const canControlSystem = canAutomate && hasCap('systemControl');
  const canControlApps = canAutomate && hasCap('appControl');
  const canManageWindows = canAutomate && hasCap('windowManagement');
  const canAccessibility = canAutomate && hasCap('accessibility');
  const canSpotlight = canAutomate && hasCap('spotlight');
  const canSpeak = canAutomate && hasCap('tts');
  const canHeadlessFs = canAutomate && hasCap('headlessFs');
  const canRunShell = isDesktop && isMac;
  const canLocalRoutines = isDesktop && hasCap('localRoutines');
  const canPowerMonitor = isDesktop && hasCap('powerMonitor');

  return {
    isDesktop,
    isPWA,
    isWeb,
    isMac,
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
    canAutomate,
    canAccessCalendar,
    canAccessReminders,
    canAccessMail,
    canAccessNotes,
    canControlSystem,
    canControlApps,
    canManageWindows,
    canAccessibility,
    canSpotlight,
    canSpeak,
    canHeadlessFs,
    canRunShell,
    canLocalRoutines,
    canPowerMonitor,
    readFile,
    saveFile,
    copyToClipboard,
    readClipboard,
    shareContent,
    getLocation,
    requestWakeLock,
    getSystemInfo,
    automation: isDesktop ? (window.novaDesktop?.automation ?? null) : null,
    routines: isDesktop ? (window.novaDesktop?.routines ?? null) : null,
    power: isDesktop ? (window.novaDesktop?.power ?? null) : null,
  };
}
