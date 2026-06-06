# PRIME TRADE BOT

Преміум Telegram Mini App для торгових сигналів — luxury gold/black UI, система доступів, admin panel.

## Структура

```
apps/web/       → React + Zustand + Framer Motion
apps/api/       → Express + WebSocket + Prisma
apps/bot/       → grammY Telegram Bot
packages/shared → SignalEngine, MarketDataProvider
```

## Швидкий старт

```bash
npm install
npm run build -w @trade-app/shared
cp .env.example apps/api/.env
npm run db:push

# Terminal 1
npm run server

# Terminal 2
npm run dev

# Terminal 3 (optional)
npm run bot
```

- **Mini App:** http://localhost:5173
- **Admin Panel:** http://localhost:5173/admin
- **API:** http://localhost:3001

## Access System

Доступ видає **тільки адмін** через `/admin`.

| Статус | Що бачить користувач |
|--------|----------------------|
| `guest` | Екран «Доступ за запрошенням» + кнопка оновити |
| `deposited` | Повний доступ до апки |
| `vip` | Повний доступ + VIP функції |
| `banned` | Блокування |

**Як видати доступ:** `/admin` → знайти користувача за **Telegram ID** → **Відкрити доступ** або **VIP**

> Після перезапуску API увійдіть в адмінку знову (`admin@primetrade.bot` / `admin123`).

## Admin

Login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` з `.env`

Панель: `/admin` — Users, Deposits, VIP, Signals, Analytics, Revenue

## Market data modes

Режим джерела даних задається змінною `MARKET_DATA_MODE` в `apps/api/.env`:

| Режим | Поведінка | Badge у Mini App |
|-------|-----------|------------------|
| `mock` | Симуляція ринку (для розробки/демо). Стабільний payout, ціна оновлюється щосекунди. | `DEMO DATA` |
| `platform` | Реальні дані з торгової платформи через **Platform Bridge** (розширення браузера). | `REAL DATA CONNECTED` / `DATA SOURCE STALE` |
| *(не задано)* | У production за замовчуванням — `unconfigured`. Дані не вигадуються. | `DATA SOURCE NOT CONNECTED` |

Сигнал бере `price`/`payout`/candles **тільки** з активного провайдера на бекенді — фронтенд надсилає лише `assetSymbol` + `timeframe`. Якщо дані недоступні, бекенд миттєво повертає `503`, а Mini App показує зрозуміле повідомлення з кнопками **«Спробувати ще раз»** (та опційно **«Увімкнути Demo Mode»**).

### Модель даних bridge: активна пара vs список

Реальну ціну має лише **активна пара**, яка зараз відкрита на платформі (її котирування є на графіку). Тому:

- **Активна пара** → надсилається `symbol` + `price` + `payout` (+ `isOTC`, `timestamp`). Має живу ціну → сигнал працює.
- **Список активів** → надсилається лише `symbol` + `payout` (+ `isOTC`), **без ціни**. Ми ніколи не вигадуємо ціну для неактивних активів.

Якщо користувач у Mini App вибирає актив зі списку (без живої ціни), бекенд повертає `422 NO_PRICE`, а застосунок показує: **«Відкрийте цей актив на платформі, щоб оновити дані.»** — без зависань і без фейкових даних. Коли користувач відкриє цей актив на платформі, bridge почне надсилати його ціну, і сигнал стане доступним.

Якщо bridge не надсилає дані (платформа закрита) — Mini App показує **«Дані тимчасово недоступні»**, а не demo/fake дані.

## Як підключити реальні дані платформи

Реальні котирування підключаються через **Platform Bridge** — розширення Chrome/Edge, яке читає `symbol / price / payout / OTC` зі сторінки торгової платформи й щосекунди надсилає їх на бекенд.

```
[Платформа в браузері] → [Platform Bridge extension] → POST /api/bridge/assets/update → [API in-memory state] → WebSocket → [Mini App]
```

### 1. Налаштувати бекенд

У `apps/api/.env`:

```env
MARKET_DATA_MODE=platform
BRIDGE_SECRET=<довгий-випадковий-рядок>
```

Перезапустіть API (`npm run server`). До приходу даних статус буде `DATA SOURCE NOT CONNECTED`.

### 2. Встановити розширення

1. Chrome/Edge → `chrome://extensions` → увімкнути **Developer mode**.
2. **Load unpacked** → вибрати папку `apps/bridge-extension`.
3. Відкрити popup розширення та заповнити:
   - **Backend URL** — `http://localhost:3001` (або ваш прод-домен);
   - **BRIDGE_SECRET** — те саме значення, що в `.env`;
   - **Bridge enabled** — увімкнено.
4. Відкрити сторінку торгової платформи (Pocket Option тощо). Розширення почне щосекунди надсилати дані.

> Селектори DOM у `apps/bridge-extension/content.js` — best-effort для Pocket Option. Якщо дані не зʼявляються, відкрийте DevTools на платформі, знайдіть елементи symbol/price/payout і оновіть `SELECTORS`. Кнопка **Test scrape** у popup показує поточний зразок.

### 3. Перевірити `/admin/market-data`

Відкрийте `http://localhost:5173/admin/market-data` (потрібна сесія адміна).

Таблиця показує: **symbol, price, payout, source, lastUpdated, stale**.
- **Refresh** — оновити таблицю;
- **Clear bridge data** — очистити збережений стан.

Якщо дані не приходять понад **5 секунд**, статус стає `STALE`, і генерація сигналів блокується (бекенд повертає `503`), щоб не торгувати на застарілих котируваннях.

### Безпека

- `POST /api/bridge/assets/update` приймає дані лише з валідним заголовком `x-bridge-secret: <BRIDGE_SECRET>`.
- Без `BRIDGE_SECRET` ендпоінт повертає `503`; з невірним секретом — `401`.
- Кнопка «Увімкнути Demo Mode» (рантайм-перемикання режиму) у production вимкнена, якщо не задано `ALLOW_RUNTIME_MODE_SWITCH=true`.

## Compliance

Сигнали є аналітичним прогнозом і не є фінансовою порадою. Торгівля повʼязана з ризиком.
