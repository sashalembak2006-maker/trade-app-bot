@echo off
cd /d "%~dp0"
echo ============================================
echo   PRIME TRADE BOT - start
echo ============================================
echo.
echo [1/2] API backend...
start "API Backend" cmd /k "npm run server"
timeout /t 3 /nobreak >nul
echo [2/2] Web frontend...
start "Web Frontend" cmd /k "npm run dev"
echo.
echo  Mini App:    http://localhost:5173
echo  Admin:       http://localhost:5173/admin
echo  API:         http://127.0.0.1:3001
echo.
echo  === ЯК КОРИСТУВАТИСЬ (просто) ===
echo.
echo  1. Запусти start-dev.bat (ти вже зробив)
echo  2. Розширення Bridge у Chrome - payout з PO (92%% тощо)
echo  3. Відкрий Mini App - натисни ОТРИМАТИ СИГНАЛ
echo.
echo  Payout - РЕАЛЬНИЙ з Pocket Option.
echo  Ціна - симулюється на сервері (hybrid), сигнали ПРАЦЮЮТЬ.
echo  Last price у popup розширення можна ігнорувати.
echo.
echo  Telegram bot (опційно): npm run bot
echo.
pause
