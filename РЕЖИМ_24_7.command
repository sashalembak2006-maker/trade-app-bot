#!/bin/bash
# Режим 24/7 — VPS collector на Railway, БЕЗ Chrome extension
cd "$(dirname "$0")"

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
unset RAILWAY_TOKEN

CLI="npx --yes @railway/cli@5.4.2"
PROJECT="rare-rebirth"
SERVICE="prime-trade"
PO_WS_URL="wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket"

echo ""
echo "════════════════════════════════════════════════════════"
echo " PRIME TRADE — Режим 24/7 (VPS Collector, без Bridge)"
echo "════════════════════════════════════════════════════════"
echo ""
echo "✓ Бот працює без Chrome / без розширення"
echo "✓ Ціни з Pocket Option 24/7 на сервері"
echo ""
echo "⚠️  ВАЖЛИВО: створи ОКРЕМИЙ Demo-акаунт PO тільки для сервера."
echo "    НЕ заходи в цей акаунт у браузері під час роботи бота."
echo ""
echo "Крок 1. Відкрий pocketoption.com → Demo (НОВИЙ акаунт)"
echo "Крок 2. F12 → Network → WS → Messages → F5"
echo "Крок 3. Скопіюй рядок: 42[\"auth\",{...}]"
echo ""

read -r -p "PO_AUTH_MESSAGE: " PO_AUTH_MESSAGE

if [ -z "$PO_AUTH_MESSAGE" ] || [[ "$PO_AUTH_MESSAGE" != 42* ]]; then
  echo ""
  echo "✗ Невірний формат. Має починатись з 42[\"auth\","
  read -p "Enter щоб закрити..."
  exit 1
fi

echo ""
echo "→ Railway login..."
if ! $CLI whoami >/dev/null 2>&1; then
  $CLI login || exit 1
fi

echo "→ Link $PROJECT / $SERVICE..."
$CLI link -p "$PROJECT" -s "$SERVICE" -e production 2>/dev/null \
  || $CLI link -p "$PROJECT" -s "$SERVICE" || exit 1

echo "→ Variables 24/7..."
PO_AUTH_B64=$(printf '%s' "$PO_AUTH_MESSAGE" | base64 | tr -d '\n')

for pair in \
  "PO_WS_URL=$PO_WS_URL" \
  "PO_AUTH_MESSAGE_B64=$PO_AUTH_B64" \
  "PO_AUTH_MESSAGE=$PO_AUTH_MESSAGE" \
  "COLLECTOR_ENABLED=true" \
  "MARKET_DATA_MODE=platform" \
  "PLATFORM_SYNTHETIC_FALLBACK=false" \
  "BRIDGE_ANCHORED_PULSE=true" \
  "COLLECTOR_PUSH_INTERVAL_MS=100" \
  "OTC_STREAM_MS=250" \
  "FOCUS_POLL_MS=150" \
  "SIGNAL_PRICE_WAIT_MS=3000"
do
  $CLI variables set "$pair" --service "$SERVICE"
  echo "  ✓ ${pair%%=*}"
done

echo "→ Deploy (3–5 хв)..."
$CLI up --detach --service "$SERVICE"

echo ""
echo "✓ Готово! Чекай 3–5 хв, потім:"
echo "  https://prime-trade-production.up.railway.app/api/collector/status"
echo ""
echo "  wsConnected: true"
echo "  assetCount: 50+"
echo "  pricedCount: 30+"
echo ""
echo "Telegram: закрий Mini App → відкрий знову."
echo "Chrome extension більше НЕ потрібен."
echo ""
read -p "Enter щоб закрити..."
