"""
HAPIE Desktop App - Backend Entry Point
This script is the entry point for PyInstaller packaging.
It starts the FastAPI/uvicorn server on localhost:8000.
"""

import sys
import os
import multiprocessing

# Required for PyInstaller on Windows to prevent recursive process spawning
multiprocessing.freeze_support()

# When packaged by PyInstaller, sys._MEIPASS is the temp folder for bundled files.
if getattr(sys, "frozen", False):
    # Running as a PyInstaller bundle — add bundle dir to path
    bundle_dir = sys._MEIPASS
    sys.path.insert(0, bundle_dir)

    # Use AppData\Roaming\HAPIE\data for persistent storage
    # Electron passes HAPIE_DATA_DIR via env, so only set default as fallback
    appdata = os.environ.get("APPDATA", os.path.expanduser("~"))
    default_data_dir = os.path.join(appdata, "HAPIE", "data")
    os.environ.setdefault("HAPIE_DATA_DIR", default_data_dir)
else:
    # Running as a regular script during development
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, backend_dir)

# Ensure data directory exists
data_dir = os.environ.get("HAPIE_DATA_DIR", "")
if data_dir:
    os.makedirs(data_dir, exist_ok=True)

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("HAPIE_PORT", "8000"))
    print(f"[HAPIE Backend] Starting on http://127.0.0.1:{port}", flush=True)
    print(f"[HAPIE Backend] Data dir: {os.environ.get('HAPIE_DATA_DIR', 'default')}", flush=True)
    uvicorn.run(
        "hapie.main:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        reload=False,
    )
