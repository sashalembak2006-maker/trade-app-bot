#!/bin/bash
cd "$(dirname "$0")"
clear
echo ""
echo "════════════════════════════════════════════"
echo " PRIME TRADE — оновити PO auth + deploy"
echo "════════════════════════════════════════════"
echo ""

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
CLI="npx --yes @railway/cli@5.4.2"

if ! $CLI whoami >/dev/null 2>&1; then
  echo "→ Railway login..."
  $CLI login || exit 1
fi

$CLI link -p rare-rebirth -s prime-trade -e production 2>/dev/null || $CLI link -p rare-rebirth -s prime-trade || exit 1

AUTH_FILE="$(mktemp)"
cat > "$AUTH_FILE" <<'AUTHEOF'
42["auth",{"session":"a:4:{s:10:\"session_id\";s:32:\"984e39c0af300b27c53a71f3690ec241\";s:10:\"ip_address\";s:14:\"194.228.25.146\";s:10:\"user_agent\";s:117:\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36\";s:13:\"last_activity\";i:1780851768;}3042bc70266e1afc9450d40d90f2dad2","isDemo":0,"uid":31511988,"platform":1,"isFastHistory":true,"isOptimized":true}]
AUTHEOF

B64=$(base64 < "$AUTH_FILE" | tr -d '\n')
rm -f "$AUTH_FILE"

echo "→ Variables (B64 auth — без проблем з лапками)..."
$CLI variables set "PO_WS_URL=wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket" --service prime-trade
$CLI variables set "PO_AUTH_MESSAGE_B64=$B64" --service prime-trade
$CLI variables set "PO_WS_URL_FALLBACKS=wss://api-us.po.market/socket.io/?EIO=4&transport=websocket,wss://api.po.market/socket.io/?EIO=4&transport=websocket" --service prime-trade
$CLI variables set "PLATFORM_SYNTHETIC_FALLBACK=false" --service prime-trade
$CLI variables set "BRIDGE_ANCHORED_PULSE=false" --service prime-trade
$CLI variables set "MARKET_DATA_MODE=platform" --service prime-trade
$CLI variables set "COLLECTOR_PUSH_INTERVAL_MS=250" --service prime-trade

echo "→ Redeploy (3-5 хв)..."
$CLI redeploy --service prime-trade --yes 2>/dev/null || $CLI up --detach --service prime-trade

echo ""
echo "✓ Чекай 3-4 хв → відкрий:"
echo "  https://prime-trade-production.up.railway.app/api/collector/status"
echo "  wsConnected: true | assetCount: 100+"
echo ""
read -p "Enter..."
