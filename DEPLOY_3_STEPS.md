# PRIME TRADE BOT — Railway (офлайн = не задеплоєно)

## Чому OFFLINE?
1. **Не натиснув Deploy** або деплой **червоний** (помилка)
2. **Мало змінних** — треба ~20 рядків з `deploy/local/api.env`, не 1!
3. **Невірна команда старту** — має бути `npm run start:prod -w @trade-app/api`

---

## API — 4 кліки

### 1. Variables (ОБОВʼЯЗКОВО)
`@trade-app/api` → **Variables** → **RAW Editor**

Відкрий на ПК: `deploy\local\api.env` → **Ctrl+A, Ctrl+C** → встав у Railway → Save

У `BOT_TOKEN=` встав токен з `apps\bot\.env`

### 2. Settings → Source
- **Root Directory** = порожньо (корінь репо) або `/`
- **Config file** = `apps/api/railway.toml`

### 3. Settings → Deploy
**Custom Start Command** = очисти або встав:
```
npm run start:prod -w @trade-app/api
```

### 4. Deploy
Фіолетова кнопка **Deploy** зверху. Чекай **зелений** статус.

Потім **Networking** → **Generate Domain**.

---

## Bot
Те саме з `deploy\local\bot.env` + `API_URL` = URL api.

Config: `apps/bot/railway.toml`  
Start: `npm run start -w @trade-app/bot`

---

## Перевірка
`https://ТВІЙ-URL.up.railway.app/health` → `{"status":"ok"}`

Скинь URL — підключимо Vercel.
