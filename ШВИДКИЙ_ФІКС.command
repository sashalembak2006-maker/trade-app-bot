#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "════════════════════════════════════════════"
echo " PRIME TRADE — швидкий фікс (Railway hybrid)"
echo "════════════════════════════════════════════"
echo ""

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
unset RAILWAY_TOKEN

CLI="npx --yes @railway/cli@5.4.2"
PROJECT="rare-rebirth"
SERVICE="prime-trade"

echo "→ Перевірка входу в Railway..."
if ! $CLI whoami >/dev/null 2>&1; then
  echo ""
  echo "⚠ Токен прострочений або немає входу."
  echo "  Зараз відкриється браузер — увійди в Railway, потім знову запусти цей файл."
  echo ""
  $CLI login
  if ! $CLI whoami >/dev/null 2>&1; then
    echo "✗ Вхід не вдався. Спробуй: npx @railway/cli login"
    read -p "Enter щоб закрити..."
    exit 1
  fi
fi

echo "→ Прив'язка проєкту $PROJECT / $SERVICE..."
if ! $CLI link -p "$PROJECT" -s "$SERVICE" -e production 2>/dev/null; then
  $CLI link -p "$PROJECT" -s "$SERVICE" || {
    echo "✗ Не вдалось прив'язати проєкт. У Railway Dashboard: Project rare-rebirth → service prime-trade"
    read -p "Enter щоб закрити..."
    exit 1
  }
fi

echo "→ Вмикаємо hybrid ціни..."
$CLI variables set "PLATFORM_SYNTHETIC_FALLBACK=true" --service "$SERVICE"
$CLI variables set "BRIDGE_ANCHORED_PULSE=false" --service "$SERVICE"

echo "→ Deploy локального коду на Railway (2–3 хв)..."
$CLI up --detach --service "$SERVICE"

echo ""
echo "✓ Готово. Далі:"
echo "  1. chrome://extensions → PRIME TRADE → Reload (v2.1.1)"
echo "  2. Pocket Option demo відкрита на ПК"
echo "  3. Закрий/відкрий Mini App в Telegram"
echo ""
read -p "Enter щоб закрити..."
