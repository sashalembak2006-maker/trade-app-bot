#!/bin/bash
# Скидає фейкові seed-ціни на Railway — тільки реальні PO після цього
cd "$(dirname "$0")"
clear
echo ""
echo "▶ PRIME TRADE — скидання фейкових цін на Railway"
echo ""

node --input-type=module <<'EOF'
const res = await fetch('https://prime-trade-production.up.railway.app/api/bridge/reset', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-bridge-secret': '9a26f2c606a207f3d98a74e99ab588c0957ae68ffeb5',
  },
});
const body = await res.json().catch(() => ({}));
console.log('HTTP', res.status, JSON.stringify(body));
if (res.ok) {
  console.log('');
  console.log('✓ Фейкові ціни видалено');
  console.log('  Mini App покаже "ціна оновиться при сигналі" поки PO не підключиться');
  console.log('  Потім запусти ДЕПЛОЙ.command для версії 1.5.2-honest');
} else {
  console.log('');
  console.log('✗ Помилка — спочатку задеплой новий код (ДЕПЛОЙ.command), потім знову СКИНУТИ_ФЕЙК');
  console.log('  (404 = endpoint /api/bridge/reset ще не на Railway)');
}
EOF

echo ""
read -p "Enter..."
