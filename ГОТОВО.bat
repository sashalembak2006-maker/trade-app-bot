@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PRIME TRADE — ГОТОВО

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   PRIME TRADE BOT — ВСЕ ГОТОВО v2.0.0    ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Realtime: ціни оновлюються ~20 разів/сек у боті.
echo.

set "EXT=%~dp0apps\bridge-extension"
set "RAILWAY=https://prime-trade-production.up.railway.app"

echo  [1] Відкриваю Chrome Extensions — натисни RELOAD на Bridge
start "" "chrome://extensions"

echo  [2] Відкриваю Pocket Option
start "" "https://pocketoption.com/en/cabinet/demo-quick-high-low/"

echo  [3] Health Railway
start "" "%RAILWAY%/api/health"

timeout /t 2 /nobreak >nul

echo.
echo  ══════════════════════════════════════════
echo   ТІЛЬКИ 3 КРОКИ:
echo  ══════════════════════════════════════════
echo.
echo   1. chrome://extensions  →  RELOAD "PRIME TRADE BOT Bridge" v2.0.0
echo      Load unpacked якщо треба: %EXT%
echo.
echo   2. Клік іконку Bridge  →  встав Bridge Secret з Railway  →  Зберегти
echo      Backend URL вже: %RAILWAY%
echo      Натисни "Перевірити backend" = OK
echo.
echo   3. Pocket Option  →  F5  →  відкрий Telegram бот
echo.
echo   Health має бути: bridge.connected = true
echo   Mini App: ціни рухаються постійно
echo.
pause
