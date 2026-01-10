# HAPIE Clean Reset Script
# This script performs a complete environment reset for the Qwen system model architecture

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "HAPIE Clean Reset Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Warning "This will DELETE all models, database, and Docker state!"
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Reset cancelled." -ForegroundColor Yellow
    exit
}

# Step 1: Stop services
Write-Host "`n[1/7] Stopping Docker services..." -ForegroundColor Green
docker-compose down
Start-Sleep -Seconds 2

# Step 2: Delete models
Write-Host "[2/7] Deleting models..." -ForegroundColor Green
$modelPaths = @(
    "$env:USERPROFILE\.hapie\models",
    ".\.hapie\models"
)
foreach ($path in $modelPaths) {
    if (Test-Path $path) {
        Write-Host "  Removing $path"
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
    }
}

# Step 3: Delete database
Write-Host "[3/7] Deleting database..." -ForegroundColor Green
$dbPaths = @(
    "$env:USERPROFILE\.hapie\hapie.db",
    ".\.hapie\hapie.db"
)
foreach ($path in $dbPaths) {
    if (Test-Path $path) {
        Write-Host "  Removing $path"
        Remove-Item -Force $path -ErrorAction SilentlyContinue
    }
}

# Step 4: Delete response logs (optional)
Write-Host "[4/7] Clearing response logs..." -ForegroundColor Green
$logPaths = @(
    "$env:USERPROFILE\.hapie\logs\response_log.txt",
    ".\.hapie\logs\response_log.txt"
)
foreach ($path in $logPaths) {
    if (Test-Path $path) {
        Write-Host "  Clearing $path"
        Remove-Item -Force $path -ErrorAction SilentlyContinue
    }
}

# Step 5: Clean Docker state
Write-Host "[5/7] Cleaning Docker volumes and images..." -ForegroundColor Green
docker-compose down --volumes --rmi all
docker volume prune -f

# Step 6: Rebuild and start
Write-Host "[6/7] Rebuilding and starting services..." -ForegroundColor Green
docker-compose build
docker-compose up -d

Write-Host "  Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Step 7: Run setup
Write-Host "[7/7] Running setup (downloading Qwen system model)..." -ForegroundColor Green
docker-compose exec backend python setup.py

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✓ Clean Reset Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Verification:" -ForegroundColor Yellow
Write-Host "  1. Check models API:" -ForegroundColor White
Write-Host "     curl http://localhost:8000/api/models`n" -ForegroundColor Gray

Write-Host "  2. Test chat (should show onboarding):" -ForegroundColor White
Write-Host "     curl -X POST http://localhost:8000/api/chat/single ``" -ForegroundColor Gray
Write-Host "       -H 'Content-Type: application/json' ``" -ForegroundColor Gray
Write-Host "       -d '{\"prompt\": \"Hello!\"}'`n" -ForegroundColor Gray

Write-Host "  3. Monitor response log:" -ForegroundColor White
Write-Host "     Get-Content -Path $env:USERPROFILE\.hapie\logs\response_log.txt -Wait`n" -ForegroundColor Gray

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  - Test intent classification" -ForegroundColor White
Write-Host "  - Pull a user model: 'pull phi3'" -ForegroundColor White
Write-Host "  - Verify chat routing works" -ForegroundColor White
Write-Host ""
