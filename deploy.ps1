# deploy.ps1 - Unified Single-Port Deployment
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  RepoIntel - Single Unified Deployment          " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Check if frontend dist exists, build if not
$distPath = Join-Path $PSScriptRoot "frontend\dist"
if (-not (Test-Path $distPath)) {
    Write-Host "[1/2] Building frontend bundle..." -ForegroundColor Yellow
    Set-Location (Join-Path $PSScriptRoot "frontend")
    npm run build
    Set-Location $PSScriptRoot
} else {
    Write-Host "[1/2] Frontend bundle verified." -ForegroundColor Green
}

# 2. Launch Unified Server
Write-Host "[2/2] Starting Unified Application Server..." -ForegroundColor Yellow
Write-Host "`n Application is live on ONE link:" -ForegroundColor Green
Write-Host " 👉 http://localhost:8000" -ForegroundColor Cyan
Write-Host "-------------------------------------------------"

& (Join-Path $PSScriptRoot ".\.venv\Scripts\python.exe") -m uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
