@echo off
cd /d "%~dp0"
echo PRIME TRADE BOT - lokalny 24/7 (PC musi byc wlaczony)
start "API" cmd /k "npm run server"
timeout /t 5 /nobreak >nul
start "BOT" cmd /k "npm run bot"
timeout /t 3 /nobreak >nul
start "TUNNEL" cmd /k "npx --yes cloudflared tunnel --url http://127.0.0.1:3001"
echo.
echo API + Bot + Tunnel zapuscheno.
echo Jak pojavytsya URL trycloudflare - skopiyuj i napyshesh meni dlya runtime-config.
echo Mini App: https://trade-app-bot.vercel.app
pause
