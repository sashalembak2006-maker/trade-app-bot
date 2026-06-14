#!/bin/bash
cd "$(dirname "$0")"
clear
echo ""
echo "▶ PRIME TRADE — DEPLOY (1 клік)"
echo ""
bash .railway-deploy-run.sh || { read -p "Enter..."; exit 1; }
echo ""
echo "✓ https://prime-trade-production.up.railway.app/api/collector/status"
read -p "Enter..."
