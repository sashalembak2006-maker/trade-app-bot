# PRIME TRADE — найпростіше (1 сервіс)

## ЗАРАЗ (3 хв, без Railway) — лягай спати

Подвійний клік: **`start-all.bat`**

Працює API + бот + сайт на твоєму ПК. ПК не вимикай.

---

## Завтра Railway ($5) — 3 кроки

### 1. Очисти проєкт
Видали ВСІ сервіси. **New** → **GitHub** → `trade-app-bot` → **один** сервіс.

### 2. Variables → RAW Editor
Встав файл `deploy/local/railway-all.env` (згенеруй: `powershell -File scripts/write-production-env.ps1`)

`BOT_TOKEN` — з `apps/bot/.env`

### 3. Deploy
Settings → Config: `railway.toml` (в корені)  
Deploy → зелений → Networking → Generate Domain → скинь URL

---

## Архітектура Railway (важливо)

| Сервіс | Статус | URL |
|--------|--------|-----|
| **prime-trade** | ✅ Production | `https://prime-trade-production.up.railway.app` |
| **@trade-app/api** | ❌ Deprecated | auto-deploy вимкнено (`watchPatterns`) |
| **@trade-app/bot** | ❌ Deprecated | bot всередині prime-trade контейнера |

**Деплой тільки в `prime-trade`:**
```bash
npm run deploy:railway
# або
bash scripts/fix-and-deploy-railway.sh
```

Variables на **prime-trade**: `BRIDGE_SECRETS`, `BOT_TOKEN`, `DATABASE_URL`, тощо.

---

Готово. Один сервіс = API + бот разом.
