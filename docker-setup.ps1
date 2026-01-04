# HAPIE Docker Setup Script (Windows)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "HAPIE - Docker Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Build and start services
Write-Host ""
Write-Host "Building Docker images..." -ForegroundColor Yellow
docker-compose build

Write-Host ""
Write-Host "Starting HAPIE services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if backend is healthy
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
    Write-Host "✓ Backend is running at http://localhost:8000" -ForegroundColor Green
} catch {
    Write-Host "⚠ Backend may still be starting. Check logs with: docker-compose logs backend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "HAPIE is running!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:        docker-compose logs -f backend"
Write-Host "  Stop services:    docker-compose down"
Write-Host "  Restart:          docker-compose restart"
Write-Host "  Shell access:     docker-compose exec backend bash"
Write-Host ""
Write-Host "To setup base model, run:" -ForegroundColor Yellow
Write-Host "  docker-compose exec backend python setup.py"
Write-Host ""
