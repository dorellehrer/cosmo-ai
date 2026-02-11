/**
 * Nova AI — Electron Preload Script
 * Exposes a safe, limited API to the renderer process via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('novaDesktop', {
  // Platform info
  platform: process.platform,
  isDesktopApp: true,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',

  // Quick Chat toggle
  toggleQuickChat: () => ipcRenderer.send('quickchat:toggle'),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),

  // Notifications (native OS notifications)
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('notification:show', { title, body });
  },

  // ── File System (dialog-gated) ──
  readFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('fs:readFile', options || {}),
  saveFile: (options: { content: string; defaultName?: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('fs:saveFile', options),
  selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),

  // ── Clipboard ──
  clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
  clipboardWrite: (data: { text?: string; html?: string }) => ipcRenderer.invoke('clipboard:write', data),
  clipboardReadImage: () => ipcRenderer.invoke('clipboard:readImage'),

  // ── Screenshot ──
  captureScreen: () => ipcRenderer.invoke('screen:capture'),
  captureWindow: () => ipcRenderer.invoke('screen:captureWindow'),

  // ── System Info ──
  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  // ── Shell ──
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  showInFolder: (filePath: string) => ipcRenderer.invoke('shell:showInFolder', filePath),

  // ── Auto Updater ──
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateStatus: (callback: (data: { status: string; version?: string }) => void) => {
    ipcRenderer.on('updater:status', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('updater:status');
  },
  onUpdateProgress: (callback: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
    ipcRenderer.on('updater:progress', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('updater:progress');
  },

  // ══════════════════════════════════════════════
  // macOS Automation API
  // ══════════════════════════════════════════════

  automation: {
    // ── Calendar ──
    calendar: {
      listEvents: (options?: { days?: number; calendarName?: string }) =>
        ipcRenderer.invoke('automation:calendar:listEvents', options),
      createEvent: (options: {
        title: string; startDate: string; endDate: string;
        calendarName?: string; location?: string; notes?: string; allDay?: boolean;
      }) => ipcRenderer.invoke('automation:calendar:createEvent', options),
      listCalendars: () => ipcRenderer.invoke('automation:calendar:listCalendars'),
    },

    // ── Reminders ──
    reminders: {
      list: (options?: { listName?: string; includeCompleted?: boolean }) =>
        ipcRenderer.invoke('automation:reminders:list', options),
      create: (options: {
        name: string; listName?: string; dueDate?: string; notes?: string; priority?: number;
      }) => ipcRenderer.invoke('automation:reminders:create', options),
      listLists: () => ipcRenderer.invoke('automation:reminders:listLists'),
    },

    // ── Mail ──
    mail: {
      search: (options: { query: string; account?: string; limit?: number }) =>
        ipcRenderer.invoke('automation:mail:search', options),
      send: (options: { to: string; subject: string; body: string; cc?: string }) =>
        ipcRenderer.invoke('automation:mail:send', options),
      unreadCount: () => ipcRenderer.invoke('automation:mail:unreadCount'),
    },

    // ── Notes ──
    notes: {
      create: (options: { title: string; body: string; folder?: string }) =>
        ipcRenderer.invoke('automation:notes:create', options),
      search: (options: { query: string; limit?: number }) =>
        ipcRenderer.invoke('automation:notes:search', options),
    },

    // ── System Control ──
    system: {
      getVolume: () => ipcRenderer.invoke('automation:system:getVolume'),
      setVolume: (options: { volume?: number; muted?: boolean }) =>
        ipcRenderer.invoke('automation:system:setVolume', options),
      getBrightness: () => ipcRenderer.invoke('automation:system:getBrightness'),
      setBrightness: (options: { brightness: number }) =>
        ipcRenderer.invoke('automation:system:setBrightness', options),
      getDarkMode: () => ipcRenderer.invoke('automation:system:getDarkMode'),
      setDarkMode: (options: { enabled: boolean }) =>
        ipcRenderer.invoke('automation:system:setDarkMode', options),
      getDnd: () => ipcRenderer.invoke('automation:system:getDnd'),
      toggleDnd: () => ipcRenderer.invoke('automation:system:toggleDnd'),
      sleep: () => ipcRenderer.invoke('automation:system:sleep'),
      lockScreen: () => ipcRenderer.invoke('automation:system:lockScreen'),
      emptyTrash: () => ipcRenderer.invoke('automation:system:emptyTrash'),
    },

    // ── Application Control ──
    app: {
      list: () => ipcRenderer.invoke('automation:app:list'),
      launch: (options: { name: string }) => ipcRenderer.invoke('automation:app:launch', options),
      quit: (options: { name: string; force?: boolean }) => ipcRenderer.invoke('automation:app:quit', options),
      focus: (options: { name: string }) => ipcRenderer.invoke('automation:app:focus', options),
      isRunning: (options: { name: string }) => ipcRenderer.invoke('automation:app:isRunning', options),
    },

    // ── File System (headless — no dialog) ──
    fs: {
      readFile: (options: { path: string }) => ipcRenderer.invoke('automation:fs:readFile', options),
      writeFile: (options: { path: string; content: string; append?: boolean }) =>
        ipcRenderer.invoke('automation:fs:writeFile', options),
      listDir: (options: { path: string; recursive?: boolean }) =>
        ipcRenderer.invoke('automation:fs:listDir', options),
      search: (options: { directory: string; pattern: string; maxResults?: number }) =>
        ipcRenderer.invoke('automation:fs:search', options),
      moveToTrash: (options: { path: string }) => ipcRenderer.invoke('automation:fs:moveToTrash', options),
      revealInFinder: (options: { path: string }) => ipcRenderer.invoke('automation:fs:revealInFinder', options),
      watch: (dirPath: string) => ipcRenderer.invoke('automation:fs:watch', dirPath),
      unwatch: (id: string) => ipcRenderer.invoke('automation:fs:unwatch', id),
      onChange: (callback: (data: { id: string; event: string; filename: string }) => void) => {
        ipcRenderer.on('automation:fs:change', (_event, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('automation:fs:change');
      },
    },

    // ── Window Management ──
    window: {
      list: () => ipcRenderer.invoke('automation:window:list'),
      resize: (options: {
        app: string;
        position?: { x: number; y: number };
        size?: { width: number; height: number };
      }) => ipcRenderer.invoke('automation:window:resize', options),
      minimizeAll: () => ipcRenderer.invoke('automation:window:minimizeAll'),
    },

    // ── Accessibility ──
    accessibility: {
      check: () => ipcRenderer.invoke('automation:accessibility:check'),
      request: () => ipcRenderer.invoke('automation:accessibility:request'),
      click: (options: { app: string; element: string; elementType?: string }) =>
        ipcRenderer.invoke('automation:accessibility:click', options),
      type: (options: { text: string; app?: string }) =>
        ipcRenderer.invoke('automation:accessibility:type', options),
      pressKey: (options: { key: string; modifiers?: string[] }) =>
        ipcRenderer.invoke('automation:accessibility:pressKey', options),
      readScreen: (options: { app: string }) =>
        ipcRenderer.invoke('automation:accessibility:readScreen', options),
    },

    // ── Shell (allowlisted commands) ──
    shell: {
      run: (options: { command: string }) => ipcRenderer.invoke('automation:shell:run', options),
    },

    // ── Spotlight ──
    spotlight: {
      search: (options: { query: string; kind?: string; limit?: number }) =>
        ipcRenderer.invoke('automation:spotlight:search', options),
    },

    // ── Text-to-Speech ──
    speak: (options: { text: string; voice?: string; rate?: number }) =>
      ipcRenderer.invoke('automation:speak', options),
    listVoices: () => ipcRenderer.invoke('automation:speak:voices'),
  },

  // ══════════════════════════════════════════════
  // iMessage (macOS only)
  // ══════════════════════════════════════════════

  imessage: {
    isAvailable: () => ipcRenderer.invoke('imessage:isAvailable'),
    getChats: (options?: { limit?: number }) =>
      ipcRenderer.invoke('imessage:getChats', options),
    getMessages: (options: { chatIdentifier: string; limit?: number }) =>
      ipcRenderer.invoke('imessage:getMessages', options),
    send: (options: { to: string; text: string }) =>
      ipcRenderer.invoke('imessage:send', options),
    search: (options: { query: string; limit?: number }) =>
      ipcRenderer.invoke('imessage:search', options),
    unreadCount: () => ipcRenderer.invoke('imessage:unreadCount'),
    onIncoming: (callback: (data: { from: string; chat: string; text: string }) => void) => {
      ipcRenderer.on('imessage:incoming', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('imessage:incoming');
    },
  },

  // ══════════════════════════════════════════════
  // Gateway Hub Connection
  // ══════════════════════════════════════════════

  gateway: {
    status: () => ipcRenderer.invoke('gateway:status'),
    reconnect: () => ipcRenderer.invoke('gateway:reconnect'),
    onStatus: (callback: (data: { connected: boolean }) => void) => {
      ipcRenderer.on('gateway:status', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('gateway:status');
    },
  },

  // ══════════════════════════════════════════════
  // Local Routines (offline scheduling)
  // ══════════════════════════════════════════════

  routines: {
    list: () => ipcRenderer.invoke('routine:list'),
    add: (routine: {
      name: string; schedule: string; enabled: boolean;
      toolChain: Array<{ toolName: string; params?: Record<string, string> }>;
    }) => ipcRenderer.invoke('routine:add', routine),
    update: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke('routine:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('routine:delete', id),
    runNow: (id: string) => ipcRenderer.invoke('routine:runNow', id),
    onExecuted: (callback: (data: { id: string; name: string; lastRun: string; result: string }) => void) => {
      ipcRenderer.on('routine:executed', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('routine:executed');
    },
  },

  // ══════════════════════════════════════════════
  // Power / Lifecycle Events
  // ══════════════════════════════════════════════

  power: {
    onSuspend: (callback: () => void) => {
      ipcRenderer.on('power:suspend', () => callback());
      return () => ipcRenderer.removeAllListeners('power:suspend');
    },
    onResume: (callback: () => void) => {
      ipcRenderer.on('power:resume', () => callback());
      return () => ipcRenderer.removeAllListeners('power:resume');
    },
    onLock: (callback: () => void) => {
      ipcRenderer.on('power:lock', () => callback());
      return () => ipcRenderer.removeAllListeners('power:lock');
    },
    onUnlock: (callback: () => void) => {
      ipcRenderer.on('power:unlock', () => callback());
      return () => ipcRenderer.removeAllListeners('power:unlock');
    },
    onIdle: (callback: (data: { seconds: number }) => void) => {
      ipcRenderer.on('power:idle', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('power:idle');
    },
  },

  // ══════════════════════════════════════════════
  // Voice — Wake Word + Push-to-Talk
  // ══════════════════════════════════════════════

  voice: {
    /** Toggle "Hey Nova" wake word detection on/off */
    toggleWake: () => ipcRenderer.invoke('voice:toggleWake'),
    /** Get current wake word state */
    wakeState: () => ipcRenderer.invoke('voice:wakeState'),
    /** Get current PTT state */
    pttState: () => ipcRenderer.invoke('voice:pttState'),
    /** Change PTT hotkey */
    setPttHotkey: (hotkey: string) => ipcRenderer.invoke('voice:pttHotkey', hotkey),
    /** Fired when wake word is detected */
    onWake: (callback: () => void) => {
      ipcRenderer.on('voice:wake', () => callback());
      return () => ipcRenderer.removeAllListeners('voice:wake');
    },
    /** Fired when wake word detection state changes */
    onWakeState: (callback: (state: string) => void) => {
      ipcRenderer.on('voice:wake-state', (_event, state) => callback(state));
      return () => ipcRenderer.removeAllListeners('voice:wake-state');
    },
    /** Fired when PTT state changes (idle, recording, transcribing) */
    onPttState: (callback: (state: string) => void) => {
      ipcRenderer.on('voice:ptt-state', (_event, state) => callback(state));
      return () => ipcRenderer.removeAllListeners('voice:ptt-state');
    },
    /** Fired when PTT transcription is complete */
    onTranscription: (callback: (text: string) => void) => {
      ipcRenderer.on('voice:transcription', (_event, text) => callback(text));
      return () => ipcRenderer.removeAllListeners('voice:transcription');
    },
    /** Fired when PTT encounters an error */
    onPttError: (callback: (error: string) => void) => {
      ipcRenderer.on('voice:ptt-error', (_event, error) => callback(error));
      return () => ipcRenderer.removeAllListeners('voice:ptt-error');
    },
  },

  // ══════════════════════════════════════════════
  // Browser Automation
  // ══════════════════════════════════════════════

  browser: {
    /** Open browser (optionally at a URL) */
    open: (url?: string) => ipcRenderer.invoke('browser:open', url),
    /** Navigate to a URL */
    navigate: (url: string) => ipcRenderer.invoke('browser:navigate', url),
    /** Get text snapshot of the page */
    snapshot: () => ipcRenderer.invoke('browser:snapshot'),
    /** Click an element (text, selector, or "x,y" coordinates) */
    click: (target: string) => ipcRenderer.invoke('browser:click', target),
    /** Type text (optionally into a specific selector) */
    type: (text: string, selector?: string) => ipcRenderer.invoke('browser:type', text, selector),
    /** Take a screenshot */
    screenshot: (selector?: string) => ipcRenderer.invoke('browser:screenshot', selector),
    /** Close the browser */
    close: () => ipcRenderer.invoke('browser:close'),
    /** Check if browser is open */
    isOpen: () => ipcRenderer.invoke('browser:isOpen'),
  },

  // ── Capabilities flag ──
  capabilities: [
    'filesystem',
    'clipboard',
    'screenshot',
    'systemInfo',
    'shell',
    'notifications',
    'deepLink',
    'autoUpdater',
    'automation',
    'calendar',
    'reminders',
    'mail',
    'notes',
    'systemControl',
    'appControl',
    'windowManagement',
    'accessibility',
    'spotlight',
    'tts',
    'fileWatcher',
    'localRoutines',
    'powerMonitor',
    'headlessFs',
    'imessage',
    'gateway',
    'voiceWake',
    'pushToTalk',
    'browserAutomation',
  ],
});
