#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "════════════════════════════════════════════"
echo " Railway — вхід (один раз)"
echo "════════════════════════════════════════════"
echo ""
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
unset RAILWAY_TOKEN
npx --yes @railway/cli@5.4.2 login
echo ""
npx --yes @railway/cli@5.4.2 whoami
echo ""
echo "✓ Після входу запусти ДЕПЛОЙ.command"
echo ""
read -p "Enter щоб закрити..."
