# PRIME TRADE BOT — Деплой на VPS (MVP)

> **Українською (швидкий чеклист + 5 хв PO сесія):** [DEPLOY_UA.md](./DEPLOY_UA.md)

Покрокова інструкція для новачка. Мета: бот працює 24/7, приймає користувачів, видає доступи, показує актуальні дані з платформи.

---

## 1. Який сервер купити

| Параметр | Рекомендація |
|----------|--------------|
| Провайдер | Hetzner, DigitalOcean, Vultr, Timeweb |
| ОС | **Ubuntu 22.04 LTS** |
| RAM | **2 GB** мінімум (4 GB комфортніше) |
| CPU | 1–2 vCPU |
| Диск | 20 GB SSD |
| Домен | Будь-який (.com / .bot / .pro) — для HTTPS і Mini App |

Приклад: Hetzner CX22 (~€4/міс) або DigitalOcean Basic $12/міс.

---

## 2. Підключення по SSH

```bash
ssh root@YOUR_SERVER_IP
```

Оновіть систему:

```bash
apt update && apt upgrade -y
```

Встановіть Node.js 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git
node -v   # має бути v22.x
```

Встановіть PM2 (менеджер процесів 24/7):

```bash
npm install -g pm2
```

---

## 3. Завантаження проєкту

```bash
cd /opt
git clone https://github.com/YOUR_USER/trade-app-bot.git
cd trade-app-bot
```

Або завантажте ZIP і розпакуйте в `/opt/trade-app-bot`.

---

## 4. Налаштування `.env`

### 4.1 API

```bash
cp .env.production.example apps/api/.env
nano apps/api/.env
```

**Обовʼязково заповніть:**

| Змінна | Куди вставити | Приклад |
|--------|---------------|---------|
| `BOT_TOKEN` | Telegram → @BotFather → ваш бот | `7123456789:AAH...` |
| `WEBAPP_URL` | @BotFather → Bot Settings → Menu Button / Web App URL | `https://your-domain.com` |
| `TELEGRAM_ADMIN_IDS` | Ваш Telegram ID (@userinfobot) | `847291036` |
| `POCKET_REFERRAL_URL` | Реферальне посилання Pocket Option | `https://pocketoption.com/...` |
| `INTERNAL_API_SECRET` | Секрет bot ↔ API | `openssl rand -hex 32` |
| `BRIDGE_SECRET` | Довгий випадковий рядок | `openssl rand -hex 32` |
| `COLLECTOR_SECRET` | Інший випадковий рядок | `openssl rand -hex 32` |
| `INTERNAL_API_SECRET` | Для звʼязку bot ↔ API | `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Пароль веб-адмінки `/admin` | сильний пароль |
| `CORS_ORIGIN` | URL Mini App | `https://your-domain.com` |
| `MARKET_DATA_MODE` | Завжди `platform` на проді | `platform` |

### 4.2 Bot

```bash
cp apps/api/.env apps/bot/.env
```

Переконайтесь, що в `apps/bot/.env` є:
- `BOT_TOKEN` — той самий токен
- `WEBAPP_URL` — URL Mini App
- `API_URL=http://127.0.0.1:3001`
- `INTERNAL_API_SECRET` — той самий, що в API
- `ADMIN_TELEGRAM_IDS` — ваш Telegram ID

### 4.3 Web (збірка)

```bash
nano apps/web/.env
```

```env
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com/ws
VITE_BOT_USERNAME=@YourPrimeTradeBot
```

### 4.4 Collector (технічний Pocket акаунт — НЕ паролі користувачів)

```bash
cp apps/api/.env apps/collector/.env
nano apps/collector/.env
```

Додайте `PO_WS_URL` і `PO_AUTH_MESSAGE` — див. розділ 8.

---

## 5. Запуск (5 команд)

```bash
cd /opt/trade-app-bot
npm install
npm run build
npm run db:push
chmod +x start-production.sh
./start-production.sh
```

Або вручну:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # автозапуск після перезавантаження VPS
```

---

## 6. Перевірка

```bash
pm2 status
```

Має бути **online**:
- `prime-api` — backend
- `prime-bot` — Telegram бот
- `prime-web` — Mini App (порт 4173)
- `prime-collector` — дані з Pocket (якщо налаштовано)

```bash
curl -s http://127.0.0.1:3001/health
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/admin/market-data | head -c 500
```

У Telegram:
1. Напишіть боту `/start` — має відповісти
2. Напишіть `/admin` (з акаунта з `ADMIN_TELEGRAM_IDS`) — admin panel

---

## 7. Nginx + HTTPS (рекомендовано)

```bash
apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/prime-trade`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Варіант A: Mini App через prime-web (vite preview :4173)
    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_set_header Host $host;
    }

    # Варіант B: Mini App з API (встановіть SERVE_WEB=true в apps/api/.env)
    # location / {
    #     proxy_pass http://127.0.0.1:3001;
    # }
}
```

```bash
ln -s /etc/nginx/sites-available/prime-trade /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d your-domain.com
```

У @BotFather встановіть Web App URL: `https://your-domain.com`

---

## 8. Data Collector (24/7 дані з Pocket Option)

**Важливо:** користувачів НЕ просимо пароль Pocket. Collector використовує **окремий технічний акаунт** на VPS.

1. Залогіньтесь у Pocket Option у Chrome на VPS (або скопіюйте сесію з DevTools)
2. DevTools → Network → WS → знайдіть Socket.IO
3. Скопіюйте перше повідомлення `42["auth",{...}]` після підключення
4. Вставте в `apps/collector/.env`:

```env
PO_WS_URL=wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket
PO_AUTH_MESSAGE=42["auth",{"session":"...","isDemo":0,"uid":12345}]
```

5. Перезапустіть collector:

```bash
pm2 restart prime-collector
```

Перевірка: `https://your-domain.com/admin/market-data` — мають зʼявитись активи з payout.

**Альтернатива (dev):** Chrome extension `apps/bridge-extension` на окремому ПК з відкритою платформою — не для 24/7 продакшену.

---

## 9. Воронка користувача

```
/start → Реєстрація (Pocket ID, без пароля)
       → pending_deposit
       → Адмін підтверджує (/admin або кнопки в Telegram)
       → deposited → доступ до Mini App
       → VIP вручну (/grantvip або admin panel)
```

---

## 10. Admin у Telegram (`/admin`)

| Дія | Як |
|-----|-----|
| Користувачі (15 останніх) | `/admin` → 👥 Користувачі |
| Підтвердити депозит | Кнопки в повідомленні або `/admin` → 💰 Депозити |
| Видати basic | `/grant <telegramId>` |
| Видати VIP | `/grantvip <telegramId>` |
| Забрати доступ | `/revoke <telegramId>` |
| Бан / розбан | `/ban` / `/unban` |
| Статистика | `/admin` → 📊 Статистика |
| Розсилка | `/admin` → 📢 Розсилка → надіслати текст |

---

## 11. Корисні команди PM2

```bash
pm2 status              # статус процесів
pm2 logs prime-bot      # логи бота
pm2 logs prime-api      # логи API
pm2 restart all         # перезапуск
pm2 stop prime-collector  # зупинити collector
npm run stop:prod       # зупинити все
```

---

## 12. Чеклист перед запуском рефералів

- [ ] `pm2 status` — усі процеси online
- [ ] `/health` та `/api/health` → `status: ok`
- [ ] `/api/admin/market-data` — активи з payout (collector online)
- [ ] Бот `/start` відповідає
- [ ] Бот `/admin` працює для вашого ID
- [ ] Mini App відкривається з Telegram
- [ ] Реєстрація → pending_deposit → approve → доступ
- [ ] Сигнал генерується без timeout

---

## Швидкий старт (копіюйте)

```bash
cd /opt/trade-app-bot
cp .env.production.example apps/api/.env && nano apps/api/.env
cp apps/api/.env apps/bot/.env
nano apps/web/.env
npm install && npm run build && npm run db:push
./start-production.sh
pm2 status
curl http://127.0.0.1:3001/api/health
```
