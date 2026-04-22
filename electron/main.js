/**
 * HAPIE Desktop App - Electron Main Process
 *
 * Responsibilities:
 *  1. Launch the backend (hapie-backend.exe) as a child process
 *  2. Wait for the backend to be ready (poll /health)
 *  3. Serve the Next.js static export via a custom "app://" protocol
 *  4. Kill the backend child process on app quit
 */

const { app, BrowserWindow, dialog, protocol, net, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const { pathToFileURL } = require('url');
const log = require('electron-log');

// ─── Configuration ────────────────────────────────────────────────────────────
const IS_PACKAGED = app.isPackaged;
const BACKEND_PORT = 8000;
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/health`;
const POLL_INTERVAL_MS = 500;
const MAX_WAIT_MS = 60000; // Increased to 60s for slow startups

// ─── Paths ────────────────────────────────────────────────────────────────────
const BACKEND_DIR = IS_PACKAGED
  ? path.join(process.resourcesPath, 'backend')
  : path.join(__dirname, '..', 'backend', 'dist', 'hapie-backend');

const BACKEND_EXE = path.join(BACKEND_DIR, 'hapie-backend.exe');

const FRONTEND_DIR = IS_PACKAGED
  ? path.join(process.resourcesPath, 'frontend')
  : path.join(__dirname, '..', 'frontend', 'out');

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow = null;
let backendProcess = null;
let splashWindow = null;

// ─── Logging ──────────────────────────────────────────────────────────────────
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info(`[App] Startup. IS_PACKAGED=${IS_PACKAGED}`);
log.info(`[App] FRONTEND_DIR=${FRONTEND_DIR}`);
log.info(`[App] BACKEND_EXE=${BACKEND_EXE}`);

// ─── Custom Protocol Handler ──────────────────────────────────────────────────
// This handles serving Next.js static files from the 'out' folder.
function registerAppProtocol() {
  protocol.handle('app', async (request) => {
    try {
      const url = new URL(request.url);
      let urlPath = decodeURIComponent(url.pathname);
      
      // Default to index.html for root
      if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
      }

      let filePath = path.join(FRONTEND_DIR, urlPath);

      // Next.js Clean URLs support: if file not found, try appending .html
      if (!fs.existsSync(filePath) && !path.extname(filePath)) {
        const htmlPath = filePath + '.html';
        if (fs.existsSync(htmlPath)) {
          filePath = htmlPath;
        }
      }

      // Fallback to index.html for SPA-style routing if the file doesn't exist at all
      if (!fs.existsSync(filePath)) {
        log.warn(`[Protocol] File not found: ${filePath}. Falling back to index.html`);
        filePath = path.join(FRONTEND_DIR, 'index.html');
      }

      log.debug(`[Protocol] Serving: ${filePath}`);
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (error) {
      log.error(`[Protocol] Error serving ${request.url}: ${error.message}`);
      return new Response('Error', { status: 500 });
    }
  });
}

// ─── Backend Launcher ─────────────────────────────────────────────────────────
function launchBackend() {
  if (!fs.existsSync(BACKEND_EXE)) {
    log.warn(`[Backend] Executable not found at: ${BACKEND_EXE}`);
    log.warn('[Backend] Assuming backend is already running (dev mode).');
    return null;
  }

  log.info(`[Backend] Launching process...`);

  // Data directory in %APPDATA%/HAPIE/data
  const dataDir = path.join(app.getPath('userData'), 'hapie_data');
  
  const proc = spawn(BACKEND_EXE, [], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      HAPIE_PORT: String(BACKEND_PORT),
      HAPIE_DATA_DIR: dataDir,
    },
    // Important: windowsHide=true prevents a black console window from flashing
    windowsHide: true,
  });

  proc.stdout.on('data', (data) => log.info(`[Backend] ${data.toString().trim()}`));
  proc.stderr.on('data', (data) => log.warn(`[Backend] ${data.toString().trim()}`));

  proc.on('exit', (code, signal) => {
    log.warn(`[Backend] Process exited (code: ${code}, signal: ${signal})`);
    backendProcess = null;
  });

  proc.on('error', (err) => {
    log.error(`[Backend] Failed to start: ${err.message}`);
    dialog.showErrorBox('HAPIE Backend Error', `Failed to start the backend engine:\n${err.message}`);
  });

  return proc;
}

// ─── Health Polling ───────────────────────────────────────────────────────────
function waitForBackend() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const poll = () => {
      const req = http.get(HEALTH_URL, (res) => {
        if (res.statusCode === 200) {
          log.info('[Backend] Health check successful.');
          resolve();
        } else {
          retry();
        }
      });

      req.on('error', retry);
      req.setTimeout(500, () => { req.destroy(); retry(); });
    };

    const retry = () => {
      if (Date.now() - startTime > MAX_WAIT_MS) {
        reject(new Error(`Backend did not become healthy within ${MAX_WAIT_MS / 1000}s`));
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
  });
}

// ─── Splash Window ────────────────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  log.info('[App] Splash window displayed.');
}

// ─── Main Window ──────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'HAPIE',
    backgroundColor: '#0d1117',
    // Remove the menu bar
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the app via our custom protocol
  mainWindow.loadURL('app://./index.html');
  log.info('[App] Loading main frontend URL.');

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.maximize();
    mainWindow.show();
    log.info('[App] Main window shown.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

// Register protocol privileges before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
      allowServiceWorkers: true,
    },
  },
]);

app.on('ready', async () => {
  log.info('[App] Electron ready.');
  
  // 1. Remove the global menu bar
  Menu.setApplicationMenu(null);
  
  // 2. Register our protocol
  registerAppProtocol();

  // 3. Show splash & launch backend
  createSplashWindow();
  backendProcess = launchBackend();

  // 4. Wait for backend or fail
  try {
    log.info('[App] Polling backend health...');
    await waitForBackend();
    log.info('[App] Backend ready, creating main window.');
  } catch (err) {
    log.error(`[App] Startup failure: ${err.message}`);
    dialog.showErrorBox(
      'HAPIE Startup Error',
      `The backend engine failed to start or is taking too long.\n\nError: ${err.message}`
    );
    app.quit();
    return;
  }

  // 5. Finally, show the app
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('[App] Quitting. Cleaning up backend process...');
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
