#!/bin/sh
# Railway: API + Bot (+ optional Collector)
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

if [ -n "$PO_AUTH_MESSAGE" ] && [ -n "$PO_WS_URL" ]; then
  echo "[railway] Starting PO collector..."
  npm run start -w @trade-app/collector &
else
  echo "[railway] Collector skipped (set PO_AUTH_MESSAGE + PO_WS_URL for 24/7 without Bridge)"
fi

wait $API_PID $BOT_PID
