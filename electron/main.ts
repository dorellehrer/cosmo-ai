/**
 * Nova AI — Electron Main Process
 * Wraps the Next.js web app in a native desktop window for macOS and Windows.
 */

import {
  app,
  BrowserWindow,
  shell,
  Menu,
  Tray,
  nativeImage,
  globalShortcut,
  ipcMain,
  Notification,
  dialog,
  clipboard,
  screen,
  powerMonitor,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import os from 'os';
import * as automation from './automation';
import { GatewayClient } from './gateway-client';
import { IMessageWatcher, isAvailable as isIMessageAvailable } from './imessage';
import { dispatchToolCall } from './tool-dispatcher';
import { setPushToTalkGetter } from './tool-dispatcher';
import { VoiceWake, broadcastWakeEvent } from './voice-wake';
import { PushToTalk, broadcastPttEvent, type PttState } from './push-to-talk';
import { BrowserAutomation } from './browser-automation';

// The production URL to load (set via env or default)
const APP_URL = process.env.NOVA_APP_URL || 'https://www.heynova.se';
const IS_DEV = process.env.NODE_ENV === 'development';
const DEV_URL = 'http://localhost:3000';
const ENABLE_GATEWAY_CLIENT =
  process.env.ENABLE_GATEWAY_CLIENT === '1' ||
  (process.env.ENABLE_GATEWAY_CLIENT === undefined && !IS_DEV);
const ENABLE_IMESSAGE_WATCHER = process.env.ENABLE_IMESSAGE_WATCHER === '1';
const ENABLE_IMESSAGE_CAPABILITY = process.env.ENABLE_IMESSAGE_CAPABILITY === '1';

const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';

let mainWindow: BrowserWindow | null = null;
let quickChatWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let gatewayClient: GatewayClient | null = null;
let imessageWatcher: IMessageWatcher | null = null;
let voiceWake: VoiceWake | null = null;
let pushToTalk: PushToTalk | null = null;
let browserAutomation: BrowserAutomation | null = null;

function getIconPath(): string {
  // In packaged app, resources are in the app.asar parent directory
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icons', 'icon-512.png');
  }
  return path.join(__dirname, '..', 'public', 'icons', 'icon-512.png');
}

/** Desktop CSS injected into every main window page load */
function getDesktopCSS(): string {
  return `
    /* ═══════════════════════════════════════════════
       Nova AI Desktop — Futuristic Native Styling
       ═══════════════════════════════════════════════ */

    /* Window shape: transparent root for rounded corners (macOS) */
    html, body {
      background: transparent !important;
      overflow: hidden !important;
    }

    /* Root container gets the gem-shaped window + solid background */
    body > div:first-child,
    #__next,
    #__next > div:first-child {
      border-radius: ${IS_MAC ? '28px 14px 28px 14px / 14px 28px 14px 28px' : '0px'};
      overflow: hidden;
      background: #0a0a0a;
      height: 100vh;
      position: relative;
    }

    /* Animated glow border following gem shape (macOS only) */
    ${IS_MAC ? `
    #__next::after {
      content: '';
      position: fixed;
      inset: 0;
      border-radius: 28px 14px 28px 14px / 14px 28px 14px 28px;
      padding: 1.5px;
      background: linear-gradient(
        135deg,
        rgba(139, 92, 246, 0.5),
        rgba(217, 70, 239, 0.3),
        rgba(56, 189, 248, 0.2),
        rgba(139, 92, 246, 0.5)
      );
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      z-index: 99999;
      animation: nova-glow-rotate 6s linear infinite;
    }

    @keyframes nova-glow-rotate {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }` : ''}

    /* Hide web navigation and footer */
    nav.sticky.top-0.z-50,
    nav.sticky.top-0.z-40 { display: none !important; }
    footer.border-t { display: none !important; }

    /* ── Drag regions ── */
    body { -webkit-app-region: no-drag; }

    /* Sidebar header = drag region */
    [data-drag-region] {
      -webkit-app-region: drag;
      padding-top: ${IS_MAC ? '38px' : '8px'} !important;
    }
    [data-drag-region] button,
    [data-drag-region] a,
    [data-drag-region] input {
      -webkit-app-region: no-drag;
    }

    /* Main header = drag region */
    .min-h-screen > .flex-1 > header {
      -webkit-app-region: drag;
      padding-top: ${IS_MAC ? '6px' : '4px'} !important;
    }
    .min-h-screen > .flex-1 > header button,
    .min-h-screen > .flex-1 > header a,
    .min-h-screen > .flex-1 > header input,
    .min-h-screen > .flex-1 > header kbd {
      -webkit-app-region: no-drag;
    }

    /* ── Frosted glass sidebar ── */
    ${IS_MAC ? `
    .min-h-screen > aside {
      background: rgba(15, 15, 25, 0.55) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
    }` : `
    .min-h-screen > aside {
      background: rgba(10, 10, 18, 0.88) !important;
      backdrop-filter: blur(30px) !important;
    }`}

    /* Sidebar border glow */
    .min-h-screen > aside {
      border-right: 1px solid rgba(139, 92, 246, 0.15) !important;
    }

    /* ── Custom scrollbar ── */
    ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
    ::-webkit-scrollbar-track { background: transparent !important; }
    ::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.2) !important;
      border-radius: 3px !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(139, 92, 246, 0.4) !important;
    }

    /* ── Lock viewport (desktop handles overflow) ── */
    .min-h-screen {
      height: 100vh !important;
      min-height: 100vh !important;
      max-height: 100vh !important;
      overflow: hidden !important;
    }

    /* ── Windows: space for custom title bar controls ── */
    ${IS_WIN ? `
    .min-h-screen > .flex-1 > header {
      padding-right: 140px !important;
    }` : ''}

    /* ── Launch animation ── */
    @keyframes nova-launch {
      0% { opacity: 0; transform: scale(0.97) translateY(8px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .min-h-screen {
      animation: nova-launch 0.4s cubic-bezier(0.16, 1, 0.3, 1) both !important;
    }
  `;
}

/** Inject Windows custom title bar controls (min/max/close) */
function injectWindowsControls(win: BrowserWindow): void {
  if (!IS_WIN) return;
  win.webContents.executeJavaScript(`
    (function() {
      if (document.getElementById('nova-win-controls')) return;
      const c = document.createElement('div');
      c.id = 'nova-win-controls';
      c.style.cssText = 'position:fixed;top:0;right:0;z-index:99999;display:flex;-webkit-app-region:no-drag;height:36px;';
      const s = 'width:46px;height:36px;border:none;background:transparent;color:rgba(255,255,255,0.7);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;';
      const min = document.createElement('button');
      min.innerHTML = '<svg width="10" height="1"><rect fill="currentColor" width="10" height="1"/></svg>';
      min.style.cssText = s;
      min.onmouseover = () => min.style.background = 'rgba(255,255,255,0.1)';
      min.onmouseout = () => min.style.background = 'transparent';
      min.onclick = () => window.novaDesktop?.minimize();
      const max = document.createElement('button');
      max.innerHTML = '<svg width="10" height="10"><rect fill="none" stroke="currentColor" width="9" height="9" x=".5" y=".5"/></svg>';
      max.style.cssText = s;
      max.onmouseover = () => max.style.background = 'rgba(255,255,255,0.1)';
      max.onmouseout = () => max.style.background = 'transparent';
      max.onclick = () => window.novaDesktop?.maximize();
      const cls = document.createElement('button');
      cls.innerHTML = '<svg width="10" height="10"><path fill="currentColor" d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4z"/></svg>';
      cls.style.cssText = s;
      cls.onmouseover = () => { cls.style.background='#e81123'; cls.style.color='#fff'; };
      cls.onmouseout = () => { cls.style.background='transparent'; cls.style.color='rgba(255,255,255,0.7)'; };
      cls.onclick = () => window.novaDesktop?.close();
      c.append(min, max, cls);
      document.body.appendChild(c);
    })();
  `);
}

/** Fade-in animation for a window */
function animateWindowIn(win: BrowserWindow, duration = 200): void {
  win.setOpacity(0);
  win.show();
  win.focus();
  let opacity = 0;
  const step = 16 / duration; // per-frame increment
  const interval = setInterval(() => {
    opacity += step;
    if (opacity >= 1) { opacity = 1; clearInterval(interval); }
    try { win.setOpacity(opacity); } catch { clearInterval(interval); }
  }, 16);
}

function createWindow(): void {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 860,
    height: 640,
    minWidth: 480,
    minHeight: 500,
    title: 'Nova AI',
    icon: iconPath,
    frame: false,
    transparent: IS_MAC,
    backgroundColor: IS_MAC ? '#00000000' : '#0a0a0a',
    titleBarStyle: IS_MAC ? 'hidden' : undefined,
    trafficLightPosition: IS_MAC ? { x: 16, y: 18 } : undefined,
    vibrancy: IS_MAC ? 'sidebar' : undefined,
    visualEffectState: IS_MAC ? 'active' : undefined,
    backgroundMaterial: IS_WIN ? 'mica' : undefined,
    show: false,
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  // Load directly into chat
  const url = IS_DEV ? DEV_URL + '/chat' : APP_URL + '/chat';
  mainWindow.loadURL(url);

  // Inject futuristic desktop styles + Windows controls
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.insertCSS(getDesktopCSS());
    injectWindowsControls(mainWindow!);
  });

  // Smooth fade-in on first show
  mainWindow.once('ready-to-show', () => {
    animateWindowIn(mainWindow!, 200);
  });

  // Fullscreen: remove/restore border-radius
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.insertCSS(`
      body > div:first-child, #__next, #__next > div:first-child { border-radius: 0 !important; }
      #__next::after { border-radius: 0 !important; }
    `);
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.insertCSS(`
      body > div:first-child, #__next, #__next > div:first-child { border-radius: 12px !important; }
      #__next::after { border-radius: 12px !important; }
    `);
  });

  // OAuth domains that must stay inside the app window (not open externally)
  const oauthDomains = [
    'accounts.google.com',
    'github.com',
    'slack.com',
    'api.notion.com',
    'www.notion.so',
    'accounts.spotify.com',
    'api.meethue.com',
    'api.sonos.com',
  ];

  const isAllowedInApp = (url: string) => {
    try {
      const parsed = new URL(url);
      const appOrigin = new URL(IS_DEV ? DEV_URL : APP_URL).origin;
      if (url.startsWith(appOrigin)) return true;
      if (oauthDomains.some((d) => parsed.hostname === d || parsed.hostname.endsWith('.' + d))) return true;
      return false;
    } catch { return false; }
  };

  // Open external links in default browser (but keep OAuth flows in-app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedInApp(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedInApp(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

/** Spotlight-style quick chat popup */
function createQuickChat(): void {
  // Toggle if already exists
  if (quickChatWindow) {
    if (quickChatWindow.isVisible()) { quickChatWindow.hide(); return; }
    quickChatWindow.show();
    quickChatWindow.focus();
    return;
  }

  const display = screen.getPrimaryDisplay();
  const { width: screenWidth } = display.workAreaSize;

  quickChatWindow = new BrowserWindow({
    width: 680,
    height: 480,
    x: Math.round((screenWidth - 680) / 2),
    y: 160,
    frame: false,
    transparent: IS_MAC,
    backgroundColor: IS_MAC ? '#00000000' : '#0a0a0a',
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    roundedCorners: true,
    vibrancy: IS_MAC ? 'popover' : undefined,
    visualEffectState: IS_MAC ? 'active' : undefined,
    backgroundMaterial: IS_WIN ? 'mica' : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = IS_DEV ? DEV_URL + '/chat' : APP_URL + '/chat';
  quickChatWindow.loadURL(url);

  quickChatWindow.webContents.on('did-finish-load', () => {
    quickChatWindow?.webContents.insertCSS(`
      html, body { background: transparent !important; overflow: hidden !important; }
      body > div:first-child, #__next, #__next > div:first-child {
        border-radius: ${IS_MAC ? '16px' : '8px'};
        overflow: hidden;
        background: rgba(10, 10, 15, ${IS_MAC ? '0.75' : '0.95'});
        height: 100vh;
      }
      ${IS_MAC ? `
      #__next::after {
        content: '';
        position: fixed; inset: 0;
        border-radius: 16px; padding: 1px;
        background: linear-gradient(135deg, rgba(139,92,246,0.4), rgba(217,70,239,0.3), rgba(139,92,246,0.2));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        pointer-events: none; z-index: 99999;
      }` : ''}
      /* Hide sidebar, header, footer, nav */
      nav.sticky { display: none !important; }
      footer.border-t { display: none !important; }
      .min-h-screen > aside { display: none !important; }
      .min-h-screen > div.fixed { display: none !important; }
      .min-h-screen > .flex-1 > header { display: none !important; }
      /* Hide model picker row */
      .min-h-screen > .flex-1 > footer .flex.items-center.gap-2.mb-2 { display: none !important; }
      /* Compact input */
      .min-h-screen > .flex-1 > footer { border-top: 1px solid rgba(139,92,246,0.15) !important; }
      .min-h-screen > .flex-1 > main { padding-top: 16px !important; }
      .min-h-screen > .flex-1 > main > div { padding: 8px 16px !important; }
      .min-h-screen { height: 100vh !important; overflow: hidden !important; }
      /* Drag handle */
      body::before {
        content: ''; display: block;
        width: 40px; height: 4px;
        background: rgba(255,255,255,0.2); border-radius: 2px;
        margin: 10px auto 0;
        -webkit-app-region: drag;
      }
      /* Launch animation */
      @keyframes qc-in { 0% { opacity:0; transform:scale(0.95) translateY(10px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
      .min-h-screen { animation: qc-in 0.3s cubic-bezier(0.16,1,0.3,1) both !important; }
      /* Scrollbar */
      ::-webkit-scrollbar { width: 4px !important; }
      ::-webkit-scrollbar-track { background: transparent !important; }
      ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.2) !important; border-radius: 2px !important; }
    `);
  });

  quickChatWindow.once('ready-to-show', () => {
    animateWindowIn(quickChatWindow!, 150);
  });

  // Dismiss on blur (Spotlight-style)
  quickChatWindow.on('blur', () => { quickChatWindow?.hide(); });
  quickChatWindow.on('closed', () => { quickChatWindow = null; });
}

function createTray(): void {
  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Nova',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quick Chat',
      accelerator: 'CmdOrCtrl+Shift+Space',
      click: () => createQuickChat(),
    },
    {
      label: 'New Chat',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.loadURL(`${IS_DEV ? DEV_URL : APP_URL}/chat`);
        }
      },
    },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.loadURL(`${IS_DEV ? DEV_URL : APP_URL}/settings`);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Nova',
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
      click: () => app.quit(),
    },
  ]);

  tray.setToolTip('Nova AI');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
}

function createMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.loadURL(`${IS_DEV ? DEV_URL : APP_URL}/chat`);
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(IS_DEV ? [{ role: 'toggleDevTools' as const }] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── App lifecycle ────────────────────────────

// ── IPC Handlers ────────────────────────────

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.on('quickchat:toggle', () => createQuickChat());
ipcMain.on('notification:show', (_event, { title, body }: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: getIconPath() }).show();
  }
});

// ── File System (dialog-gated for safety) ────────────────────────────

ipcMain.handle('fs:readFile', async (_event, options: { title?: string; filters?: { name: string; extensions: string[] }[] }) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || 'Open File',
    filters: options?.filters || [
      { name: 'Text Files', extensions: ['txt', 'md', 'json', 'csv', 'xml', 'yaml', 'yml'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  const stats = fs.statSync(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    content,
    size: stats.size,
    modified: stats.mtime.toISOString(),
  };
});

ipcMain.handle('fs:saveFile', async (_event, options: { content: string; defaultName?: string; filters?: { name: string; extensions: string[] }[] }) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save File',
    defaultPath: options.defaultName || 'untitled.txt',
    filters: options.filters || [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, options.content, 'utf-8');
  return { path: result.filePath, name: path.basename(result.filePath) };
});

ipcMain.handle('fs:selectFolder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const folderPath = result.filePaths[0];
  // List contents (shallow)
  const entries = fs.readdirSync(folderPath, { withFileTypes: true }).slice(0, 100).map((e) => ({
    name: e.name,
    isDirectory: e.isDirectory(),
    size: e.isFile() ? fs.statSync(path.join(folderPath, e.name)).size : undefined,
  }));
  return { path: folderPath, entries };
});

// ── Clipboard ────────────────────────────

ipcMain.handle('clipboard:read', () => {
  return {
    text: clipboard.readText(),
    html: clipboard.readHTML(),
    hasImage: !clipboard.readImage().isEmpty(),
  };
});

ipcMain.handle('clipboard:write', (_event, data: { text?: string; html?: string }) => {
  if (data.text) clipboard.writeText(data.text);
  if (data.html) clipboard.writeHTML(data.html);
  return true;
});

ipcMain.handle('clipboard:readImage', () => {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;
  return image.toDataURL();
});

// ── Screenshot ────────────────────────────

ipcMain.handle('screen:capture', async () => {
  if (!mainWindow) return null;
  const displays = screen.getAllDisplays();
  const primaryDisplay = displays[0];
  
  // Capture the primary display
  const sources = await (await import('electron')).desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: primaryDisplay.size,
  });
  
  if (sources.length === 0) return null;
  return sources[0].thumbnail.toDataURL();
});

ipcMain.handle('screen:captureWindow', async () => {
  if (!mainWindow) return null;
  const image = await mainWindow.webContents.capturePage();
  return image.toDataURL();
});

// ── System Info ────────────────────────────

ipcMain.handle('system:info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    username: os.userInfo().username,
    homeDir: os.homedir(),
    cpus: os.cpus().length,
    totalMemory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))}GB`,
    freeMemory: `${Math.round(os.freemem() / (1024 * 1024 * 1024))}GB`,
    uptime: `${Math.round(os.uptime() / 3600)}h`,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
  };
});

// ── Shell (sandboxed — opens URL/path in default app) ────────────────────────────

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  // Only allow http/https/mailto URLs
  if (/^(https?|mailto):/.test(url)) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  // Validate the path exists
  if (!fs.existsSync(filePath)) return { error: 'Path does not exist' };
  const result = await shell.openPath(filePath);
  return result ? { error: result } : { success: true };
});

ipcMain.handle('shell:showInFolder', (_event, filePath: string) => {
  shell.showItemInFolder(filePath);
  return true;
});

// ── macOS Automation ────────────────────────────────────────

// Calendar
ipcMain.handle('automation:calendar:listEvents', async (_event, options) => {
  return automation.calendarListEvents(options || {});
});
ipcMain.handle('automation:calendar:createEvent', async (_event, options) => {
  return automation.calendarCreateEvent(options);
});
ipcMain.handle('automation:calendar:listCalendars', async () => {
  return automation.calendarListCalendars();
});

// Reminders
ipcMain.handle('automation:reminders:list', async (_event, options) => {
  return automation.remindersListAll(options || {});
});
ipcMain.handle('automation:reminders:create', async (_event, options) => {
  return automation.remindersCreate(options);
});
ipcMain.handle('automation:reminders:listLists', async () => {
  return automation.remindersListLists();
});

// Mail
ipcMain.handle('automation:mail:search', async (_event, options) => {
  return automation.mailSearch(options);
});
ipcMain.handle('automation:mail:send', async (_event, options) => {
  return automation.mailSend(options);
});
ipcMain.handle('automation:mail:unreadCount', async () => {
  return automation.mailGetUnreadCount();
});

// Notes
ipcMain.handle('automation:notes:create', async (_event, options) => {
  return automation.notesCreate(options);
});
ipcMain.handle('automation:notes:search', async (_event, options) => {
  return automation.notesSearch(options);
});

// System Control
ipcMain.handle('automation:system:getVolume', async () => {
  return automation.systemGetVolume();
});
ipcMain.handle('automation:system:setVolume', async (_event, options) => {
  return automation.systemSetVolume(options);
});
ipcMain.handle('automation:system:getBrightness', async () => {
  return automation.systemGetBrightness();
});
ipcMain.handle('automation:system:setBrightness', async (_event, options) => {
  return automation.systemSetBrightness(options);
});
ipcMain.handle('automation:system:getDarkMode', async () => {
  return automation.systemGetDarkMode();
});
ipcMain.handle('automation:system:setDarkMode', async (_event, options) => {
  return automation.systemSetDarkMode(options);
});
ipcMain.handle('automation:system:getDnd', async () => {
  return automation.systemGetDoNotDisturb();
});
ipcMain.handle('automation:system:toggleDnd', async () => {
  return automation.systemToggleDoNotDisturb();
});
ipcMain.handle('automation:system:sleep', async () => {
  return automation.systemSleep();
});
ipcMain.handle('automation:system:lockScreen', async () => {
  return automation.systemLockScreen();
});
ipcMain.handle('automation:system:emptyTrash', async () => {
  return automation.systemEmptyTrash();
});

// Application Control
ipcMain.handle('automation:app:list', async () => {
  return automation.appList();
});
ipcMain.handle('automation:app:launch', async (_event, options) => {
  return automation.appLaunch(options);
});
ipcMain.handle('automation:app:quit', async (_event, options) => {
  return automation.appQuit(options);
});
ipcMain.handle('automation:app:focus', async (_event, options) => {
  return automation.appFocus(options);
});
ipcMain.handle('automation:app:isRunning', async (_event, options) => {
  return automation.appIsRunning(options);
});

// Headless File System (no dialog — for AI automations)
ipcMain.handle('automation:fs:readFile', async (_event, options) => {
  return automation.fsReadFile(options);
});
ipcMain.handle('automation:fs:writeFile', async (_event, options) => {
  return automation.fsWriteFile(options);
});
ipcMain.handle('automation:fs:listDir', async (_event, options) => {
  return automation.fsListDir(options);
});
ipcMain.handle('automation:fs:search', async (_event, options) => {
  return automation.fsSearch(options);
});
ipcMain.handle('automation:fs:moveToTrash', async (_event, options) => {
  return automation.fsMoveToTrash(options);
});
ipcMain.handle('automation:fs:revealInFinder', async (_event, options) => {
  return automation.fsRevealInFinder(options);
});

// Window Management
ipcMain.handle('automation:window:list', async () => {
  return automation.windowList();
});
ipcMain.handle('automation:window:resize', async (_event, options) => {
  return automation.windowResize(options);
});
ipcMain.handle('automation:window:minimizeAll', async () => {
  return automation.windowMinimizeAll();
});

// Accessibility
ipcMain.handle('automation:accessibility:check', async () => {
  return automation.accessibilityCheckPermission();
});
ipcMain.handle('automation:accessibility:request', async () => {
  return automation.accessibilityRequestPermission();
});
ipcMain.handle('automation:accessibility:click', async (_event, options) => {
  return automation.accessibilityClickElement(options);
});
ipcMain.handle('automation:accessibility:type', async (_event, options) => {
  return automation.accessibilityTypeText(options);
});
ipcMain.handle('automation:accessibility:pressKey', async (_event, options) => {
  return automation.accessibilityPressKey(options);
});
ipcMain.handle('automation:accessibility:readScreen', async (_event, options) => {
  return automation.accessibilityReadScreen(options);
});

// Shell (allowlisted commands)
ipcMain.handle('automation:shell:run', async (_event, options) => {
  return automation.shellRun(options);
});

// Spotlight
ipcMain.handle('automation:spotlight:search', async (_event, options) => {
  return automation.spotlightSearch(options);
});

// Text-to-Speech
ipcMain.handle('automation:speak', async (_event, options) => {
  return automation.speak(options);
});
ipcMain.handle('automation:speak:voices', async () => {
  return automation.speakListVoices();
});

// File Watcher
const watchCallbacks = new Map<string, string>();
ipcMain.handle('automation:fs:watch', (_event, dirPath: string) => {
  const id = automation.fsWatch(dirPath, (event, filename) => {
    mainWindow?.webContents.send('automation:fs:change', { id, event, filename });
  });
  return id;
});
ipcMain.handle('automation:fs:unwatch', (_event, id: string) => {
  return automation.fsUnwatch(id);
});

// ── Local Routine Scheduler ──────────────────────────────────

interface LocalRoutine {
  id: string;
  name: string;
  schedule: string; // cron expression
  enabled: boolean;
  toolChain: Array<{ toolName: string; params?: Record<string, string> }>;
  lastRun?: string;
  lastResult?: string;
}

const localRoutines: LocalRoutine[] = [];
const routineTimers = new Map<string, ReturnType<typeof setInterval>>();

function parseCronField(field: string, now: number, max: number): boolean {
  if (field === '*') return true;
  if (field.startsWith('*/')) {
    const interval = parseInt(field.slice(2));
    return now % interval === 0;
  }
  const values = field.split(',').map(v => parseInt(v.trim()));
  return values.includes(now);
}

function shouldRunCron(schedule: string, date: Date): boolean {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  return (
    parseCronField(minute, date.getMinutes(), 59) &&
    parseCronField(hour, date.getHours(), 23) &&
    parseCronField(dayOfMonth, date.getDate(), 31) &&
    parseCronField(month, date.getMonth() + 1, 12) &&
    parseCronField(dayOfWeek, date.getDay(), 6)
  );
}

async function executeLocalRoutineStep(step: { toolName: string; params?: Record<string, string> }): Promise<string> {
  try {
    // Map tool names to automation functions
    const toolMap: Record<string, (params: Record<string, string>) => Promise<unknown>> = {
      // Calendar
      'desktop_calendar_list': (p) => automation.calendarListEvents({ days: parseInt(p.days || '7') }),
      'desktop_calendar_create': (p) => automation.calendarCreateEvent({
        title: p.title || 'Untitled',
        startDate: p.startDate || new Date().toISOString(),
        endDate: p.endDate || new Date(Date.now() + 3600000).toISOString(),
        location: p.location,
        calendarName: p.calendarName,
      }),
      // Reminders
      'desktop_reminders_list': (p) => automation.remindersListAll({ listName: p.listName }),
      'desktop_reminders_create': (p) => automation.remindersCreate({
        name: p.name || 'Untitled',
        dueDate: p.dueDate,
        listName: p.listName,
        notes: p.notes,
      }),
      // Mail
      'desktop_mail_unread': () => automation.mailGetUnreadCount(),
      'desktop_mail_search': (p) => automation.mailSearch({ query: p.query || '' }),
      'desktop_mail_send': (p) => automation.mailSend({
        to: p.to || '',
        subject: p.subject || '',
        body: p.body || '',
      }),
      // Notes
      'desktop_notes_create': (p) => automation.notesCreate({
        title: p.title || 'Untitled',
        body: p.body || '',
      }),
      // System
      'desktop_system_volume': (p) => automation.systemSetVolume({ volume: parseInt(p.volume || '50') }),
      'desktop_system_dark_mode': (p) => automation.systemSetDarkMode({ enabled: p.enabled === 'true' }),
      'desktop_system_dnd_toggle': () => automation.systemToggleDoNotDisturb(),
      // Apps
      'desktop_app_launch': (p) => automation.appLaunch({ name: p.name || '' }),
      'desktop_app_quit': (p) => automation.appQuit({ name: p.name || '' }),
      // Files
      'desktop_fs_read': (p) => automation.fsReadFile({ path: p.path || '' }),
      'desktop_fs_write': (p) => automation.fsWriteFile({ path: p.path || '', content: p.content || '' }),
      // Shell
      'desktop_shell_run': (p) => automation.shellRun({ command: p.command || '' }),
      // Speak
      'desktop_speak': (p) => automation.speak({ text: p.text || '' }),
    };

    const handler = toolMap[step.toolName];
    if (!handler) {
      return JSON.stringify({ error: `Unknown tool: ${step.toolName}` });
    }
    const result = await handler(step.params || {});
    return JSON.stringify(result);
  } catch (error: unknown) {
    return JSON.stringify({ error: (error as Error).message });
  }
}

// Check routines every minute
function startRoutineScheduler(): void {
  setInterval(async () => {
    const now = new Date();
    for (const routine of localRoutines) {
      if (!routine.enabled) continue;
      if (!shouldRunCron(routine.schedule, now)) continue;

      console.log(`[Routine] Executing: ${routine.name}`);
      let lastOutput = '';
      for (const step of routine.toolChain) {
        // Replace {{PREVIOUS_RESULT}} placeholder
        const params = { ...step.params };
        for (const key of Object.keys(params)) {
          if (params[key]?.includes('{{PREVIOUS_RESULT}}')) {
            params[key] = params[key].replace('{{PREVIOUS_RESULT}}', lastOutput);
          }
        }
        lastOutput = await executeLocalRoutineStep({ ...step, params });
      }

      routine.lastRun = now.toISOString();
      routine.lastResult = lastOutput.substring(0, 1000);

      // Notify the renderer
      mainWindow?.webContents.send('routine:executed', {
        id: routine.id,
        name: routine.name,
        lastRun: routine.lastRun,
        result: routine.lastResult,
      });
    }
  }, 60_000); // Every minute
}

// Routine IPC handlers
ipcMain.handle('routine:list', () => {
  return localRoutines;
});

ipcMain.handle('routine:add', (_event, routine: Omit<LocalRoutine, 'id'>) => {
  const newRoutine: LocalRoutine = {
    ...routine,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  localRoutines.push(newRoutine);
  saveRoutinesToDisk();
  return newRoutine;
});

ipcMain.handle('routine:update', (_event, id: string, updates: Partial<LocalRoutine>) => {
  const routine = localRoutines.find(r => r.id === id);
  if (!routine) return { error: 'Routine not found' };
  Object.assign(routine, updates);
  saveRoutinesToDisk();
  return routine;
});

ipcMain.handle('routine:delete', (_event, id: string) => {
  const idx = localRoutines.findIndex(r => r.id === id);
  if (idx === -1) return { error: 'Routine not found' };
  localRoutines.splice(idx, 1);
  saveRoutinesToDisk();
  return { success: true };
});

ipcMain.handle('routine:runNow', async (_event, id: string) => {
  const routine = localRoutines.find(r => r.id === id);
  if (!routine) return { error: 'Routine not found' };

  let lastOutput = '';
  for (const step of routine.toolChain) {
    const params = { ...step.params };
    for (const key of Object.keys(params)) {
      if (params[key]?.includes('{{PREVIOUS_RESULT}}')) {
        params[key] = params[key].replace('{{PREVIOUS_RESULT}}', lastOutput);
      }
    }
    lastOutput = await executeLocalRoutineStep({ ...step, params });
  }

  routine.lastRun = new Date().toISOString();
  routine.lastResult = lastOutput.substring(0, 1000);
  saveRoutinesToDisk();
  return { result: lastOutput };
});

// Persist routines to disk
const ROUTINES_FILE = path.join(app.getPath('userData'), 'local-routines.json');

function loadRoutinesFromDisk(): void {
  try {
    if (fs.existsSync(ROUTINES_FILE)) {
      const data = JSON.parse(fs.readFileSync(ROUTINES_FILE, 'utf-8'));
      localRoutines.push(...data);
      console.log(`[Routines] Loaded ${data.length} routines from disk`);
    }
  } catch (err) {
    console.error('[Routines] Failed to load:', err);
  }
}

function saveRoutinesToDisk(): void {
  try {
    fs.writeFileSync(ROUTINES_FILE, JSON.stringify(localRoutines, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Routines] Failed to save:', err);
  }
}

// ── Power Monitor ────────────────────────────────────────────

function setupPowerMonitor(): void {
  powerMonitor.on('suspend', () => {
    console.log('[Power] System suspending');
    mainWindow?.webContents.send('power:suspend');
  });
  powerMonitor.on('resume', () => {
    console.log('[Power] System resumed');
    mainWindow?.webContents.send('power:resume');
  });
  powerMonitor.on('lock-screen', () => {
    mainWindow?.webContents.send('power:lock');
  });
  powerMonitor.on('unlock-screen', () => {
    mainWindow?.webContents.send('power:unlock');
  });
  // Idle detection (5 min threshold)
  setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime();
    if (idleTime > 300) {
      mainWindow?.webContents.send('power:idle', { seconds: idleTime });
    }
  }, 60_000);
}

// ── Deep Linking (nova:// protocol) ────────────────────────────

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('nova', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('nova');
}

// Handle nova:// URLs on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function handleDeepLink(url: string) {
  // nova://chat → open new chat
  // nova://chat/123 → open specific conversation
  // nova://settings → open settings
  try {
    const parsed = new URL(url);
    const route = parsed.hostname + parsed.pathname;
    const appUrl = IS_DEV ? DEV_URL : APP_URL;
    
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      if (route.startsWith('chat')) {
        mainWindow.webContents.loadURL(`${appUrl}/chat${parsed.pathname}`);
      } else if (route === 'settings') {
        mainWindow.webContents.loadURL(`${appUrl}/settings`);
      }
    }
  } catch {
    // Invalid URL, ignore
  }
}

// ── Auto Updater ────────────────────────────────────────────

function setupAutoUpdater(): void {
  // Don't check for updates in development
  if (IS_DEV) return;

  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;

  // Set the update feed URL (GitHub Releases by default with electron-updater)
  // For custom server: autoUpdater.setFeedURL({ provider: 'generic', url: 'https://updates.heynova.se' });

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    mainWindow?.webContents.send('updater:status', {
      status: 'available',
      version: info.version,
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    mainWindow?.webContents.send('updater:status', {
      status: 'downloaded',
      version: info.version,
    });

    // Show a native notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Nova Update Ready',
        body: `Version ${info.version} has been downloaded. Restart to apply.`,
        icon: getIconPath(),
      });
      notification.on('click', () => {
        autoUpdater.quitAndInstall(false, true);
      });
      notification.show();
    }
  });

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Error:', error.message);
  });

  // Check for updates after a short delay (don't block startup)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[Updater] Failed to check for updates:', err);
    });
  }, 10_000);

  // Re-check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

// IPC handlers for auto-updater
ipcMain.handle('updater:check', async () => {
  if (IS_DEV) return { status: 'dev' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checked', version: result?.updateInfo?.version };
  } catch {
    return { status: 'error' };
  }
});

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

// ── Gateway Hub Connection ───────────────────────────────────

/**
 * Extract the session cookie from the main window's cookies.
 * The gateway client needs this to authenticate with the REST API.
 */
async function getSessionCookie(): Promise<string | null> {
  if (!mainWindow) return null;

  try {
    const appOrigin = IS_DEV ? DEV_URL : APP_URL;
    const url = new URL(appOrigin);
    const cookies = await mainWindow.webContents.session.cookies.get({
      domain: url.hostname,
    });

    // NextAuth stores the session token in these cookies
    const sessionCookies = cookies.filter(c =>
      c.name === 'next-auth.session-token' ||
      c.name === '__Secure-next-auth.session-token'
    );

    if (sessionCookies.length === 0) return null;

    // Format as Cookie header
    return sessionCookies.map(c => `${c.name}=${c.value}`).join('; ');
  } catch (err) {
    console.error('[Gateway] Failed to extract session cookie:', err);
    return null;
  }
}

/**
 * Initialize the Gateway Hub connection.
 * Waits for the main window to finish loading (user must be logged in).
 */
function initGateway(): void {
  // Wait for the page to finish loading so auth cookies are available
  const tryConnect = async () => {
    const cookie = await getSessionCookie();
    if (!cookie) {
      console.log('[Gateway] No session cookie yet, retrying in 10s...');
      setTimeout(tryConnect, 10_000);
      return;
    }

    const appUrl = IS_DEV ? DEV_URL : APP_URL;
    const capabilities = ['desktop', 'files'];
    if (ENABLE_IMESSAGE_CAPABILITY && isIMessageAvailable()) {
      capabilities.push('imessage');
    }

    gatewayClient = new GatewayClient({
      appUrl,
      sessionCookie: cookie,
      capabilities,
    });

    gatewayClient.onToolCall(dispatchToolCall);

    gatewayClient.on('connected', () => {
      console.log('[Gateway] Connected to Nova Gateway Hub');
      // Show a subtle notification
      mainWindow?.webContents.send('gateway:status', { connected: true });
    });

    gatewayClient.on('disconnected', () => {
      console.log('[Gateway] Disconnected from Gateway Hub');
      mainWindow?.webContents.send('gateway:status', { connected: false });
    });

    gatewayClient.on('error', (err: Error) => {
      console.error('[Gateway] Error:', err.message);
    });

    gatewayClient.on('tool_call', (data: { tool: string; requestId: string }) => {
      console.log(`[Gateway] Executing tool: ${data.tool}`);
    });

    try {
      await gatewayClient.connect();
    } catch (err) {
      console.error('[Gateway] Initial connection failed:', err);
      // GatewayClient handles reconnection internally
    }
  };

  // Delay initial connection to let the window load and user authenticate
  if (mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(tryConnect, 3_000);
    });

    // If the page is already loaded, try immediately
    if (!mainWindow.webContents.isLoading()) {
      setTimeout(tryConnect, 3_000);
    }
  } else {
    setTimeout(tryConnect, 5_000);
  }
}

// ── iMessage Watcher ─────────────────────────────────────────

function initIMessageWatcher(): void {
  if (!ENABLE_IMESSAGE_WATCHER) {
    console.log('[iMessage] Watcher disabled (ENABLE_IMESSAGE_WATCHER != 1)');
    return;
  }

  if (!isIMessageAvailable()) {
    console.log('[iMessage] Not available on this platform');
    return;
  }

  imessageWatcher = new IMessageWatcher();

  // Forward incoming messages to the gateway as device events
  imessageWatcher.on('incoming', (msg: { text: string | null; senderIdentifier: string | null; chatIdentifier: string }) => {
    if (gatewayClient?.isConnected) {
      gatewayClient.sendEvent('imessage.received', {
        from: msg.senderIdentifier,
        chat: msg.chatIdentifier,
        text: msg.text,
      });
    }

    // Also notify the renderer for in-app display
    mainWindow?.webContents.send('imessage:incoming', {
      from: msg.senderIdentifier,
      chat: msg.chatIdentifier,
      text: msg.text,
    });
  });

  imessageWatcher.start(5_000).then(() => {
    console.log('[iMessage] Watcher started');
  }).catch(err => {
    console.error('[iMessage] Watcher failed to start:', err);
  });
}

// ── IPC: Gateway status ──────────────────────────────────────

ipcMain.handle('gateway:status', () => {
  return {
    connected: gatewayClient?.isConnected || false,
    deviceId: gatewayClient?.currentDeviceId || null,
  };
});

ipcMain.handle('gateway:reconnect', async () => {
  if (gatewayClient) {
    gatewayClient.disconnect();
    try {
      await gatewayClient.connect();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
  return { success: false, error: 'No gateway client' };
});

// ── IPC: iMessage direct access ──────────────────────────────

ipcMain.handle('imessage:getChats', async (_event, options?: { limit?: number }) => {
  const imessageMod = await import('./imessage');
  return imessageMod.getChats(options?.limit);
});

ipcMain.handle('imessage:getMessages', async (_event, options: { chatIdentifier: string; limit?: number }) => {
  const imessageMod = await import('./imessage');
  return imessageMod.getMessages(options.chatIdentifier, options.limit);
});

ipcMain.handle('imessage:send', async (_event, options: { to: string; text: string }) => {
  const imessageMod = await import('./imessage');
  return imessageMod.sendMessage(options.to, options.text);
});

ipcMain.handle('imessage:search', async (_event, options: { query: string; limit?: number }) => {
  const imessageMod = await import('./imessage');
  return imessageMod.searchMessages(options.query, options.limit);
});

ipcMain.handle('imessage:unreadCount', async () => {
  const imessageMod = await import('./imessage');
  return imessageMod.getUnreadCount();
});

ipcMain.handle('imessage:isAvailable', () => {
  return isIMessageAvailable();
});

// ── Voice Wake Word ──────────────────────────────────────────

function initVoiceWake(): void {
  const accessKey = process.env.PICOVOICE_ACCESS_KEY;
  if (!accessKey) {
    console.log('[VoiceWake] Disabled (PICOVOICE_ACCESS_KEY not set)');
    return;
  }

  voiceWake = new VoiceWake(accessKey, {
    onWake: () => {
      console.log('[VoiceWake] Wake detected → activating PTT');
      broadcastWakeEvent('voice:wake');
      // Auto-start PTT recording after wake word
      if (pushToTalk && pushToTalk.getState() === 'idle') {
        broadcastPttEvent('voice:ptt-state', 'recording');
      }
      // Bring main window to front
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    onStateChange: (state) => {
      broadcastWakeEvent('voice:wake-state', state);
    },
    onError: (error) => {
      console.error('[VoiceWake] Error:', error);
    },
  });

  // Don't auto-start — let user enable via settings
  console.log('[VoiceWake] Initialized (call voice:toggleWake to enable)');
}

// ── Push-to-Talk ─────────────────────────────────────────────

function initPushToTalk(): void {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('[PTT] Disabled (OPENAI_API_KEY not set)');
    return;
  }

  pushToTalk = new PushToTalk(
    {
      hotkey: 'CmdOrCtrl+Shift+M',
      apiKey,
      language: undefined, // Auto-detect
    },
    {
      onStateChange: (state: PttState) => {
        broadcastPttEvent('voice:ptt-state', state);
      },
      onTranscription: (text: string) => {
        broadcastPttEvent('voice:transcription', text);
      },
      onError: (error: string) => {
        broadcastPttEvent('voice:ptt-error', error);
      },
    },
  );

  pushToTalk.start();
  console.log('[PTT] Initialized with CmdOrCtrl+Shift+M');

  // Wire PTT instance into the tool dispatcher for voice.listen
  setPushToTalkGetter(() => pushToTalk);
}

// ── Browser Automation ───────────────────────────────────────

function initBrowserAutomation(): void {
  browserAutomation = new BrowserAutomation();
  console.log('[BrowserAutomation] Initialized');
}

// ── IPC: Voice ───────────────────────────────────────────────

ipcMain.handle('voice:toggleWake', async () => {
  if (!voiceWake) return { enabled: false, error: 'Wake word not configured' };
  const enabled = await voiceWake.toggle();
  return { enabled };
});

ipcMain.handle('voice:wakeState', () => {
  return { state: voiceWake?.getState() || 'stopped' };
});

ipcMain.handle('voice:pttState', () => {
  return { state: pushToTalk?.getState() || 'idle' };
});

ipcMain.handle('voice:pttHotkey', (_event, hotkey: string) => {
  if (!pushToTalk) return { success: false, error: 'PTT not initialized' };
  const ok = pushToTalk.updateHotkey(hotkey);
  return { success: ok };
});

// ── IPC: Browser Automation ──────────────────────────────────

ipcMain.handle('browser:open', async (_event, url?: string) => {
  if (!browserAutomation) initBrowserAutomation();
  return browserAutomation!.open(url);
});

ipcMain.handle('browser:navigate', async (_event, url: string) => {
  if (!browserAutomation) return { success: false, error: 'Browser not initialized' };
  return browserAutomation.navigate(url);
});

ipcMain.handle('browser:snapshot', async () => {
  if (!browserAutomation) return { success: false, error: 'Browser not initialized' };
  return browserAutomation.snapshot();
});

ipcMain.handle('browser:click', async (_event, target: string) => {
  if (!browserAutomation) return { success: false, error: 'Browser not initialized' };
  return browserAutomation.click(target);
});

ipcMain.handle('browser:type', async (_event, text: string, selector?: string) => {
  if (!browserAutomation) return { success: false, error: 'Browser not initialized' };
  return browserAutomation.type(text, selector);
});

ipcMain.handle('browser:screenshot', async (_event, selector?: string) => {
  if (!browserAutomation) return { success: false, error: 'Browser not initialized' };
  return browserAutomation.screenshot(selector);
});

ipcMain.handle('browser:close', async () => {
  if (!browserAutomation) return { success: true, data: 'No browser open' };
  return browserAutomation.close();
});

ipcMain.handle('browser:isOpen', () => {
  return { open: browserAutomation?.isOpen() || false };
});

app.whenReady().then(() => {
  createMenu();
  createWindow();
  createTray();
  setupAutoUpdater();
  loadRoutinesFromDisk();
  startRoutineScheduler();
  setupPowerMonitor();
  if (ENABLE_GATEWAY_CLIENT) {
    initGateway();
  } else {
    console.log('[Gateway] Client disabled (ENABLE_GATEWAY_CLIENT != 1)');
  }
  initIMessageWatcher();
  initVoiceWake();
  initPushToTalk();
  initBrowserAutomation();

  // Global shortcut: Quick Chat popup (Spotlight-style)
  globalShortcut.register('CmdOrCtrl+Shift+Space', () => {
    createQuickChat();
  });

  // Global shortcut: toggle main window
  globalShortcut.register('CmdOrCtrl+Shift+C', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  automation.fsUnwatchAll();
  saveRoutinesToDisk();
  gatewayClient?.disconnect();
  imessageWatcher?.stop();
  voiceWake?.stop();
  pushToTalk?.stop();
  browserAutomation?.close();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
