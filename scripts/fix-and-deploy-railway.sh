#!/usr/bin/env bash
# Sync BRIDGE_SECRET + deploy prime-trade (reads Railway token from ~/.railway/config.json)
set -euo pipefail
cd "$(dirname "$0")/.."

BRIDGE_SECRETS="${BRIDGE_SECRETS:-9a26f2c606a207f3d98a74e99ab588c0957ae68ffeb5}"
CLI="npx --yes @railway/cli@5.4.2"

if [ -z "${RAILWAY_TOKEN:-}" ]; then
  RAILWAY_TOKEN="$(python3 -c "import json; print(json.load(open('$HOME/.railway/config.json'))['user']['accessToken'])")"
  export RAILWAY_TOKEN
fi

echo "→ Railway whoami"
$CLI whoami

echo "→ Link project/service (prime-trade)"
$CLI link -p rare-rebirth -s prime-trade 2>/dev/null || $CLI link || true

echo "→ Set BRIDGE_SECRETS on prime-trade"
$CLI variables set "BRIDGE_SECRETS=${BRIDGE_SECRETS}" --service prime-trade

echo "→ Deploy prime-trade"
$CLI up --detach --service prime-trade

echo "✓ Deploy started. Wait 3–5 min, then verify POST /api/bridge/assets/update"
