# TRADE APP BOT

Преміум Telegram Mini App — торговий асистент для користувачів Pocket Option.

## Стек

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Framer Motion
- Telegram WebApp SDK

## Локальний запуск

```bash
npm install
npm run dev
```

## Деплой на Vercel

1. Завантажте репозиторій на GitHub
2. Імпортуйте проєкт у [Vercel](https://vercel.com)
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`

## Інтеграція з Telegram Bot

1. Задеплойте додаток на Vercel і скопіюйте URL (наприклад `https://trade-app-bot.vercel.app`)
2. У [@BotFather](https://t.me/BotFather) створіть або відредагуйте бота
3. Налаштуйте Menu Button або Web App:

```
/setmenubutton
@YourBotName
Відкрити TRADE APP BOT
https://trade-app-bot.vercel.app
```

Або через Bot API:

```json
{
  "menu_button": {
    "type": "web_app",
    "text": "TRADE APP BOT",
    "web_app": { "url": "https://trade-app-bot.vercel.app" }
  }
}
```

## Структура

```
src/
├── components/     # UI компоненти
├── pages/          # Сторінки (Home, VIP, Profile)
├── hooks/          # React хуки
├── services/       # Дані та Telegram SDK
├── styles/         # Глобальні стилі
└── types/          # TypeScript типи
```

## Функції

- 📈 Активи з OTC фільтром
- 🎓 Навчальні матеріали
- 🧮 Калькулятор ризику
- 📰 Новини (Форекс, Крипта, Економіка)
- 📉 Технічні індикатори
- 🤖 AI-аналіз ринку
- ⭐ VIP система
- 👤 Профіль Telegram користувача
