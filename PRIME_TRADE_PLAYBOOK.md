# PRIME TRADE BOT — повний playbook (збережено з робочого проєкту)

> **Статус:** production-ready MVP, перевірено локально (червень 2026).  
> Bridge + live ціни + чесні сигнали + Telegram воронка + адмінка.

Якщо просиш зробити **такого ж бота знову** — почни з цього файлу і `.cursor/rules/prime-trade-bot-playbook.mdc`.

---

## 1. Архітектура

```
Pocket Option (Chrome)
    ↓ Bridge extension (page-hook + content + background)
    ↓ POST /api/bridge/assets/update  (x-bridge-secret)
apps/api  ←→  BridgeMarketDataProvider  ←→  WebSocket /ws
    ↓
apps/web (Mini App)     apps/bot (Telegram)     apps/api/admin
```

**Не чіпати**, якщо працює:
- Парсинг `updateStream` у `binary-decoder.js` / `page-hook.js`
- `BridgeMarketDataProvider` як єдине джерело ринку
- `MARKET_DATA_MODE=platform`

---

## 2. Pocket Option — формат даних (КРИТИЧНО)

Детально: `apps/bridge-extension/POCKET_STREAM_FORMAT.md` + `.cursor/rules/pocket-option-stream-parsing.mdc`

```json
[["EURJPY_otc", 1780789097.061, 189.811]]
```

- Binary attachment = **UTF-8 JSON**, не float bytes
- `picked.source` має бути **`asJson`**, не `float-scan`
- Timestamp у **секундах** → ×1000 для ms
- Символ: `EURJPY_otc` → `EUR/JPY OTC`
- Емітити **всі** тики з батчу

---

## 3. Bridge extension — налаштування

| Поле | Значення |
|------|----------|
| Backend URL | `http://127.0.0.1:3001` |
| Bridge Secret | `dev-secret` (з **дефісом**, не пробіл!) |
| PO сторінка | Demo trading (`demo-quick-high-low`) |

**Popup статуси:**
- `Connected ✓` — все ок
- `Backend offline` / `Failed to fetch` — API не запущений або невірний secret
- `Scraped: 57` — PO дані читаються

**background.js:** throttle POST (MIN_POST_MS 700), черга, dedup — інакше Windows вбиває з'єднання.

**Ціни:** не видаляти price у неактивних символів, якщо є свіжий WS tick (updateStream batch).

---

## 4. Локальний запуск (Windows)

```bat
ЗАПУСК.bat   ← API + Web (не закривати вікна!)
```

Або вручну:
```bat
npm run server   # :3001
npm run dev      # :5173
npm run bot      # Telegram (потрібен BOT_TOKEN)
```

Перевірка: http://127.0.0.1:3001/api/health → `"bridge": { "connected": true }`

---

## 5. Сигнали — як МАЄ працювати

### Кроки користувача
1. Обрати пару → Bridge фокусує PO (`POST /api/focus`)
2. Обрати таймфрейм (3s, 5s, 15s, …)
3. «Отримати сигнал» → аналіз 2–3 сек
4. Екран **CALL/PUT** + **таймер** (напр. 00:15 → 00:00)
5. **Поточна ціна** оновлюється live (кожні 400ms з API)
6. Після 00:00 — **win / loss / невизначено** за реальною ціною PO

### Backend (`apps/api/src/routes/user.ts`)
- `POST /api/focus` — фокус для bridge
- `POST /api/signals/generate` — live entry price з bridge
- `GET /api/assets/:symbol/price` — exit price **без synthetic**
- **Не викликати `clearFocus` після успішного сигналу** — тримати до `expiresAt`

### Frontend (`SignalModal.tsx`)
- `expiresAt = now + timeframeToMs(selectedTimeframe)` на клієнті
- `useCountdown` тільки в фазі `result`
- Settlement **тільки** коли `Date.now() >= expiresAt`
- Poll `getLivePrice(symbol)` кожні 400ms під час відліку
- `requestFocus` кожні 4s під час сигналу

### Типові баги (вже виправлені)
| Баг | Причина |
|-----|---------|
| Миттєва «виграна угода» | Settlement при `seconds===0` на першому рендері |
| Ціна не рухається | Немає poll + focus знятий після generate |
| Дивні % `0.000456…` | Неокруглений change — тепер 2 знаки |
| Фейкова ціна закриття | synthetic fallback — вимкнено для settlement |

---

## 6. Доступи та Telegram

**Статуси:** `guest` → `registered` → `pending_deposit` → `deposited` → `vip` | `banned`

**Бот `/start`:**
- 🚀 Відкрити Prime Trade (WebApp)
- 📖 Інструкція / 💬 Підтримка / ⭐ Відгуки
- `POCKET_REFERRAL_URL` — усі посилання на PO з `.env`

**`/admin`** (тільки `TELEGRAM_ADMIN_IDS`):
- Користувачі, депозити, VIP, бан, розсилка, статистика

**Mini App:** обмежений режим без `deposited`/`vip`; повний доступ після підтвердження депозиту.

---

## 7. Змінні середовища

### `apps/api/.env`
```env
API_PORT=3001
MARKET_DATA_MODE=platform
BRIDGE_SECRET=dev-secret
PLATFORM_SYNTHETIC_FALLBACK=true
TELEGRAM_ADMIN_IDS=YOUR_ID
BOT_TOKEN=...
INTERNAL_API_SECRET=dev-internal-secret
ADMIN_EMAIL=admin@primetrade.bot
ADMIN_PASSWORD=...
```

### `apps/bot/.env`
```env
BOT_TOKEN=...
WEBAPP_URL=https://your-domain.com
POCKET_REFERRAL_URL=https://pocketoption.com/...
API_URL=http://127.0.0.1:3001
INTERNAL_API_SECRET=dev-internal-secret
TELEGRAM_ADMIN_IDS=YOUR_ID
```

### `apps/web/.env` (dev)
```env
VITE_API_URL=
VITE_WS_URL=
```

---

## 8. Деплой на VPS

Див. `DEPLOY.md`, `DEPLOY_UA.md`:
- PM2: `prime-api`, `prime-bot`, `prime-web`
- nginx + SSL
- Bridge залишається на ПК користувача/адміна з PO (або collector на VPS з `PO_AUTH_MESSAGE`)

---

## 9. Чеклист «все працює»

- [ ] `/api/health` → `bridge.connected: true`, 57+ assets
- [ ] Extension → Connected, Last price змінюється
- [ ] Mini App → ціни рухаються, % з 2 знаками
- [ ] Сигнал 15s → повний відлік → чесний результат
- [ ] `/start` + `/admin` у Telegram
- [ ] `npm run build` + `npm run typecheck` проходять

---

## 10. Ключові файли (швидкий індекс)

| Що | Де |
|----|-----|
| PO stream parse | `apps/bridge-extension/binary-decoder.js`, `page-hook.js` |
| Bridge → API | `apps/bridge-extension/background.js`, `apps/api/src/routes/bridge.ts` |
| Live prices | `packages/shared/src/market/bridge-provider.ts` |
| Focus | `apps/api/src/services/focus.ts` |
| Signals API | `apps/api/src/routes/user.ts` |
| Signal UI | `apps/web/src/components/signal/SignalModal.tsx` |
| Settlement | `apps/web/src/utils/signal-settlement.ts` |
| Bot + admin | `apps/bot/src/index.ts`, `admin.ts` |
| Запуск Win | `ЗАПУСК.bat` |

---

*Збережено після успішного тесту: live ціни = PO, сигнали з відліком, чесне закриття.*
