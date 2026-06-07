# Генерує deploy/local/api.env та bot.env для Railway/VPS (не комітиться в git)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$root\package.json")) { $root = Split-Path $PSScriptRoot -Parent }

$localDir = Join-Path $root 'deploy\local'
New-Item -ItemType Directory -Force -Path $localDir | Out-Null

function New-Secret([int]$bytes = 32) {
  $b = New-Object byte[] $bytes
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return ([BitConverter]::ToString($b) -replace '-', '').ToLower()
}

$internal = New-Secret 32
$bridge = New-Secret 24
$collector = New-Secret 24
$adminPass = New-Secret 16

$apiEnv = @"
# === PRIME TRADE BOT — Production API ===
# Скопіюй ці змінні в Railway → API service → Variables

NODE_ENV=production
API_PORT=3001

WEBAPP_URL=https://trade-app-bot.vercel.app
CORS_ORIGIN=https://trade-app-bot.vercel.app

DATABASE_URL=file:./prod.db
MARKET_DATA_MODE=platform
PLATFORM_SYNTHETIC_FALLBACK=true
BRIDGE_SECRET=$bridge
COLLECTOR_SECRET=$collector
INTERNAL_API_SECRET=$internal
ALLOW_RUNTIME_MODE_SWITCH=false
LOG_LEVEL=info

MIN_DEPOSIT_AMOUNT=100
ADMIN_EMAIL=admin@primetrade.bot
ADMIN_PASSWORD=$adminPass

TELEGRAM_ADMIN_IDS=7798035089
ADMIN_TELEGRAM_IDS=7798035089

# Встав свій токен з apps/bot/.env (НЕ комітити в git)
BOT_TOKEN=PASTE_FROM_apps_bot_env

POCKET_REFERRAL_URL=https://u2.shortink.io/register?utm_campaign=52397&utm_source=affiliate&utm_medium=sr&a=5ZcGv2M6DXidGG&ac=mercedescls&code=TUX812
DEPOSIT_URL=https://pocketoption.com/uk/cabinet/deposit-step-1
SUPPORT_URL=https://t.me/manager_primetrade
REVIEWS_URL=https://t.me/c/2014902155/544
"@

$botEnv = @"
# === PRIME TRADE BOT — Production Bot ===
# Railway → Bot service → Variables

BOT_TOKEN=PASTE_FROM_apps_bot_env
BOT_DISPLAY_NAME=PRIME TRADE BOT
WEBAPP_URL=https://trade-app-bot.vercel.app

# Після деплою API — встав публічний URL Railway API
API_URL=https://PASTE-RAILWAY-API-URL

INTERNAL_API_SECRET=$internal

POCKET_REFERRAL_URL=https://u2.shortink.io/register?utm_campaign=52397&utm_source=affiliate&utm_medium=sr&a=5ZcGv2M6DXidGG&ac=mercedescls&code=TUX812
DEPOSIT_URL=https://pocketoption.com/uk/cabinet/deposit-step-1
SUPPORT_URL=https://t.me/manager_primetrade
REVIEWS_URL=https://t.me/c/2014902155/544
WELCOME_IMAGE_URL=https://trade-app-bot.vercel.app/welcome-bot.png

TELEGRAM_ADMIN_IDS=7798035089
REQUIRED_CHANNEL_ID=
REQUIRED_CHANNEL_URL=
MIN_DEPOSIT_AMOUNT=100
"@

$apiEnv | Set-Content (Join-Path $localDir 'api.env') -Encoding UTF8
$botEnv | Set-Content (Join-Path $localDir 'bot.env') -Encoding UTF8

Write-Host "Created:"
Write-Host "  deploy/local/api.env"
Write-Host "  deploy/local/bot.env"
Write-Host ""
Write-Host "1. Open api.env and replace BOT_TOKEN=PASTE_FROM_apps_bot_env"
Write-Host "2. Copy all vars to Railway API service"
Write-Host "3. Set API_URL in bot.env after Railway gives API domain"
Write-Host "4. Copy bot.env to Railway Bot service"
Write-Host ""

# Один файл для Railway (API + Bot в одному сервісі)
$allEnv = @"
# === Встав у Railway RAW Editor (ОДИН сервіс) ===
NODE_ENV=production
WEBAPP_URL=https://trade-app-bot.vercel.app
CORS_ORIGIN=https://trade-app-bot.vercel.app
DATABASE_URL=file:./prod.db
MARKET_DATA_MODE=platform
PLATFORM_SYNTHETIC_FALLBACK=true
BRIDGE_SECRET=$bridge
COLLECTOR_SECRET=$collector
INTERNAL_API_SECRET=$internal
ALLOW_RUNTIME_MODE_SWITCH=false
LOG_LEVEL=info
MIN_DEPOSIT_AMOUNT=100
ADMIN_EMAIL=admin@primetrade.bot
ADMIN_PASSWORD=$adminPass
TELEGRAM_ADMIN_IDS=7798035089
ADMIN_TELEGRAM_IDS=7798035089
BOT_TOKEN=PASTE_FROM_apps_bot_env
BOT_DISPLAY_NAME=PRIME TRADE BOT
POCKET_REFERRAL_URL=https://u2.shortink.io/register?utm_campaign=52397&utm_source=affiliate&utm_medium=sr&a=5ZcGv2M6DXidGG&ac=mercedescls&code=TUX812
DEPOSIT_URL=https://pocketoption.com/uk/cabinet/deposit-step-1
SUPPORT_URL=https://t.me/manager_primetrade
REVIEWS_URL=https://t.me/c/2014902155/544
WELCOME_IMAGE_URL=https://trade-app-bot.vercel.app/welcome-bot.png
REQUIRED_CHANNEL_ID=
REQUIRED_CHANNEL_URL=
"@

$allEnv | Set-Content (Join-Path $localDir 'railway-all.env') -Encoding UTF8
Write-Host "  deploy/local/railway-all.env  (ONE service — use this)"
