@echo off
cd /d "%~dp0"

if not exist "apps\bot\.env" (
  echo ERROR: apps\bot\.env not found. Copy from apps\bot\.env.example or fill BOT_TOKEN.
  pause
  exit /b 1
)

findstr /B "BOT_TOKEN=$" apps\bot\.env >nul 2>&1
if %errorlevel%==0 (
  echo.
  echo ============================================
  echo   СПОЧАТКУ ЗАПОВНІТЬ apps\bot\.env
  echo ============================================
  echo.
  echo   1. BOT_TOKEN=...        ^(з @BotFather^)
  echo   2. TELEGRAM_ADMIN_IDS=  ^(ваш ID з @userinfobot^)
  echo   3. Те саме TELEGRAM_ADMIN_IDS і BOT_TOKEN у apps\api\.env
  echo.
  echo   WEBAPP_URL для Telegram: потрібен HTTPS ^(ngrok або Vercel^)
  echo   Для тесту в браузері: http://localhost:5173
  echo.
  pause
  exit /b 1
)

echo ============================================
echo   PRIME TRADE — повний локальний тест
echo ============================================
echo.

echo [1/3] API backend...
start "PRIME API" cmd /k "npm run server"
timeout /t 3 /nobreak >nul

echo [2/3] Web Mini App...
start "PRIME Web" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul

echo [3/3] Telegram Bot...
start "PRIME Bot" cmd /k "npm run bot"

echo.
echo  API:         http://127.0.0.1:3001
echo  Health:      http://127.0.0.1:3001/api/health
echo  Market data: http://127.0.0.1:3001/api/admin/market-data
echo  Web Admin:   http://localhost:5173/admin
echo               login: admin@primetrade.bot / admin123
echo  Mini App:    http://localhost:5173
echo.
echo  Telegram:    /start  — воронка користувача
echo               /admin  — адмін-панель ^(тільки ваш TELEGRAM_ADMIN_IDS^)
echo.
echo  Bridge:      розширення Chrome + Pocket Option ^(як раніше^)
echo.
pause
