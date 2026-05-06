# Paperclip one-click deploy script for Windows
# Usage: .\deploy.ps1 [-Public] [-Port 3100] [-Url "https://example.com"]
param(
    [switch]$Public,
    [int]$Port = 3100,
    [string]$Url = ""
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  Paperclip - One-Click Docker Deploy" -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Cyan
Write-Host ""

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Start-Process "https://www.docker.com/products/docker-desktop"
    exit 1
}

# Check docker compose
try { docker compose version | Out-Null }
catch {
    Write-Host "Docker Compose plugin not found. Please update Docker Desktop." -ForegroundColor Yellow
    exit 1
}

# Create .env if not exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env"

    # Generate BETTER_AUTH_SECRET
    $bytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    $secret = [System.BitConverter]::ToString($bytes).Replace("-", "").ToLower()
    (Get-Content ".env") -replace "^BETTER_AUTH_SECRET=.*", "BETTER_AUTH_SECRET=$secret" | Set-Content ".env"
    Write-Host "OK Generated BETTER_AUTH_SECRET" -ForegroundColor Green

    # Set Port
    (Get-Content ".env") -replace "^PORT=.*", "PORT=$Port" | Set-Content ".env"
}
else {
    Write-Host "OK Found existing .env, keeping it" -ForegroundColor Green
}

# Set PUBLIC_URL
if ($Url -ne "") {
    (Get-Content ".env") -replace "^PAPERCLIP_PUBLIC_URL=.*", "PAPERCLIP_PUBLIC_URL=$Url" | Set-Content ".env"
}
else {
    $currentUrl = (Get-Content ".env" | Where-Object { $_ -match "^PAPERCLIP_PUBLIC_URL=http" })
    if (-not $currentUrl) {
        (Get-Content ".env") -replace "^PAPERCLIP_PUBLIC_URL=.*", "PAPERCLIP_PUBLIC_URL=http://localhost:$Port" | Set-Content ".env"
        Write-Host "URL set to: http://localhost:$Port" -ForegroundColor Cyan
    }
}

# Set exposure
$exposure = if ($Public) { "public" } else { "private" }
(Get-Content ".env") -replace "^PAPERCLIP_DEPLOYMENT_EXPOSURE=.*", "PAPERCLIP_DEPLOYMENT_EXPOSURE=$exposure" | Set-Content ".env"

Write-Host ""
Write-Host "Building and starting Paperclip..." -ForegroundColor Cyan
Write-Host "(This may take 5-10 minutes on first run)" -ForegroundColor Gray
Write-Host ""

docker compose up -d --build

Write-Host ""
Write-Host "OK Paperclip is running!" -ForegroundColor Green
Write-Host ""
$finalUrl = (Get-Content ".env" | Where-Object { $_ -match "^PAPERCLIP_PUBLIC_URL=" }) -replace "^PAPERCLIP_PUBLIC_URL=", ""
Write-Host "  Open: $finalUrl" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Gray
Write-Host "  docker compose logs -f paperclip   # view logs"
Write-Host "  docker compose ps                  # check status"
Write-Host "  docker compose down                # stop"
Write-Host "  docker compose up -d --build       # update & restart"
