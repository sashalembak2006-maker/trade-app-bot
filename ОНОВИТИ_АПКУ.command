#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "════════════════════════════════════════════"
echo " PRIME TRADE — оновити Mini App (Vercel)"
echo "════════════════════════════════════════════"
echo ""
echo "Чому в Telegram «0 змін»:"
echo "  • Код змінений тільки на Mac (не в GitHub / Vercel)"
echo "  • Бот відкриває https://trade-app-bot.vercel.app — стара версія"
echo ""
echo "Цей скрипт: build → commit → push → Vercel сам задеплоїть (~2 хв)"
echo ""

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy

echo "→ npm run build..."
npm run build -w @trade-app/shared && npm run build -w @trade-app/web || {
  echo "✗ Build failed"
  read -p "Enter..."
  exit 1
}

echo ""
echo "→ Перевірка: нова версія має «Аналізуємо ринок»"
grep -q 'Аналізуємо ринок' apps/web/dist/assets/*.js && echo "  ✓ Нова версія в dist" || echo "  ⚠ Не знайдено — перевір build"

echo ""
git status -sb
echo ""
read -p "Закомітити і push на GitHub (Vercel redeploy)? [y/N] " ans
if [[ ! "$ans" =~ ^[yY]$ ]]; then
  echo "Скасовано. Без push Vercel НЕ оновиться."
  read -p "Enter..."
  exit 0
fi

git add \
  apps/web \
  apps/api/src/routes/user.ts \
  packages/shared/src/data \
  packages/shared/src/types \
  packages/shared/src/market \
  apps/bridge-extension \
  Dockerfile.railway \
  vercel.json \
  scripts/fix-and-deploy-railway.sh \
  "RAILWAY_ЛОГІН.command" \
  "ШВИДКИЙ_ФІКС.command" \
  "ДЕПЛОЙ.command" \
  "ОНОВИТИ_АПКУ.command" 2>/dev/null || true

git add -u apps/web apps/api packages/shared apps/bridge-extension 2>/dev/null || true

git commit -m "$(cat <<'EOF'
Deploy Mini App v2: signals UX, content, honest prices.

- Premium signal analysis loader, overlay fix, WIN/LOSS/DRAW
- Indicators, learning, news content and detail pages
- Bridge extension 2.1.0 honest prices, API content for limited users
EOF
)" || {
  echo "Немає нових змін для commit або commit не вдався"
}

echo "→ git push origin main..."
git push origin main || {
  echo ""
  echo "✗ Push failed. Увійди в GitHub:"
  echo "  git push origin main"
  read -p "Enter..."
  exit 1
}

echo ""
echo "✓ Push OK. Vercel задеплоїть за 1–3 хв."
echo ""
echo "Далі:"
echo "  1. https://vercel.com → trade-app-bot → чекай Ready"
echo "  2. Railway → prime-trade → Redeploy (API + bot) або ШВИДКИЙ_ФІКС.command"
echo "  3. chrome://extensions → PRIME TRADE Reload (v2.1.0)"
echo "  4. Telegram: закрий Mini App повністю → відкрий знову"
echo ""
echo "Перевірка: після сигналу має бути «Аналізуємо ринок…», не «ІНІЦІАЛІЗАЦІЯ НЕЙРОННОЇ»"
echo ""
read -p "Enter щоб закрити..."
