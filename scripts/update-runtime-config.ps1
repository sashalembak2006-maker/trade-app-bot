param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$ApiUrl = $ApiUrl.TrimEnd('/')
$wsUrl = if ($ApiUrl -match '^https') { ($ApiUrl -replace '^https', 'wss') + '/ws' } else { ($ApiUrl -replace '^http', 'ws') + '/ws' }

$json = @{
  apiUrl = $ApiUrl
  wsUrl  = $wsUrl
} | ConvertTo-Json

$path = Join-Path $root 'apps\web\public\runtime-config.json'
$json | Set-Content $path -Encoding UTF8
Write-Host "Updated $path"
Write-Host $json
