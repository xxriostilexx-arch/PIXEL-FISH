$ErrorActionPreference = 'Stop'

$envPath = Join-Path $PSScriptRoot '.env'
if (!(Test-Path -LiteralPath $envPath)) { throw 'Arquivo .env não encontrado.' }
$settings = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)=(.*)$') { $settings[$matches[1]] = $matches[2].Trim() }
}
if ([string]::IsNullOrWhiteSpace($settings['DATABASE_URL'])) { throw 'DATABASE_URL não está configurada.' }

$pgDump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if (!$pgDump) { throw 'pg_dump.exe não encontrado. Instale as ferramentas do PostgreSQL.' }

$backupDir = Join-Path $PSScriptRoot 'backups\postgresql'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$output = Join-Path $backupDir "pixelfish_$stamp.dump"

& $pgDump "--dbname=$($settings['DATABASE_URL'])" '--format=custom' '--compress=9' "--file=$output"
if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou com código $LASTEXITCODE." }

# Mantém 30 dias de backups locais. Não remove nada fora desta pasta.
$cutoff = (Get-Date).AddDays(-30)
Get-ChildItem -LiteralPath $backupDir -Filter 'pixelfish_*.dump' -File |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  Remove-Item -Force

Write-Host "Backup concluído: $output"
