#!/usr/bin/env bash
# PRIME TRADE BOT — one-shot production bootstrap on Ubuntu VPS
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> PRIME TRADE BOT production setup"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install Node 20+: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs"
  exit 1
fi

echo "Node $(node -v)"

if [ ! -f apps/api/.env ]; then
  echo "ERROR: Copy .env.production.example → apps/api/.env and fill secrets first."
  exit 1
fi

if [ ! -f apps/bot/.env ]; then
  echo "Copying apps/api/.env → apps/bot/.env (edit BOT_TOKEN if needed)"
  cp apps/api/.env apps/bot/.env
fi

if [ ! -f apps/collector/.env ]; then
  echo "Copying apps/api/.env → apps/collector/.env"
  cp apps/api/.env apps/collector/.env
fi

if ! grep -q '^PO_AUTH_MESSAGE=42\["auth"' apps/collector/.env 2>/dev/null; then
  echo ""
  echo "WARNING: PO_AUTH_MESSAGE not set in apps/collector/.env"
  echo "  Collector will exit until you paste Pocket Option session — see DEPLOY_UA.md section 4"
  echo ""
fi

mkdir -p logs

echo "==> npm install"
npm install

echo "==> Build shared, api, bot, collector, web"
npm run build

echo "==> Database migrate"
npm run db:push

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2 globally..."
  sudo npm install -g pm2
fi

echo "==> Start / reload PM2 processes"
pm2 delete prime-api prime-bot prime-web prime-collector 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "Done. Check status:"
echo "  pm2 status"
echo "  curl -s http://127.0.0.1:3001/api/health | head"
echo "  curl -s http://127.0.0.1:3001/api/admin/market-data | head"
echo ""
echo "Mini App: API serves built web from apps/web/dist (or prime-web :4173)"
echo "Configure nginx + SSL — see DEPLOY_UA.md"
echo "Smoke test: ./scripts/verify-production.sh"
