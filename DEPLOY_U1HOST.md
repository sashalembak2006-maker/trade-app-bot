# TRADE APP BOT — Швидкий деплой на u1host VPS

**Мета:** API + Telegram-бот + веб Mini App на VPS 24/7.  
**Bridge** (Chrome-розширення) залишається на ПК користувача — не чіпаємо.

**Час:** ~45–60 хвилин при готовому домені та боті.

---

## Що потрібно

| Що | Навіщо |
|----|--------|
| VPS u1host (Ubuntu 22.04) | API + bot + nginx |
| Домен з A-записом на IP VPS | HTTPS для Telegram Mini App |
| Bot Token (@BotFather) | Telegram-бот |
| SQLite (за замовч.) або PostgreSQL | База користувачів |

---

## 1. Підготовка сервера (~10 хв)

```bash
ssh root@YOUR_VPS_IP
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx certbot python3-certbot-nginx
npm install -g pm2
node -v   # має бути v20.x
```

---

## 2. Завантаження проєкту (~5 хв)

```bash
cd /opt
git clone https://github.com/YOUR_USER/trade-app-bot.git
cd trade-app-bot
npm install
```

---

## 3. Налаштування `.env` (~10 хв)

```bash
cp .env.example apps/api/.env
nano apps/api/.env
```

### Обовʼязкові змінні (чеклист)

| Змінна | Опис |
|--------|------|
| `BOT_TOKEN` | Токен від @BotFather |
| `WEBAPP_URL` | `https://ваш-домен.com` |
| `CORS_ORIGIN` | Той самий HTTPS URL |
| `TELEGRAM_ADMIN_IDS` | Ваш Telegram ID (@userinfobot) |
| `INTERNAL_API_SECRET` | `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Пароль веб-адмінки `/admin` |
| `POCKET_REFERRAL_URL` | Реферальне посилання Pocket Option |
| `REQUIRED_CHANNEL_ID` | `@channel` або `-100xxx` |
| `REQUIRED_CHANNEL_URL` | `https://t.me/channel` |
| `DATABASE_URL` | `file:./dev.db` (SQLite) або Postgres URL |

Скопіюйте env для бота:

```bash
cp apps/api/.env apps/bot/.env
```

Додайте в `apps/bot/.env` (якщо ще немає):

```env
BOT_DISPLAY_NAME=TRADE APP BOT
SUPPORT_URL=https://t.me/your_support
REVIEWS_URL=https://t.me/your_reviews
DEPOSIT_URL=https://pocketoption.com/...
WELCOME_IMAGE_URL=
```

Web для збірки:

```bash
nano apps/web/.env
```

```env
VITE_API_URL=https://ваш-домен.com
VITE_WS_URL=wss://ваш-домен.com/ws
VITE_BOT_USERNAME=@YourBotName
```

---

## 4. База даних і збірка (~10 хв)

```bash
cd /opt/trade-app-bot/apps/api
npx prisma db push
npx prisma generate
cd /opt/trade-app-bot
npm run build
```

> **PostgreSQL:** змініть `provider` у `schema.prisma` на `postgresql` і `DATABASE_URL` на `postgresql://...`, потім `npx prisma db push`.

---

## 5. PM2 — API + Bot (~5 хв)

```bash
cd /opt/trade-app-bot
pm2 start ecosystem.config.cjs --only api,bot
pm2 save
pm2 startup
```

Перевірка:

```bash
curl http://127.0.0.1:3001/api/health
pm2 logs bot --lines 20
```

---

## 6. Nginx + SSL (~15 хв)

```bash
cp deploy/nginx/prime-trade.conf /etc/nginx/sites-available/trade-app
nano /etc/nginx/sites-available/trade-app
# Замініть your-domain.com на ваш домен
ln -sf /etc/nginx/sites-available/trade-app /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d ваш-домен.com
```

Nginx проксує:
- `/` → статика `apps/web/dist`
- `/api` → `http://127.0.0.1:3001`
- `/ws` → WebSocket API

Перезберіть web після зміни домену:

```bash
cd /opt/trade-app-bot/apps/web && npm run build
```

---

## 7. BotFather — Mini App (~5 хв)

1. @BotFather → ваш бот → **Bot Settings** → **Menu Button** → **Configure menu button**
2. URL: `https://ваш-домен.com`
3. @BotFather → **/setdomain** → домен Mini App: `ваш-домен.com`

Переконайтесь, що бот — **адмін каналу** `REQUIRED_CHANNEL_ID` (для перевірки підписки).

---

## 8. Bridge (на ПК, не на VPS)

Ринкові дані через Chrome-розширення `apps/bridge-extension` працюють локально:

1. Встановіть розширення в Chrome
2. Відкрийте Pocket Option у браузері
3. `BRIDGE_SECRET` у `.env` API має збігатися з розширенням

На VPS можна додатково запустити `collector` (окремий сервіс) — див. `DEPLOY_UA.md`.

---

## Оновлення після змін у коді

```bash
cd /opt/trade-app-bot
git pull
npm install
cd apps/api && npx prisma db push && cd ../..
npm run build
pm2 restart api bot
```

---

## Швидка діагностика

| Проблема | Рішення |
|----------|---------|
| Mini App не відкривається | Перевірте `WEBAPP_URL`, SSL, `/setdomain` у BotFather |
| «Доступ закритий» | Адмін додає користувача: `/admin` → ➕ Додати реферала |
| Немає кнопки сигналу | Підписка на канал + whitelist (`isInvited`) |
| Бот не відповідає | `pm2 logs bot`, перевірте `BOT_TOKEN` |
| API 401 для бота | `INTERNAL_API_SECRET` однаковий в API і bot `.env` |

---

## Мінімальний `.env` для продакшену

```env
BOT_TOKEN=
TELEGRAM_ADMIN_IDS=
WEBAPP_URL=https://your-domain.com
POCKET_REFERRAL_URL=
REQUIRED_CHANNEL_ID=
REQUIRED_CHANNEL_URL=
DEPOSIT_URL=
WELCOME_IMAGE_URL=
INTERNAL_API_SECRET=
API_PORT=3001
CORS_ORIGIN=https://your-domain.com
DATABASE_URL="file:./dev.db"
ADMIN_EMAIL=admin@primetrade.bot
ADMIN_PASSWORD=
```
