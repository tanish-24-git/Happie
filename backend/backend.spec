# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for HAPIE backend
# Run: pyinstaller backend.spec

import os
from PyInstaller.utils.hooks import collect_all, collect_submodules

# Collect all data and binaries from key packages
datas = []
binaries = []
hiddenimports = []

# Critical packages to collect fully
packages_to_collect = [
    "fastapi", "uvicorn", "starlette", "pydantic", "pydantic_settings",
    "sqlalchemy", "aiosqlite", "psutil", "cpuinfo", "aiofiles",
    "httpx", "cryptography", "anyio", "click", "h11", "httptools",
    "websockets", "watchfiles", "python_multipart",
    "llama_cpp"  # EXPLICITLY INCLUDE LLAMA-CPP
]

for pkg in packages_to_collect:
    try:
        d, b, h = collect_all(pkg)
        datas += d
        binaries += b
        hiddenimports += h
    except Exception:
        hiddenimports += collect_submodules(pkg)

# Include the hapie package itself
hapie_src = os.path.join(os.path.dirname(os.path.abspath(SPEC)), "hapie")
datas += [(hapie_src, "hapie")]

block_cipher = None

a = Analysis(
    ["run_server.py"],
    pathex=[os.path.dirname(os.path.abspath(SPEC))],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports + [
        "hapie.main",
        "hapie.api.system",
        "hapie.api.chat",
        "hapie.api.models",
        "hapie.api.settings",
        "hapie.api.recommend",
        "hapie.db",
        "hapie.hardware",
        "hapie.policy",
        "hapie.models",
        "hapie.cloud",
        "hapie.utils",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "email.mime.text",
        "email.mime.multipart",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "torch", "torchvision", "torchaudio", "tensorflow", "tensorboard",
        "matplotlib", "notebook", "IPython", "PIL",
        "PyQt5", "PyQt6", "PySide2", "PySide6", "tkinter",
        "langchain", "crewai", "django", "jax", "jaxlib", "altair",
        "nbconvert", "nbformat", "plotly", "selenium", "playwright",
        "boto3", "botocore", "google", "grpc", "mlflow", "pandas",
        "scipy", "scikit-learn", "sklearn", "cv2", "pygame", "pdfminer",
        "pypdfium2", "onnxruntime", "spacy", "thinc", "h5py", "opentelemetry",
        "transformers", "datasets", "bitsandbytes", "fsspec", "sentencepiece",
        "tokenizers"
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="hapie-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # SILENT BACKGROUND PROCESS
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="hapie-backend",
)
