#!/bin/sh
# Railway: API + Bot + Collector (24/7 live PO data)
set -e
PORT="${PORT:-3001}"
export API_URL="http://127.0.0.1:${PORT}"

npm run start:prod -w @trade-app/api &
API_PID=$!

sleep 4

npm run start -w @trade-app/bot &
BOT_PID=$!

# 24/7 live data — VPS collector (no PC / Bridge needed)
if [ -n "$PO_AUTH_MESSAGE" ] && [ -n "$PO_WS_URL" ]; then
  echo "[railway] Starting PO collector (24/7 live data)..."
  npm run start -w @trade-app/collector &
  COLL_PID=$!
else
  echo "[railway] WARN: PO_AUTH_MESSAGE not set — no 24/7 live data. See LIVE_DATA_24_7.md"
  COLL_PID=
fi

wait $API_PID $BOT_PID
