# PRIME TRADE BOT — Швидкий деплой для рефералів (українською)

**Мета:** бот працює 24/7 на VPS **без** вашого компʼютера та Chrome-розширення.  
**Час:** ~60 хвилин, якщо вже є домен і Telegram-бот.

---

## Що купити / підготувати

| Що | Навіщо | Рекомендація |
|----|--------|--------------|
| **VPS** | API + бот + collector 24/7 | Hetzner CX22, Timeweb, DigitalOcean — **2 GB RAM**, Ubuntu 22.04 |
| **Домен** | HTTPS для Telegram Mini App | Будь-який (.com, .pro) — ~$10/рік |
| **Telegram Bot Token** | Бот для рефералів | @BotFather → `/newbot` |
| **Pocket Option акаунт** | Технічна сесія для collector | Ваш або окремий демо-акаунт (паролі користувачів **не** потрібні) |

---

## Чеклист (покроково, з часом)

### 1. VPS і SSH — ~10 хв

1. Купіть VPS, отримайте IP (наприклад `185.x.x.x`).
2. Підключіться: `ssh root@185.x.x.x`
3. Встановіть Node 22 і PM2:

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx certbot python3-certbot-nginx
npm install -g pm2
```

### 2. Завантажити проєкт — ~5 хв

```bash
cd /opt
git clone https://github.com/YOUR_USER/trade-app-bot.git
cd trade-app-bot
```

(Або завантажте ZIP і розпакуйте в `/opt/trade-app-bot`.)

### 3. Налаштувати `.env` — ~10 хв

```bash
cp .env.production.example apps/api/.env
nano apps/api/.env
```

**Обовʼязково змініть:**

| Змінна | Де взяти |
|--------|----------|
| `BOT_TOKEN` | @BotFather |
| `WEBAPP_URL` | `https://ваш-домен.com` (після SSL) |
| `CORS_ORIGIN` | той самий URL |
| `ADMIN_TELEGRAM_IDS` | ваш ID з @userinfobot |
| `ADMIN_PASSWORD` | пароль для `/admin` |
| `BRIDGE_SECRET` | `openssl rand -hex 32` |
| `COLLECTOR_SECRET` | `openssl rand -hex 32` |
| `INTERNAL_API_SECRET` | `openssl rand -hex 32` |
| `MARKET_DATA_MODE` | `platform` |
| `PLATFORM_SYNTHETIC_FALLBACK` | `false` |

Скопіюйте env для бота і collector:

```bash
cp apps/api/.env apps/bot/.env
cp apps/api/.env apps/collector/.env
```

Web (для збірки):

```bash
nano apps/web/.env
```

```env
VITE_API_URL=https://ваш-домен.com
VITE_WS_URL=wss://ваш-домен.com/ws
VITE_BOT_USERNAME=@ВашБот
```

### 4. Сесія Pocket Option (5 хвилин) — **ОБОВʼЯЗКОВО**

Collector працює **тільки** з вашою сесією PO. Паролі рефералів не потрібні.

1. Відкрийте **Chrome** → увійдіть на [pocketoption.com](https://pocketoption.com).
2. Натисніть **F12** → вкладка **Network** → фільтр **WS**.
3. Оновіть сторінку (F5). Зʼявиться зʼєднання типу `socket.io` або `po.market`.
4. Клікніть на нього → вкладка **Messages** (Повідомлення).
5. Знайдіть рядок, що починається з **`42["auth",`** — це `PO_AUTH_MESSAGE`.  
   Приклад: `42["auth",{"session":"abc123...","isDemo":0,"uid":12345}]`
6. Скопіюйте **весь рядок** (правий клік → Copy message).
7. У вкладці WS скопіюйте **URL** (правий клік → Copy link address) → це `PO_WS_URL`.  
   Приклад: `wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket`

Вставте в `apps/collector/.env`:

```env
PO_WS_URL=wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket
PO_AUTH_MESSAGE=42["auth",{"session":"ВСТАВТЕ_СЮДИ","isDemo":0,"uid":12345}]
```

> ⚠️ Сесія **закінчується** через години/дні. Тоді повторіть кроки 4.1–4.7 і `pm2 restart prime-collector`.

### 5. Запуск — ~5 хв

```bash
chmod +x start-production.sh scripts/verify-production.sh
./start-production.sh
```

### 6. Домен + HTTPS — ~15 хв

1. У DNS додайте A-запис: `@` → IP вашого VPS.
2. Скопіюйте nginx-шаблон:

```bash
sed 's/your-domain.com/ваш-домен.com/g' deploy/nginx/prime-trade.conf \
  | sudo tee /etc/nginx/sites-available/prime-trade
sudo ln -sf /etc/nginx/sites-available/prime-trade /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ваш-домен.com
```

3. У **@BotFather**:
   - `/setdomain` → ваш домен
   - Bot Settings → Menu Button → Web App URL: `https://ваш-домен.com`

### 7. Перевірка — ~5 хв

```bash
./scripts/verify-production.sh
pm2 logs prime-collector --lines 30
```

У Telegram: `/start` → кнопка Mini App.  
У браузері: `https://ваш-домен.com/admin/market-data` — має бути **Collector online: yes**, активів > 50.

---

## Команди перевірки

```bash
# Статус усіх процесів
pm2 status

# API живий?
curl -s http://127.0.0.1:3001/api/health

# Дані з Pocket (payout + активи)
curl -s http://127.0.0.1:3001/api/collector/status

# Логи collector (шукайте "updateAssets: 57 pairs")
pm2 logs prime-collector --lines 50

# Повний smoke test
./scripts/verify-production.sh
```

---

## Telegram для рефералів

1. Дайте посилання на бота: `https://t.me/ВашБот`
2. Користувач: `/start` → реєстрація (Pocket ID, **без пароля**)
3. Ви (адмін): `/admin` → підтвердження депозиту → доступ до Mini App
4. VIP: `/grantvip <telegramId>`

---

## Що працює без розширення

| Функція | Джерело |
|---------|---------|
| Payout % усіх пар | ✅ Collector → `updateAssets` |
| Список усіх активів PO | ✅ Collector |
| Live ціна **обраної** пари | ✅ Collector + focus при сигналі |
| Live ціна **всіх** пар одночасно | ❌ Обмеження Pocket Option |
| 24/7 без вашого ПК | ✅ VPS + PM2 |

---

## Чи реально за 1 годину?

| Сценарій | Час |
|----------|-----|
| Є домен + бот + VPS | **~45–60 хв** — реалістично |
| Немає домену | +24–48 год DNS; Mini App без HTTPS не працює в Telegram |
| Не витягнули PO сесію | Collector не стартує — див. розділ 4 |

**Мінімальний шлях:** VPS + PM2 + collector + nginx + BotFather.  
Розширення Chrome — **тільки для локальної розробки**, не для рефералів.

---

## Альтернатива: Docker

```bash
cp .env.production.example apps/api/.env && nano apps/api/.env
cp apps/api/.env apps/bot/.env && cp apps/api/.env apps/collector/.env
docker compose up -d --build
```

Детальніше: [DEPLOY.md](./DEPLOY.md) (англійською).
