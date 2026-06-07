# PRIME TRADE BOT — максимально автоматичний деплой на Railway
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/railway-one-click.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "=== PRIME TRADE BOT — Railway deploy ===" -ForegroundColor Cyan
Write-Host ""

# 1. Локальні env-файли
if (-not (Test-Path "$root\deploy\local\api.env")) {
  & "$root\scripts\write-production-env.ps1"
}

$apiEnvPath = "$root\deploy\local\api.env"
$botEnvPath = "$root\deploy\local\bot.env"

# Підставити BOT_TOKEN з apps/bot/.env якщо ще PASTE
$botLocal = "$root\apps\bot\.env"
if (Test-Path $botLocal) {
  $tokenLine = Get-Content $botLocal | Where-Object { $_ -match '^BOT_TOKEN=' } | Select-Object -First 1
  if ($tokenLine) {
    foreach ($f in @($apiEnvPath, $botEnvPath)) {
      if (Test-Path $f) {
        (Get-Content $f -Raw) -replace 'BOT_TOKEN=PASTE_FROM_apps_bot_env', $tokenLine | Set-Content $f -NoNewline
      }
    }
  }
}

# 2. Railway CLI
$railway = "npx"
$railwayArgs = @("@railway/cli")

Write-Host "Перевірка Railway CLI..." -ForegroundColor Yellow
$whoami = & $railway @($railwayArgs + @("whoami")) 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Треба один раз увійти в Railway у браузері:" -ForegroundColor Red
  Write-Host "  npx @railway/cli login" -ForegroundColor White
  Write-Host ""
  Write-Host "Після входу запусти цей скрипт знову." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "АБО встав змінні вручну (2 хв):" -ForegroundColor Yellow
  Write-Host "  1. Railway -> @trade-app/api -> Variables -> RAW Editor" -ForegroundColor White
  Write-Host "  2. Скопіюй вміст: deploy\local\api.env" -ForegroundColor White
  Write-Host "  3. api -> Settings -> RAILWAY_DOCKERFILE_TARGET = api" -ForegroundColor White
  Write-Host "  4. api -> Networking -> Generate Domain" -ForegroundColor White
  Write-Host "  5. bot -> Variables з deploy\local\bot.env + API_URL = домен api" -ForegroundColor White
  Write-Host "  6. bot -> RAILWAY_DOCKERFILE_TARGET = bot" -ForegroundColor White
  Write-Host "  7. Видали сервіси web і collector (не потрібні)" -ForegroundColor White
  Write-Host "  8. Deploy" -ForegroundColor White
  exit 1
}

Write-Host "Залогінено: $whoami" -ForegroundColor Green

# 3. Link project (якщо ще не)
if (-not (Test-Path "$root\.railway")) {
  Write-Host "Прив'язка проєкту (обери rare-rebirth у терміналі)..." -ForegroundColor Yellow
  Push-Location $root
  & $railway @($railwayArgs + @("link"))
  Pop-Location
}

function Import-RailwayEnv([string]$serviceName, [string]$envFile) {
  Write-Host "Змінні для $serviceName ..." -ForegroundColor Yellow
  Push-Location $root
  & $railway @($railwayArgs + @("link", "--service", $serviceName)) 2>$null
  $lines = Get-Content $envFile | Where-Object {
    $_ -and $_ -notmatch '^\s*#' -and $_ -match '='
  }
  foreach ($line in $lines) {
    $name, $value = $line -split '=', 2
    $name = $name.Trim()
    $value = $value.Trim().Trim('"')
    if ($name) {
      & $railway @($railwayArgs + @("variables", "set", "${name}=${value}", "--skip-deploys")) | Out-Null
    }
  }
  & $railway @($railwayArgs + @("variables", "set", "RAILWAY_DOCKERFILE_TARGET=$($serviceName -replace '@trade-app/','')", "--skip-deploys")) | Out-Null
  Pop-Location
}

Import-RailwayEnv "@trade-app/api" $apiEnvPath
Import-RailwayEnv "@trade-app/bot" $botEnvPath

Write-Host ""
Write-Host "Деплой API..." -ForegroundColor Cyan
Push-Location $root
& $railway @($railwayArgs + @("up", "--service", "@trade-app/api", "--detach"))
Pop-Location

Write-Host ""
Write-Host "Готово! Далі:" -ForegroundColor Green
Write-Host "  1. Railway -> api -> Networking -> Generate Domain" -ForegroundColor White
Write-Host "  2. Запусти: scripts\update-runtime-config.ps1 -ApiUrl https://ТВІЙ-URL.up.railway.app" -ForegroundColor White
Write-Host "  3. git push (оновить Vercel Mini App)" -ForegroundColor White
Write-Host ""
