#!/bin/bash
# =============================================================
# Discord-AIBot: Unified Audit & Test Script
# Runs in tested/audited mode before production deployment.
# Usage: bash scripts/audit-and-test.sh
# =============================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }

echo "=== Discord-AIBot Unified Audit & Test ==="
echo ""

# 1. Install workspace deps
echo "--- [1/8] pnpm install --frozen-lockfile ---"
pnpm install --frozen-lockfile && ok "pnpm install" || { fail "pnpm install failed"; exit 1; }

# 2. Build all TS packages
echo "--- [2/8] pnpm -r run build ---"
pnpm -r run build && ok "build" || { fail "build failed"; exit 1; }

# 3. Run tests
echo "--- [3/8] pnpm -r run test ---"
pnpm -r run test --if-present && ok "tests" || { fail "tests failed"; exit 1; }

# 4. Build Docker images
echo "--- [4/8] docker compose build --no-cache ---"
docker compose build --no-cache && ok "docker build" || { fail "docker build failed"; exit 1; }

# 5. Start services
echo "--- [5/8] docker compose up -d ---"
docker compose up -d && ok "services started"
echo "Waiting 20s for services to initialise..."
sleep 20

# 6. Service health
echo "--- [6/8] Service health checks ---"
docker compose ps

if docker compose exec -T redis redis-cli ping | grep -q PONG; then
  ok "Redis ping"
else
  warn "Redis not responding"
fi

curl -sf http://localhost:3000/health >/dev/null && ok "discord-aibot :3000" || warn "discord-aibot :3000 health not ready"
curl -sf http://localhost:4000/health >/dev/null && ok "discord-mcp-server :4000" || warn "discord-mcp :4000 health not ready"
curl -sf http://localhost:5000/health >/dev/null && ok "whisper-stt :5000" || warn "whisper-stt :5000 health not ready"

# 7. Python startup validation
echo "--- [7/8] Python startup validation ---"
if [ -f packages/lkeff-listen/scripts/startup_validator.py ]; then
  python packages/lkeff-listen/scripts/startup_validator.py --level standard \
    && ok "startup_validator" || warn "startup_validator reported issues"
else
  warn "startup_validator.py not found — add source from lkeff/lkeff-listen"
fi

# 8. Teardown
echo "--- [8/8] Tearing down test environment ---"
docker compose down && ok "teardown"

echo ""
echo "=== Audit complete. Review [WARN] lines before production deployment. ==="
