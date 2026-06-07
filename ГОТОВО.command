#!/bin/bash
# PRIME TRADE — один запуск, далі 3 кліки
set -e
cd "$(dirname "$0")"
EXT="$(pwd)/apps/bridge-extension"
RAILWAY="https://prime-trade-production.up.railway.app"

echo "╔══════════════════════════════════════════╗"
echo "║   PRIME TRADE BOT — ГОТОВО v2.0.0        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Realtime: ~20 оновлень/сек цін у Mini App"
echo ""

open "chrome://extensions" 2>/dev/null || true
open "https://pocketoption.com/en/cabinet/demo-quick-high-low/" 2>/dev/null || true
open "${RAILWAY}/api/health" 2>/dev/null || true

echo "1. chrome://extensions → RELOAD Bridge v2.0.0"
echo "   Load unpacked: ${EXT}"
echo ""
echo "2. Popup Bridge → Secret з Railway → Зберегти → Перевірити backend"
echo "   URL вже: ${RAILWAY}"
echo ""
echo "3. Pocket Option F5 → Telegram Mini App"
echo ""
