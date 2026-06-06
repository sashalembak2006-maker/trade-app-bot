@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PRIME TRADE — запуск

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     PRIME TRADE BOT — ЗАПУСК             ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Перевірка: чи вже працює API
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
  echo  [OK] API вже працює на порту 3001
  goto start_web
)

echo  [1/2] Запуск API ^(НЕ ЗАКРИВАЙТЕ це вікно!^)...
start "PRIME API — НЕ ЗАКРИВАТИ" cmd /k "cd /d %~dp0 && npm run server"

echo  Чекаємо API...
set /a tries=0
:wait_api
set /a tries+=1
if %tries% GTR 30 (
  echo  [ПОМИЛКА] API не відповідає. Перевірте вікно PRIME API на помилки.
  pause
  exit /b 1
)
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% NEQ 0 (
  timeout /t 1 /nobreak >nul
  goto wait_api
)
echo  [OK] API запущено!

:start_web
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
  echo  [OK] Web вже працює на порту 5173
  goto open
)

echo  [2/2] Запуск Mini App ^(НЕ ЗАКРИВАЙТЕ це вікно!^)...
start "PRIME Web — НЕ ЗАКРИВАТИ" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 4 /nobreak >nul

:open
echo.
echo  ══════════════════════════════════════════
echo   ГОТОВО! Далі:
echo  ══════════════════════════════════════════
echo.
echo   1. Відкрийте Pocket Option у Chrome ^(demo — ок^)
echo   2. chrome://extensions — Reload розширення Bridge
echo   3. Popup: Secret = dev-secret  →  Зберегти
echo   4. Натисніть «Перевірити backend» → Connected
echo   5. F5 на Pocket Option
echo.
echo   Mini App:  http://localhost:5173
echo   Health:    http://127.0.0.1:3001/api/health
echo.
start http://127.0.0.1:3001/api/health
start http://localhost:5173
echo.
pause
