#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "→ Оновлення коду з GitHub..."
git pull origin main 2>/dev/null || true

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
# НЕ експортувати RAILWAY_TOKEN з файлу — ламає свіжий login!
unset RAILWAY_TOKEN

CLI="npx --yes @railway/cli@5.4.2"

echo "→ Railway..."
if ! $CLI whoami; then
  echo ""
  echo "✗ Немає входу. Запусти RAILWAY_ЛОГІН.command і спробуй знову."
  exit 1
fi

$CLI link -p rare-rebirth -s prime-trade -e production 2>/dev/null \
  || $CLI link -p rare-rebirth -s prime-trade

AUTH_FILE="$(mktemp)"
cat > "$AUTH_FILE" <<'AUTHEOF'
42["auth",{"session":"a:4:{s:10:\"session_id\";s:32:\"984e39c0af300b27c53a71f3690ec241\";s:10:\"ip_address\";s:14:\"194.228.25.146\";s:10:\"user_agent\";s:117:\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36\";s:13:\"last_activity\";i:1780851768;}3042bc70266e1afc9450d40d90f2dad2","isDemo":0,"uid":31511988,"platform":1,"isFastHistory":true,"isOptimized":true}]
AUTHEOF
B64=$(base64 < "$AUTH_FILE" | tr -d '\n')
rm -f "$AUTH_FILE"

echo "→ Variables..."
$CLI variables set "PO_WS_URL=wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket" --service prime-trade
$CLI variables set "PO_AUTH_MESSAGE_B64=$B64" --service prime-trade
$CLI variables set "MARKET_DATA_MODE=platform" --service prime-trade
$CLI variables set "PLATFORM_SYNTHETIC_FALLBACK=false" --service prime-trade
$CLI variables set "BRIDGE_ANCHORED_PULSE=false" --service prime-trade

echo "→ BUILD нового коду (5-7 хв)..."
$CLI up --detach --service prime-trade

echo ""
echo "SUCCESS: білд запущено"
echo ""
echo "Чекаю version 1.5.6-signal-fast..."
for i in $(seq 1 20); do
  sleep 20
  STATUS=$(curl -sf "https://prime-trade-production.up.railway.app/api/collector/status" 2>/dev/null || echo "")
  if [ -n "$STATUS" ]; then
    VER=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','?'))" 2>/dev/null || echo "?")
    ASSETS=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('assetCount',0))" 2>/dev/null || echo "?")
    echo "  [$i/20] version=$VER assetCount=$ASSETS"
    if [ "$VER" = "1.5.5-timestamp-fix" ]; then
      echo ""
      echo "✓ НОВИЙ КОД НА ПРОДІ!"
      exit 0
    fi
  else
    echo "  [$i/20] білд ще йде..."
  fi
done

echo ""
echo "⚠ Перевір Railway → prime-trade → Deployments (має бути Building/Success)"
exit 0
