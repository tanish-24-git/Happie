# Implementation Plan: Happie Native Windows Desktop App

This plan outlines the steps to convert the existing Happie Next.js + FastAPI project into a standalone Windows desktop application (`.exe`) and distribute it via the main website.

## Overview
We will use **Electron** to wrap the Next.js frontend and **PyInstaller** to compile the FastAPI python backend. Electron will manage the lifecycle of the application, spawning the Python backend when opened and displaying the Next.js frontend.

## Phase 1: Backend Packaging (Python / FastAPI)
1. **Install PyInstaller**: Add `pyinstaller` to the backend dependencies.
2. **Configure PyInstaller**: Create a `.spec` file to package the FastAPI application into a single executable (`backend.exe`). We need to ensure that any dynamic paths, templates, or model files are correctly handled since PyInstaller creates a temporary directory at runtime.
3. **Handle Ports**: Ensure the backend can start on a specific port (e.g., 8000) or dynamically assign an open port to avoid conflicts with other local services.
4. **Compile**: Run PyInstaller to generate `backend.exe`.

## Phase 2: Frontend Adaptation (Next.js)
1. **Static HTML Export**: Since an Electron app loads local files (or runs a local server), we will change the Next.js build output from `standalone` to `export` in `next.config.mjs`. This generates static HTML/CSS/JS files.
   *Note: Next.js features that require a Node.js server (like Image Optimization without a custom loader, or Server Actions) might need adjustments for static export.*
2. **API Base URL**: Update the frontend to make API calls to the local URL (e.g., `http://127.0.0.1:8000`) where the backend executable will be running, instead of relying on Docker networking.

## Phase 3: Desktop Container (Electron)
1. **Initialize Electron**: Set up a new Electron project (or integrate it into the `frontend` folder).
2. **Main Process Logic**: Write the Electron `main.js` script to:
   - Find and execute `backend.exe` as a child process when the app launches.
   - Wait for the backend to become responsive.
   - Open a `BrowserWindow` and load the static Next.js `index.html`.
3. **Graceful Shutdown**: Implement cleanup logic in Electron to ensure the `backend.exe` child process is terminated when the user closes the application window.

## Phase 4: Packaging and Building (Electron Builder)
1. **Configure Electron Builder**: Use `electron-builder` to package everything. The configuration will need to include the Next.js `out` directory and the `backend.exe` executable inside the app bundle.
2. **Generate `.exe`**: Run the build process targeting Windows (`win`). This will produce a setup installer (e.g., `Happie Setup 1.0.0.exe`).

## Phase 5: Distribution via Main Website
1. **Copy Executable**: Move the generated `.exe` installer into the `public` directory of the `e:\happie web` project.
2. **Update UI**: Add a "Download for Windows" button to the landing page in `e:\happie web` that links to the `.exe` file.
3. **Deploy**: Push/Deploy the updated `e:\happie web` project so users can download the native app from the main website.

---

### Do you approve this implementation plan? 
If you agree with this approach, we can begin with **Phase 1: Backend Packaging** by setting up PyInstaller for the FastAPI app.
