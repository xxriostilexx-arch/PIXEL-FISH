param(
  [Parameter(Mandatory=$true)][ValidateSet('listar','confirmar','rejeitar','corrigir-hash','reabrir')][string]$Acao,
  [string]$Id,
  [string]$TxHash,
  [string]$ApiBase = 'https://api.pixelfish.app'
)

$envPath = Join-Path $PSScriptRoot '.env'
if (!(Test-Path -LiteralPath $envPath)) { throw 'Arquivo .env não encontrado.' }

$settings = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)=(.*)$') { $settings[$matches[1]] = $matches[2].Trim() }
}

$adminKey = $settings['ADMIN_REVIEW_KEY']
if ([string]::IsNullOrWhiteSpace($adminKey) -or $adminKey -like 'replace_*') {
  throw 'Defina ADMIN_REVIEW_KEY no .env antes de usar este comando.'
}

$headers = @{ 'x-admin-key' = $adminKey }
$ApiBase = $ApiBase.TrimEnd('/')

switch ($Acao) {
  'listar' {
    $result = Invoke-RestMethod -Uri "$ApiBase/admin/withdrawals" -Headers $headers -Method Get -ErrorAction Stop
    if (!$result.withdrawals -or $result.withdrawals.Count -eq 0) { Write-Host 'Não há saques pendentes.'; break }
    $result.withdrawals | Select-Object id, playerId, cash, feeCash, netCash, usdAmount, tonAmount, destination, createdAt | Format-List
  }
  'confirmar' {
    if ([string]::IsNullOrWhiteSpace($Id) -or [string]::IsNullOrWhiteSpace($TxHash)) { throw 'Uso: .\gerenciar-saques.ps1 confirmar ID HASH_DA_TRANSACAO' }
    $body = @{ txHash = $TxHash } | ConvertTo-Json
    Invoke-RestMethod -Uri "$ApiBase/admin/withdrawals/$Id/confirm" -Headers $headers -ContentType 'application/json' -Method Post -Body $body -ErrorAction Stop | ConvertTo-Json -Depth 6
  }
  'rejeitar' {
    if ([string]::IsNullOrWhiteSpace($Id)) { throw 'Uso: .\gerenciar-saques.ps1 rejeitar ID' }
    Invoke-RestMethod -Uri "$ApiBase/admin/withdrawals/$Id/reject" -Headers $headers -Method Post -ErrorAction Stop | ConvertTo-Json -Depth 6
  }
  'corrigir-hash' {
    if ([string]::IsNullOrWhiteSpace($Id) -or [string]::IsNullOrWhiteSpace($TxHash)) { throw 'Uso: .\gerenciar-saques.ps1 corrigir-hash ID HASH_REAL_DA_TRANSACAO' }
    $body = @{ txHash = $TxHash } | ConvertTo-Json
    Invoke-RestMethod -Uri "$ApiBase/admin/withdrawals/$Id/correct-hash" -Headers $headers -ContentType 'application/json' -Method Post -Body $body -ErrorAction Stop | ConvertTo-Json -Depth 6
  }
  'reabrir' {
    if ([string]::IsNullOrWhiteSpace($Id)) { throw 'Uso: .\gerenciar-saques.ps1 reabrir ID' }
    Invoke-RestMethod -Uri "$ApiBase/admin/withdrawals/$Id/reopen" -Headers $headers -Method Post -ErrorAction Stop | ConvertTo-Json -Depth 6
  }
}
