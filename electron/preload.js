/**
 * HAPIE Electron Preload Script
 * Runs in renderer process with access to Node APIs.
 * Exposes only a safe, minimal API to the frontend via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hapieDesktop', {
  // Expose the backend port so the frontend can build the correct API URL
  backendPort: 8000,
  isDesktop: true,
  platform: process.platform,
  appVersion: process.env.npm_package_version || '1.0.0',
});
