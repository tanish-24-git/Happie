<#
.SYNOPSIS
    HAPIE Windows Desktop Build Script
    Builds the backend (PyInstaller), frontend (Next.js static export),
    and Electron installer (.exe) in one go.

.DESCRIPTION
    Run this from the repo root:
        .\build-desktop.ps1

    Prerequisites:
      - Python 3.10+ with pip
      - Node.js 18+ with pnpm (cd frontend && pnpm install)
      - pyinstaller installed: pip install pyinstaller
#>

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  HAPIE Windows Desktop Builder" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ── Phase 1: Build Python Backend ──────────────────────────────────────────────
Write-Host "[Phase 1/4] Building Python backend with PyInstaller..." -ForegroundColor Yellow

$backendDir = Join-Path $ROOT "backend"
Push-Location $backendDir

# Ensure pyinstaller is available
if (-not (Get-Command pyinstaller -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing PyInstaller..." -ForegroundColor Gray
    pip install pyinstaller --quiet
}

# Clean previous build
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }

Write-Host "  Running PyInstaller..." -ForegroundColor Gray
pyinstaller backend.spec --noconfirm

$backendExe = Join-Path $backendDir "dist\hapie-backend\hapie-backend.exe"
if (-not (Test-Path $backendExe)) {
    Write-Host "[ERROR] Backend exe not found at: $backendExe" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Backend built: $backendExe" -ForegroundColor Green
Pop-Location

# ── Phase 2: Build Next.js Frontend (Static Export) ────────────────────────────
Write-Host ""
Write-Host "[Phase 2/4] Building Next.js frontend (static export)..." -ForegroundColor Yellow

$frontendDir = Join-Path $ROOT "frontend"
Push-Location $frontendDir

# Clean previous out directory
if (Test-Path "out") { Remove-Item -Recurse -Force "out" }

Write-Host "  Running pnpm build..." -ForegroundColor Gray
pnpm build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Next.js build failed!" -ForegroundColor Red
    exit 1
}

$outDir = Join-Path $frontendDir "out"
if (-not (Test-Path $outDir)) {
    Write-Host "[ERROR] Frontend out/ directory not found!" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Frontend built: $outDir" -ForegroundColor Green
Pop-Location

# ── Phase 3: Install Electron Dependencies ─────────────────────────────────────
Write-Host ""
Write-Host "[Phase 3/4] Installing Electron dependencies..." -ForegroundColor Yellow

$electronDir = Join-Path $ROOT "electron"
Push-Location $electronDir

npm install --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed in electron/" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Electron dependencies installed." -ForegroundColor Green
Pop-Location

# ── Phase 4: Package with Electron Builder ─────────────────────────────────────
Write-Host ""
Write-Host "[Phase 4/4] Packaging with Electron Builder..." -ForegroundColor Yellow

Push-Location $electronDir

npm run dist

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Electron Builder packaging failed!" -ForegroundColor Red
    exit 1
}

Pop-Location

# ── Done ───────────────────────────────────────────────────────────────────────
$distDir = Join-Path $ROOT "dist"
$installerExe = Join-Path $distDir "HAPIE Setup 1.0.0.exe"

# Copy to happie web public directory if it exists
$webDir = "E:\happie web\public"
if (Test-Path $webDir) {
    Write-Host "  Copying installer to happie web..." -ForegroundColor Gray
    Copy-Item $installerExe $webDir -Force
    Write-Host "  [OK] Installer copied to $webDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Installer located in: $distDir" -ForegroundColor White
Write-Host "  Look for:  HAPIE Setup 1.0.0.exe" -ForegroundColor White
Write-Host ""
