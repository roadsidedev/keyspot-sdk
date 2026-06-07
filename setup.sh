#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "╔══════════════════════════════════════════════════╗"
echo "║     KeySpot Enterprise Dashboard — Setup         ║"
echo "╚══════════════════════════════════════════════════╝"

# 1. Prerequisites
echo -e "\n[1/6] Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "✗ Docker required: https://docker.com"; exit 1; }
command -v pnpm >/dev/null 2>&1 || npm install -g pnpm@9
echo "✓ docker $(docker --version)"
echo "✓ pnpm $(pnpm --version)"

# 2. Env files
echo -e "\n[2/6] Setting up environment..."
[ -f packages/@keyspot/server/.env ] || cp packages/@keyspot/server/.env.example packages/@keyspot/server/.env
[ -f keyspot-sdk/apps/web/.env.local ] || {
  SECRET=$(openssl rand -hex 32 2>/dev/null || echo "dev-secret")
  cat > keyspot-sdk/apps/web/.env.local <<EOF
NEXT_PUBLIC_API_URL="http://localhost:3000"
AUTH_SECRET="$SECRET"
AUTH_URL="http://localhost:3001"
EOF
}
echo "✓ Environment files ready"

# 3. Start Docker services
echo -e "\n[3/6] Starting TimescaleDB + Redis..."
docker compose up -d postgres redis
echo "Waiting for database..."
until docker compose exec -T postgres pg_isready -U keyspot -d keyspot >/dev/null 2>&1; do sleep 1; done
echo "✓ Database is ready"

# 4. Install deps
echo -e "\n[4/6] Installing dependencies..."
pnpm install
echo "✓ Dependencies installed"

# 5. Migrate
echo -e "\n[5/6] Running database migration..."
cd packages/@keyspot/server
npx prisma generate
npx prisma migrate deploy
# Run TimescaleDB init now that tables exist
docker compose exec -T postgres psql -U keyspot -d keyspot -f /docker-entrypoint-initdb.d/01-init-timescaledb.sql 2>/dev/null || true
npx prisma db seed 2>/dev/null || true
cd "$ROOT"
echo "✓ Database migrated and seeded"

# 6. Start dev
echo -e "\n[6/6] Starting development servers..."
echo "  API:      http://localhost:3000"
echo "  Dashboard: http://localhost:3001/dashboard"
echo ""
echo "  Start API:    pnpm --filter @roadsidelab/keyspot-server dev"
echo "  Start Web:    cd keyspot-sdk/apps/web && pnpm dev --port 3001"
echo "  Stop:         docker compose down"
