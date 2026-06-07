# PRIME TRADE BOT — деплой 24/7 (Railway + Vercel)

**Вже працює на Vercel:** Mini App + адмінка → `https://trade-app-bot.vercel.app`  
**Треба підняти 24/7:** API + Telegram-бот (Railway або u1host VPS).

Bridge (Chrome) залишається на ПК — це нормально для live payout/цін.

---

## Варіант A — Railway (~$5/міс, найпростіше)

### 1. Створи акаунт

1. https://railway.app → увійти через GitHub
2. **New Project** → **Deploy from GitHub repo** → `trade-app-bot`

### 2. Сервіс API

1. **New Service** → той самий репо
2. **Settings** → **Build**:
   - Dockerfile: `Dockerfile`
   - Docker target: `api` (змінна `RAILWAY_DOCKERFILE_TARGET` = `api`)
3. **Networking** → **Generate Domain** → скопіюй URL, напр.  
   `https://prime-trade-api-production.up.railway.app`
4. **Variables** — встав з `deploy/local/api.env` (файл на твоєму ПК після setup)
5. **Volumes** (рекомендовано): mount `/app/apps/api/prisma` — щоб SQLite не губилась

### 3. Сервіс Bot

1. **New Service** → той самий репо, target `bot`
2. **Variables** — з `deploy/local/bot.env`
3. `API_URL` = URL API з кроку 2 (без слеша в кінці)

### 4. Підключи Vercel до API

Відредагуй `apps/web/public/runtime-config.json`:

```json
{
  "apiUrl": "https://ТВІЙ-API.up.railway.app",
  "wsUrl": "wss://ТВІЙ-API.up.railway.app/ws"
}
```

```bash
git add apps/web/public/runtime-config.json
git commit -m "Point Mini App to production API"
git push
```

### 5. Bridge на ПК

У розширенні Chrome → Backend URL = `https://ТВІЙ-API.up.railway.app`  
Bridge Secret = значення `BRIDGE_SECRET` з API `.env`

### 6. Перевірка

- `https://ТВІЙ-API.up.railway.app/health` → `{"status":"ok"}`
- `https://trade-app-bot.vercel.app/admin` → логін `admin@primetrade.bot`
- Telegram → `/start` у боті

---

## Варіант B — u1host VPS

Повна інструкція: [DEPLOY_U1HOST.md](./DEPLOY_U1HOST.md)

Потрібно: VPS (~$5–10/міс) + домен з SSL (або один домен на все).

---

## Що мені надіслати для повного деплою за тебе

Якщо хочеш, щоб хтось залив на сервер:

| Railway | u1host |
|---------|--------|
| Доступ до Railway (invite) або токен | IP VPS + SSH root пароль |
| — | Домен (якщо є) |

**Не надсилай BOT_TOKEN у публічний чат** — краще через Railway Variables сам.

---

## Адмінка після деплою

| Поле | Значення |
|------|----------|
| URL | https://trade-app-bot.vercel.app/admin |
| Email | admin@primetrade.bot |
| Пароль | див. `deploy/local/api.env` → `ADMIN_PASSWORD` |

Telegram: `/admin` у @primetradebot (твій ID `7798035089`).
