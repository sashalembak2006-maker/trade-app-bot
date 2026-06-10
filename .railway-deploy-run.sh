#!/bin/bash
cd "$(dirname "$0")"

echo "→ Оновлення коду з GitHub..."
git pull origin main 2>/dev/null || true

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
unset RAILWAY_TOKEN

CLI="npx --yes @railway/cli@5.4.2"

run_with_timeout() {
  local secs="$1"
  shift
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$secs" "$@"
    return $?
  fi
  if command -v timeout >/dev/null 2>&1; then
    timeout "$secs" "$@"
    return $?
  fi
  "$@"
}

echo "→ Railway link..."
run_with_timeout 45 $CLI link -p rare-rebirth -s prime-trade -e production 2>/dev/null \
  || run_with_timeout 45 $CLI link -p rare-rebirth -s prime-trade 2>/dev/null \
  || true

if run_with_timeout 30 $CLI whoami 2>/dev/null; then
  echo "  ✓ login OK"
else
  echo "  ⚠ Railway API не відповів — все одно пробую deploy (локальний token)"
fi

# Variables в Dockerfile.railway — не чекаємо API (часто лагає).
if [ "${SET_RAILWAY_VARS:-0}" = "1" ]; then
  echo "→ Variables (опційно)..."
  AUTH_FILE="$(mktemp)"
  cat > "$AUTH_FILE" <<'AUTHEOF'
42["auth",{"session":"a:4:{s:10:\"session_id\";s:32:\"984e39c0af300b27c53a71f3690ec241\";s:10:\"ip_address\";s:14:\"194.228.25.146\";s:10:\"user_agent\";s:117:\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36\";s:13:\"last_activity\";i:1780851768;}3042bc70266e1afc9450d40d90f2dad2","isDemo":0,"uid":31511988,"platform":1,"isFastHistory":true,"isOptimized":true}]
AUTHEOF
  B64=$(base64 < "$AUTH_FILE" | tr -d '\n')
  rm -f "$AUTH_FILE"
  for pair in \
    "PO_WS_URL=wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket" \
    "PO_AUTH_MESSAGE_B64=$B64" \
    "MARKET_DATA_MODE=platform" \
    "PLATFORM_SYNTHETIC_FALLBACK=false" \
    "BRIDGE_ANCHORED_PULSE=false" \
    "SIGNAL_PRICE_WAIT_MS=2200" \
    "SIGNAL_FOCUS_GRACE_MS=600"
  do
    run_with_timeout 25 $CLI variables set "$pair" --service prime-trade 2>/dev/null \
      && echo "  ✓ ${pair%%=*}" \
      || echo "  ⚠ skip ${pair%%=*}"
  done
else
  echo "→ Variables пропущено (вже в Dockerfile + Railway dashboard)"
fi

echo "→ BUILD нового коду (5-7 хв)..."
if ! run_with_timeout 120 $CLI up --detach --service prime-trade; then
  echo ""
  echo "✗ railway up не вдався."
  echo "  Спробуй: Railway.app → prime-trade → Deployments → Redeploy"
  exit 1
fi

echo ""
echo "SUCCESS: білд запущено"
echo ""
echo "Чекаю version 1.5.13-po-sync..."
for i in $(seq 1 20); do
  sleep 20
  STATUS=$(curl -sf --max-time 8 "https://prime-trade-production.up.railway.app/api/collector/status" 2>/dev/null || echo "")
  if [ -n "$STATUS" ]; then
    VER=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','?'))" 2>/dev/null || echo "?")
    ASSETS=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('assetCount',0))" 2>/dev/null || echo "?")
    echo "  [$i/20] version=$VER assetCount=$ASSETS"
    if [ "$VER" = "1.5.13-po-sync" ]; then
      echo ""
      echo "✓ НОВИЙ КОД НА ПРОДІ!"
      exit 0
    fi
  else
    echo "  [$i/20] білд ще йде..."
  fi
done

echo ""
echo "⚠ Перевір Railway → prime-trade → Deployments"
exit 0
