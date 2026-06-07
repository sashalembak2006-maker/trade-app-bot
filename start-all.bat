@echo off
cd /d "%~dp0"
echo PRIME TRADE BOT - zapusk (API + Bot + Web)
start "API" cmd /k "npm run server"
timeout /t 4 /nobreak >nul
start "BOT" cmd /k "npm run bot"
timeout /t 2 /nobreak >nul
start "WEB" cmd /k "npm run dev"
echo.
echo Gotovo. Bot u Telegram + Mini App localhost:5173
echo.
