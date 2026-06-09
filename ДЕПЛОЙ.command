#!/bin/bash
cd "$(dirname "$0")"
clear
echo ""
echo "════════════════════════════════════════════"
echo " PRIME TRADE → Railway DEPLOY"
echo "════════════════════════════════════════════"
echo ""
echo "Потрібен інтернет. Чекай 3–5 хв після SUCCESS."
echo ""

bash .railway-deploy-run.sh || { echo ""; echo "✗ Помилка деплою"; read -p "Enter..."; exit 1; }

echo ""
echo "✓ Відкрий через 4 хв:"
echo "  https://prime-trade-production.up.railway.app/api/collector/status"
echo "  version: 1.4.1-bootstrap | assetCount: 100+"
echo ""
read -p "Enter щоб закрити..."
