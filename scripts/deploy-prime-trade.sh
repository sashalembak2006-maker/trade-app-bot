#!/bin/bash
# Деплой ТІЛЬКИ в сервіс prime-trade (production URL)
set -e
cd "$(dirname "$0")/.."

echo "╔══════════════════════════════════════════════╗"
echo "║  PRIME TRADE → Railway prime-trade deploy    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

CLI="npx --yes @railway/cli@5.4.2"

if [ -z "$RAILWAY_TOKEN" ]; then
  echo "→ Логін Railway (відкриється браузер)..."
  $CLI login
else
  export RAILWAY_TOKEN
  echo "→ RAILWAY_TOKEN знайдено"
fi

echo "→ Link rare-rebirth / prime-trade"
$CLI link -p rare-rebirth -s prime-trade 2>/dev/null || $CLI link || true

echo "→ Deploy prime-trade (NOT @trade-app/api)"
$CLI up --detach --service prime-trade

echo ""
echo "✓ Готово. Чекай 3–5 хв → Railway → prime-trade → SUCCESS"
echo "  Health: https://prime-trade-production.up.railway.app/api/health"
echo "  Потім: Reload Bridge v2.0.0 + F5 Pocket Option"
