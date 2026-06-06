# Bridge Extension — інструкція для новачка

Це розширення читає **ціну** і **payout** з відкритої сторінки Pocket Option і надсилає їх на ваш backend. Логін і пароль Pocket Option розширенню **не потрібні** — ви входите в браузері самі.

---

## Крок 1. Запустіть backend і frontend

У корені проєкту двічі клікніть файл:

```
start-dev.bat
```

Відкриються два вікна терміналу. Зачекайте, поки з’явиться:

- `PRIME TRADE BOT API: http://localhost:3001`
- `Local: http://localhost:5173`

---

## Крок 2. Встановіть розширення в Chrome або Edge

### Edge

1. Відкрийте в адресному рядку: `edge://extensions`
2. Увімкніть **Режим розробника** (перемикач зверху справа)
3. Натисніть **Завантажити розпаковане**
4. Виберіть папку:

```
C:\Users\PC\Projects\trade-app-bot\apps\bridge-extension
```

(Якщо ваш проєкт в іншому місці — виберіть папку `apps\bridge-extension` всередині нього.)

### Chrome

1. Відкрийте: `chrome://extensions`
2. Увімкніть **Режим розробника**
3. Натисніть **Завантажити розпаковане розширення**
4. Виберіть ту саму папку `apps\bridge-extension`

Після встановлення з’явиться іконка **Platform Bridge**.

---

## Крок 3. Перевірте налаштування в popup

1. Натисніть на іконку розширення (зверху в браузері)
2. Мають бути такі значення (за замовчуванням):

| Поле | Значення |
|------|----------|
| Backend URL | `http://127.0.0.1:3001` |
| Bridge Secret | `dev-secret` |

3. Якщо змінювали — натисніть **Зберегти**

**Важливо:** Bridge Secret у popup має збігатися з `BRIDGE_SECRET` у файлі `apps/api/.env` (там теж `dev-secret`).

---

## Крок 4. Відкрийте Pocket Option і увійдіть

1. Відкрийте сайт Pocket Option (наприклад `https://pocketoption.com`)
2. Увійдіть у свій акаунт **як завжди** — розширення цього не робить
3. Відкрийте торговий термінал з графіком (щоб була видна пара, ціна і payout %)

Розширення **само** кожну 1 секунду читає зі сторінки:

- символ активної пари
- поточну ціну
- payout %
- OTC (якщо в назві пари є OTC)

---

## Крок 5. Перевірте, що все працює

### A) Popup розширення

Через кілька секунд на відкритій сторінці Pocket Option:

- **Status:** `Connected`
- **Last asset:** назва пари (наприклад `EUR/USD OTC`)
- **Last price:** число
- **Last payout:** відсоток

Якщо **Not connected** — перевірте, що backend запущений і Secret правильний.

### B) Backend (у браузері)

Відкрийте:

```
http://localhost:3001/api/admin/market-data
```

Має з’явитися JSON з `rows` — там будуть symbol, price, payout.

### C) Mini App

Відкрийте `http://localhost:5173`

- Замість **DEMO DATA** має бути **REAL DATA CONNECTED**
- Якщо bridge ще не підключений — **Дані тимчасово недоступні**

---

## Часті проблеми

| Проблема | Що зробити |
|----------|------------|
| Not connected | Запустіть `start-dev.bat`, Backend URL = `http://127.0.0.1:3001`, натисніть **Перевірити backend** |
| HTTP 401 | Bridge Secret у popup ≠ `BRIDGE_SECRET` у `.env` |
| Немає Last asset | Відкрийте торговий термінал Pocket Option після логіну |
| DEMO DATA не зникає | Оновіть сторінку Mini App після Connected у popup |
| Extension context invalidated | Перезавантажте розширення → натисніть **F5** на Pocket Option |
| Тільки 1 пара в боті | Відкрийте **список активів** на Pocket Option (ліва панель або вибір пари) |

> **Усі пари:** Pocket Option показує повний каталог у лівій панелі / списку активів. Тримайте цей список відкритим — тоді bridge надсилає всі пари з payout. Жива ціна рухається лише для **активної** пари на графіку (це обмеження платформи).

---

## Короткий чеклист

1. ✅ `start-dev.bat` — backend працює
2. ✅ Розширення встановлено з папки `apps/bridge-extension`
3. ✅ Popup: Backend URL + Secret `dev-secret`
4. ✅ Pocket Option відкритий, ви залогінені
5. ✅ Popup: **Connected**
6. ✅ `http://localhost:3001/api/admin/market-data` показує дані
7. ✅ Mini App: **REAL DATA CONNECTED**
