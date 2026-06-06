#!/usr/bin/env bash
# Quick smoke test after deploy — run on VPS from repo root.
set -euo pipefail

API="${API_URL:-http://127.0.0.1:3001}"
echo "==> Health"
curl -sf "$API/api/health" | head -c 200
echo ""

echo "==> Market data (first 400 chars)"
curl -sf "$API/api/admin/market-data" 2>/dev/null | head -c 400 || echo "(admin auth may be required)"

echo ""
echo "==> Collector status"
curl -sf "$API/api/collector/status" | head -c 300
echo ""

echo "==> PM2 (if installed)"
if command -v pm2 >/dev/null 2>&1; then
  pm2 status
else
  echo "pm2 not installed — skip"
fi

echo ""
echo "OK — also test /start in Telegram and open Mini App from bot menu."
