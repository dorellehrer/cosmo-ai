"use strict";
/**
 * Nova AI — Electron Main Process
 * Wraps the Next.js web app in a native desktop window for macOS and Windows.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// The production URL to load (set via env or default)
const APP_URL = process.env.NOVA_APP_URL || 'https://www.heynova.se';
const IS_DEV = process.env.NODE_ENV === 'development';
const DEV_URL = 'http://localhost:3000';
let mainWindow = null;
let tray = null;
function getIconPath() {
    // In packaged app, resources are in the app.asar parent directory
    if (electron_1.app.isPackaged) {
        return path_1.default.join(process.resourcesPath, 'icons', 'icon-512.png');
    }
    return path_1.default.join(__dirname, '..', 'public', 'icons', 'icon-512.png');
}
function createWindow() {
    const iconPath = getIconPath();
    mainWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, 'preload.js'),
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
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    // Handle navigation to external URLs
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const appOrigin = new URL(IS_DEV ? DEV_URL : APP_URL).origin;
        if (!url.startsWith(appOrigin)) {
            event.preventDefault();
            electron_1.shell.openExternal(url);
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
function createTray() {
    const iconPath = getIconPath();
    const icon = electron_1.nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
    tray = new electron_1.Tray(icon);
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Open Nova',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
                else {
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
            click: () => electron_1.app.quit(),
        },
    ]);
    tray.setToolTip('Nova AI');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.focus();
            }
            else {
                mainWindow.show();
            }
        }
        else {
            createWindow();
        }
    });
}
function createMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        ...(isMac
            ? [
                {
                    label: electron_1.app.name,
                    submenu: [
                        { role: 'about' },
                        { type: 'separator' },
                        { role: 'services' },
                        { type: 'separator' },
                        { role: 'hide' },
                        { role: 'hideOthers' },
                        { role: 'unhide' },
                        { type: 'separator' },
                        { role: 'quit' },
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
                ...(IS_DEV ? [{ role: 'toggleDevTools' }] : []),
            ],
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac
                    ? [{ type: 'separator' }, { role: 'front' }]
                    : [{ role: 'close' }]),
            ],
        },
    ];
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
}
// ── App lifecycle ────────────────────────────
electron_1.app.whenReady().then(() => {
    createMenu();
    createWindow();
    createTray();
    // Register global shortcut to toggle window
    electron_1.globalShortcut.register('CmdOrCtrl+Shift+C', () => {
        if (mainWindow) {
            if (mainWindow.isVisible() && mainWindow.isFocused()) {
                mainWindow.hide();
            }
            else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
        else {
            createWindow();
        }
    });
    electron_1.app.on('activate', () => {
        // macOS: re-create window when dock icon is clicked
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed (except on macOS)
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
});
// Prevent multiple instances
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
//# sourceMappingURL=main.js.map