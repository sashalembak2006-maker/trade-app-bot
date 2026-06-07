#!/usr/bin/env bash
# Bridge pipeline smoke test — run from repo root.
set -euo pipefail

API="${API_URL:-http://127.0.0.1:3001}"
SECRET="${BRIDGE_SECRET:-dev-secret}"
PASS=0
FAIL=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Bridge Pipeline QA ==="
echo "API: $API"

check "health endpoint" curl -sf "$API/api/health" >/dev/null

check "bridge POST" curl -sf -X POST "$API/api/bridge/assets/update" \
  -H "Content-Type: application/json" \
  -H "x-bridge-secret: $SECRET" \
  -d '{"source":"qa","assets":[{"symbol":"AUD/CAD OTC","payout":92,"isOTC":true,"price":0.72191,"category":"forex_otc"}]}' \
  >/dev/null

HEALTH=$(curl -sf "$API/api/health")
check "bridge.connected after POST" echo "$HEALTH" | grep -q '"connected":true'

check "market status" curl -sf "$API/api/market/status" >/dev/null

check "admin market-data" curl -sf "$API/api/admin/market-data" >/dev/null

echo ""
echo "Results: PASS=$PASS FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Bridge pipeline OK"
