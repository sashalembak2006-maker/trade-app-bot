#!/bin/bash
# PRIME TRADE — локальний API на Mac (якщо Railway заблокований на роботі)
set -e
cd "$(dirname "$0")"
echo "=== PRIME TRADE — Mac local API ==="
if [ ! -f apps/api/.env ]; then
  echo "Немає apps/api/.env — скопіюй з Railway Variables або .env.example"
  exit 1
fi
echo "API: http://127.0.0.1:3001"
echo "Bridge popup: Backend URL = http://127.0.0.1:3001  Secret = dev-secret (або BRIDGE_SECRET з .env)"
echo ""
npm run server
