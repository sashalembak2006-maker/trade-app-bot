#!/bin/bash
open "chrome://extensions/" 2>/dev/null || true
open "https://pocketoption.com/en/cabinet/demo-quick-high-low/" 2>/dev/null || true
open "https://prime-trade-production.up.railway.app/api/health" 2>/dev/null || true
open "https://railway.com/dashboard" 2>/dev/null || true
echo ""
echo "════════════════════════════════════════════"
echo " PRIME TRADE — коли повернешся з роботи"
echo "════════════════════════════════════════════"
echo ""
echo "1. Деплой (один раз, 3 хв):"
echo "   cd ~/trade-app-bot && npm run deploy:railway"
echo "   → Link → prime-trade (НЕ @trade-app/api)"
echo ""
echo "2. Chrome: Reload Bridge v2.0.0"
echo "3. PO → F5 → Telegram Mini App"
echo ""
