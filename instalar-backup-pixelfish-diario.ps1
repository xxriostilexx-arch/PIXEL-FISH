$ErrorActionPreference = 'Stop'
$taskName = 'Pixel Fish - Backup PostgreSQL Diário'
$scriptPath = Join-Path $PSScriptRoot 'backup-pixelfish-postgres.ps1'
if (!(Test-Path -LiteralPath $scriptPath)) { throw 'Script de backup não encontrado.' }

$action = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At 03:15AM
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description 'Backup diário do banco PostgreSQL do Pixel Fish; retenção local de 30 dias.' -Force | Out-Null
Write-Host "Tarefa '$taskName' instalada para 03:15 todos os dias."
