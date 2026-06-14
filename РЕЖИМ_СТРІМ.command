#!/bin/bash
# Вимикає VPS Collector на Railway — PO не буде reload під час TikTok Live.
# Ціни йдуть через Chrome Bridge Extension (apps/bridge-extension).
cd "$(dirname "$0")"

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
unset RAILWAY_TOKEN

CLI="npx --yes @railway/cli@5.4.2"
PROJECT="rare-rebirth"
SERVICE="prime-trade"

echo ""
echo "════════════════════════════════════════════════════════"
echo " PRIME TRADE — Режим стрім (Bridge, без Collector)"
echo "════════════════════════════════════════════════════════"
echo ""
echo "→ Вимикаю Collector на Railway (не чіпає твій Pocket Option)..."
echo ""

if ! $CLI whoami >/dev/null 2>&1; then
  $CLI login || exit 1
fi

$CLI link -p "$PROJECT" -s "$SERVICE" -e production 2>/dev/null \
  || $CLI link -p "$PROJECT" -s "$SERVICE" || exit 1

$CLI variables set "COLLECTOR_ENABLED=false" --service "$SERVICE"
$CLI variables set "MARKET_DATA_MODE=platform" --service "$SERVICE"

echo "→ Redeploy (2–4 хв)..."
$CLI up --detach --service "$SERVICE"

echo ""
echo "✓ Collector ВИМКНЕНО."
echo ""
echo "Далі на Mac:"
echo "  1. chrome://extensions → Load unpacked → apps/bridge-extension"
echo "  2. Popup: Backend = https://prime-trade-production.up.railway.app"
echo "  3. Відкрий Pocket Option у цьому Chrome (торгуй тут під ефіром)"
echo "  4. Popup має показати: Status Connected ✓"
echo ""
echo "Перевірка: /api/collector/status → online: false (це нормально)"
echo ""
read -p "Enter щоб закрити..."
