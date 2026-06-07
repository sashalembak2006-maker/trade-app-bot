#!/bin/bash
cd "$(dirname "$0")"
echo "PRIME TRADE → Railway deploy (prime-trade)"
echo "Потрібен інтернет. Чекай 3–5 хв після SUCCESS."
bash .railway-deploy-run.sh
echo ""
echo "Перевір: https://prime-trade-production.up.railway.app/api/health"
read -p "Enter щоб закрити..."
