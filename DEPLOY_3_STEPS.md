# PRIME TRADE BOT — 3 кроки на Railway (для тих, хто не хоче розбиратись)

## Крок 1 — Видали зайве (30 сек)

У Railway видали сервіси:
- **@trade-app/web** (сайт уже на Vercel)
- **@trade-app/collector** (поки не треба)

Залиш тільки **api** і **bot**.

---

## Крок 2 — API (2 хв)

1. Клік **@trade-app/api** → **Variables** → **RAW Editor**
2. Відкрий на ПК файл `deploy/local/api.env` — **скопіюй увесь вміст** → встав у RAW → Save
3. Додай ще один рядок (якщо немає):
   ```
   RAILWAY_DOCKERFILE_TARGET=api
   ```
4. **Settings** → Config file: `apps/api/railway.toml`
5. **Networking** → **Generate Domain** → скопіюй URL (напр. `https://xxx.up.railway.app`)
6. **Settings** → **Volumes** → Add Volume → Mount path: `/app/apps/api/prisma`

---

## Крок 3 — Bot + Deploy (2 хв)

1. Клік **@trade-app/bot** → **Variables** → **RAW Editor**
2. Відкрий `deploy/local/bot.env` — скопіюй увесь вміст
3. Заміни рядок `API_URL=...` на URL з кроку 2
4. Додай: `RAILWAY_DOCKERFILE_TARGET=bot`
5. **Settings** → Config file: `apps/bot/railway.toml`
6. Зверху натисни **Deploy**

---

## Після деплою — напиши мені URL API

Або сам на ПК:

```powershell
powershell -File scripts/update-runtime-config.ps1 -ApiUrl "https://ТВІЙ-URL.up.railway.app"
git add apps/web/public/runtime-config.json
git commit -m "Connect Mini App to Railway API"
git push
```

**Адмінка:** https://trade-app-bot.vercel.app/admin  
Пароль у `deploy/local/api.env` → `ADMIN_PASSWORD`
