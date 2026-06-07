# Live-дані 24/7 без ПК (Collector на Railway)

## Що вже на Railway
- API + Telegram-бот — працюють 24/7 ✅
- **Collector** — код уже в контейнері, чекає один ключ з Pocket Option

## Один крок тільки від тебе (3 хв)

### 1. Відкрий Pocket Option у Chrome і увійди в акаунт

### 2. F12 → вкладка **Network** → фільтр **WS** (WebSocket)

### 3. Онови сторінку (F5)

### 4. Клікни на з'єднання `socket.io` → вкладка **Messages**

### 5. Знайди рядок що починається з:
```
42["auth",
```
Скопіюй **весь рядок** (наприклад):
```
42["auth",{"session":"abc123xyz...","isDemo":0,"uid":12345678}]
```

### 6. Railway → сервіс **prime-trade** → **Variables** → додай:

```
PO_WS_URL=wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket
PO_AUTH_MESSAGE=42["auth",{"session":"ВСТАВ_СЮДИ","isDemo":0,"uid":12345}]
```

(встав свій скопійований рядок замість прикладу)

### 7. Натисни **Deploy** або зачекай автодеплой

Через 1–2 хв Mini App покаже активи з payout — **без ПК і без Bridge**.

---

## Важливо
- Сесія PO **закінчується** (раз на кілька днів). Тоді повтори кроки 1–7.
- Bridge на ПК **не потрібен**, якщо collector працює.

## Перевірка
Відкрий: `https://prime-trade-production.up.railway.app/health`  
`assetCount` має бути > 0 після підключення collector.
