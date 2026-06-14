#!/bin/sh
# Railway: API + Bot (+ optional Collector — OFF by default for Bridge/stream mode)
set -e
PORT="${PORT:-3001}"
export API_URL="http://127.0.0.1:${PORT}"
export DATABASE_URL="${DATABASE_URL:-file:./prod.db}"

echo "[railway] Starting API on :${PORT}..."
npm run start:prod -w @trade-app/api &
API_PID=$!

for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo "[railway] API health OK"
    break
  fi
  sleep 1
done

(
  while true; do
    echo "[railway] Starting Telegram bot..."
    npm run start -w @trade-app/bot || echo "[railway] Bot exited, restarting in 5s..."
    sleep 5
  done
) &
BOT_PID=$!

COLLECTOR_ON="${COLLECTOR_ENABLED:-false}"
case "$COLLECTOR_ON" in
  true|1|yes|YES) COLLECTOR_ON=true ;;
  *) COLLECTOR_ON=false ;;
esac

if [ "$COLLECTOR_ON" = "true" ] && [ -n "$PO_AUTH_MESSAGE" ] && [ -n "$PO_WS_URL" ]; then
  echo "[railway] Starting PO collector (COLLECTOR_ENABLED=true)..."
  npm run start -w @trade-app/collector &
elif [ -n "$PO_AUTH_MESSAGE" ] && [ -n "$PO_WS_URL" ]; then
  echo "[railway] Collector SKIPPED — use Chrome Bridge extension (no PO session conflict)."
  echo "[railway] For 24/7 VPS feed: COLLECTOR_ENABLED=true + separate Demo PO account."
else
  echo "[railway] Collector skipped (PO_AUTH not set — Bridge extension mode)"
fi

wait $API_PID $BOT_PID
