/**
 * Nova AI — Electron Preload Script
 * Exposes a safe, limited API to the renderer process via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('novaDesktop', {
  // Platform info
  platform: process.platform,
  isDesktopApp: true,

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
  ],
});
