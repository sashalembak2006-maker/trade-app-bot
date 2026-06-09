#!/bin/bash
# МИТТЄВО заповнює всі OTC пари на проді — БЕЗ деплою (2 сек)
cd "$(dirname "$0")"
clear
echo ""
echo "▶ PRIME TRADE — миттєвий seed пар на Railway"
echo ""

node --input-type=module <<'EOF'
import { pocketForexOtcBridgeCatalog } from './packages/shared/dist/market/pocket-assets.js';

const assets = pocketForexOtcBridgeCatalog();
const res = await fetch('https://prime-trade-production.up.railway.app/api/bridge/assets/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-bridge-secret': '9a26f2c606a207f3d98a74e99ab588c0957ae68ffeb5',
  },
  body: JSON.stringify({
    source: 'emergency-seed',
    assets,
    activeSymbol: 'EUR/USD OTC',
  }),
});
const body = await res.json().catch(() => ({}));
console.log('HTTP', res.status, JSON.stringify(body));
console.log('Пар відправлено:', assets.length);
if (res.ok) {
  console.log('');
  console.log('✓ ГОТОВО — відкрий Mini App в Telegram зараз');
} else {
  console.log('');
  console.log('✗ Помилка — перевір інтернет');
}
EOF

echo ""
read -p "Enter..."
