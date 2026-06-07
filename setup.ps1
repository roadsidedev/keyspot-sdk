# KeySpot Enterprise Dashboard — Full Setup Script
# This script provisions TimescaleDB, runs migrations, seeds the database,
# and starts the dev servers.
#
# Prerequisites: Docker Desktop, Node.js >= 18, pnpm >= 9
# Run from the repository root: .\setup.ps1

$ErrorActionPreference = "Stop"
$ROOT = Get-Location

Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     KeySpot Enterprise Dashboard — Setup         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Step 1: Check prerequisites
Write-Host "`n[1/6] Checking prerequisites..." -ForegroundColor Yellow

$dockerOk = $false
try { docker --version | Out-Null; $dockerOk = $true } catch {}
if (-not $dockerOk) {
    Write-Host "  ✗ Docker not found. Install Docker Desktop:" -ForegroundColor Red
    Write-Host "    https://www.docker.com/products/docker-desktop/"
    exit 1
}
Write-Host "  ✓ Docker $(docker --version)" -ForegroundColor Green

$pnpmOk = $false
try { pnpm --version | Out-Null; $pnpmOk = $true } catch {}
if (-not $pnpmOk) {
    Write-Host "  ✗ pnpm not found. Installing via npm..."
    npm install -g pnpm@9
}
Write-Host "  ✓ pnpm $(pnpm --version)" -ForegroundColor Green

# Step 2: Create .env if missing
Write-Host "`n[2/6] Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path "packages/@keyspot/server/.env")) {
    Copy-Item "packages/@keyspot/server/.env.example" "packages/@keyspot/server/.env"
    Write-Host "  ✓ Created packages/@keyspot/server/.env from template" -ForegroundColor Green
    Write-Host "  ⚠  EDIT packages/@keyspot/server/.env with your Stripe keys!" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ .env already exists" -ForegroundColor Green
}

if (-not (Test-Path "keyspot-sdk/apps/web/.env.local")) {
    $authSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    @"
NEXT_PUBLIC_API_URL="http://localhost:3000"
AUTH_SECRET="$authSecret"
AUTH_URL="http://localhost:3001"
"@ | Out-File -FilePath "keyspot-sdk/apps/web/.env.local" -Encoding utf8
    Write-Host "  ✓ Created keyspot-sdk/apps/web/.env.local" -ForegroundColor Green
} else {
    Write-Host "  ✓ .env.local already exists" -ForegroundColor Green
}

# Step 3: Start Docker services
Write-Host "`n[3/6] Starting TimescaleDB + Redis via Docker..." -ForegroundColor Yellow
docker compose up -d postgres redis
Write-Host "  Waiting for database to be healthy..." -ForegroundColor Gray
docker compose exec postgres bash -c "until pg_isready -U keyspot; do sleep 1; done" 2>$null
Start-Sleep -Seconds 3
Write-Host "  ✓ Database is ready" -ForegroundColor Green

# Step 4: Install dependencies
Write-Host "`n[4/6] Installing Node.js dependencies..." -ForegroundColor Yellow
pnpm install
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green

# Step 5: Run Prisma migration + seed
Write-Host "`n[5/6] Running database migration..." -ForegroundColor Yellow
Push-Location "packages/@keyspot/server"
try {
    # Generate Prisma client first (needed for seed)
    npx prisma generate
    Write-Host "  ✓ Prisma client generated" -ForegroundColor Green

    # Run migration
    npx prisma migrate deploy
    Write-Host "  ✓ Schema migrated" -ForegroundColor Green

    # Run the TimescaleDB init script now that tables exist
    Write-Host "  Enabling TimescaleDB hypertable..." -ForegroundColor Gray
    docker compose exec -T postgres psql -U keyspot -d keyspot -f /docker-entrypoint-initdb.d/01-init-timescaledb.sql 2>$null
    Write-Host "  ✓ TimescaleDB hypertable configured" -ForegroundColor Green

    # Seed (optional)
    npx prisma db seed
    Write-Host "  ✓ Database seeded" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Migration failed: $_" -ForegroundColor Red
    Write-Host "  Make sure the database is running and accessible." -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}

# Step 6: Build and start dev servers
Write-Host "`n[6/6] Starting development servers..." -ForegroundColor Yellow
Write-Host "  Starting API server (port 3000)..." -ForegroundColor Gray

# Start server in background
$serverJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    pnpm --filter @roadsidelab/keyspot-server dev
} -ArgumentList $ROOT

Start-Sleep -Seconds 2

Write-Host "  Starting web app (port 3001)..." -ForegroundColor Gray
$webJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location "$root/keyspot-sdk/apps/web"
    pnpm dev --port 3001
} -ArgumentList $ROOT

Start-Sleep -Seconds 3

Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                 Setup Complete!                  ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  API Server:   http://localhost:3000             ║" -ForegroundColor Green
Write-Host "║  Dashboard:    http://localhost:3001/dashboard   ║" -ForegroundColor Green
Write-Host "║  Health Check: http://localhost:3000/health      ║" -ForegroundColor Green
Write-Host "║                                                  ║" -ForegroundColor Cyan
Write-Host "║  Stripe Portal: docker compose run --rm stripe   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n  To stop: docker compose down" -ForegroundColor Gray
Write-Host "  To view logs: docker compose logs -f" -ForegroundColor Gray

# Keep the jobs running
Write-Host "`n  Press Ctrl+C to stop all servers.`n" -ForegroundColor Gray

try {
    while ($true) {
        Start-Sleep -Seconds 10
        # Check jobs are still running
        $serverState = Receive-Job -Job $serverJob -Keep 2>$null
        $webState = Receive-Job -Job $webJob -Keep 2>$null
    }
}
finally {
    Stop-Job $serverJob
    Stop-Job $webJob
    Remove-Job $serverJob
    Remove-Job $webJob
}
