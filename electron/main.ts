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
} from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import os from 'os';

// The production URL to load (set via env or default)
const APP_URL = process.env.NOVA_APP_URL || 'https://www.heynova.se';
const IS_DEV = process.env.NODE_ENV === 'development';
const DEV_URL = 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function getIconPath(): string {
  // In packaged app, resources are in the app.asar parent directory
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icons', 'icon-512.png');
  }
  return path.join(__dirname, '..', 'public', 'icons', 'icon-512.png');
}

function createWindow(): void {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 480,
    minHeight: 600,
    title: 'Nova AI',
    icon: iconPath,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0a',
    show: false, // show when ready to avoid white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  // Load the app URL
  const url = IS_DEV ? DEV_URL : APP_URL;
  mainWindow.loadURL(url);

  // Show window when content is ready (avoid white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow navigation within the app
    const appOrigin = new URL(IS_DEV ? DEV_URL : APP_URL).origin;
    if (url.startsWith(appOrigin)) {
      return { action: 'allow' };
    }
    // Open everything else externally
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appOrigin = new URL(IS_DEV ? DEV_URL : APP_URL).origin;
    if (!url.startsWith(appOrigin)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // DevTools in development
  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
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

app.whenReady().then(() => {
  createMenu();
  createWindow();
  createTray();
  setupAutoUpdater();

  // Register global shortcut to toggle window
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
