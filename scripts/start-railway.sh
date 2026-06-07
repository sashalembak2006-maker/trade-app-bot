#!/bin/sh
# Один контейнер: API + Bot (Railway)
set -e
PORT="${PORT:-3001}"
export API_URL="http://127.0.0.1:${PORT}"

npm run start:prod -w @trade-app/api &
API_PID=$!

sleep 3
npm run start -w @trade-app/bot &
BOT_PID=$!

wait $API_PID $BOT_PID
