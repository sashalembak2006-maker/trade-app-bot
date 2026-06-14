#!/bin/bash
# Оновлення PO сесії на Railway — запуск: подвійний клік
cd "$(dirname "$0")"

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
unset RAILWAY_TOKEN

CLI="npx --yes @railway/cli@5.4.2"
PROJECT="rare-rebirth"
SERVICE="prime-trade"
PO_WS_URL="wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket"

echo ""
echo "════════════════════════════════════════════════════════"
echo " PRIME TRADE — Оновити PO авторизацію (live ціни 24/7)"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Крок 1. Відкрий https://pocketoption.com (Demo або Real)"
echo "Крок 2. F12 → Network → WS → socket.io → вкладка Messages"
echo "Крок 3. Онови сторінку (F5), знайди рядок що починається з:"
echo "        42[\"auth\",{...}]"
echo ""
echo "⚠️  Увага: PO_AUTH на Railway + той самий акаунт у браузері = reload PO."
echo "    Для TikTok Live використовуй РЕЖИМ_СТРІМ.command (Bridge extension)."
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

echo "→ Оновлюю PO_AUTH..."
PO_AUTH_B64=$(printf '%s' "$PO_AUTH_MESSAGE" | base64 | tr -d '\n')
$CLI variables set "PO_WS_URL=$PO_WS_URL" --service "$SERVICE"
$CLI variables set "PO_AUTH_MESSAGE_B64=$PO_AUTH_B64" --service "$SERVICE"
$CLI variables set "PO_AUTH_MESSAGE=$PO_AUTH_MESSAGE" --service "$SERVICE"
$CLI variables set "COLLECTOR_ENABLED=true" --service "$SERVICE"
$CLI variables set "MARKET_DATA_MODE=platform" --service "$SERVICE"
$CLI variables set "PLATFORM_SYNTHETIC_FALLBACK=false" --service "$SERVICE"
$CLI variables set "BRIDGE_ANCHORED_PULSE=true" --service "$SERVICE"

echo "→ Redeploy (2–4 хв)..."
$CLI up --detach --service "$SERVICE"

echo ""
echo "✓ Готово! Чекай 3–4 хв, потім перевір:"
echo "  https://prime-trade-production.up.railway.app/api/collector/status"
echo ""
echo "  wsConnected: true"
echo "  assetCount: 100+"
echo "  message: Authenticated (не Auth failed)"
echo ""
echo "Telegram: закрий Mini App повністю → відкрий знову."
echo ""
read -p "Enter щоб закрити..."
