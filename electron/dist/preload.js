"use strict";
/**
 * Nova AI — Electron Preload Script
 * Exposes a safe, limited API to the renderer process via contextBridge.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('novaDesktop', {
    // Platform info
    platform: process.platform,
    isDesktopApp: true,
    // Window controls
    minimize: () => electron_1.ipcRenderer.send('window:minimize'),
    maximize: () => electron_1.ipcRenderer.send('window:maximize'),
    close: () => electron_1.ipcRenderer.send('window:close'),
    // App info
    getVersion: () => electron_1.ipcRenderer.invoke('app:version'),
    // Notifications (native OS notifications)
    showNotification: (title, body) => {
        electron_1.ipcRenderer.send('notification:show', { title, body });
    },
});
//# sourceMappingURL=preload.js.map