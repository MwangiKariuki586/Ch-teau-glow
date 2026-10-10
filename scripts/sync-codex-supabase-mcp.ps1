$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"
$codexConfigPath = Join-Path $HOME ".codex\config.toml"

if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Project .env not found at $envPath"
}

if (-not (Test-Path -LiteralPath $codexConfigPath)) {
  throw "Codex config not found at $codexConfigPath"
}

$envContent = Get-Content -LiteralPath $envPath
$supabaseUrlLine = $envContent | Where-Object { $_ -match '^\s*NEXT_PUBLIC_SUPABASE_URL\s*=' } | Select-Object -First 1

if (-not $supabaseUrlLine) {
  throw "NEXT_PUBLIC_SUPABASE_URL is missing from $envPath"
}

$supabaseUrl = ($supabaseUrlLine -split '=', 2)[1].Trim().Trim("'`"")
if (-not $supabaseUrl) {
  throw "NEXT_PUBLIC_SUPABASE_URL is empty in $envPath"
}

$projectRef = [regex]::Match($supabaseUrl, 'https://([^.]+)\.supabase\.co').Groups[1].Value
if (-not $projectRef) {
  throw "Could not extract Supabase project ref from $supabaseUrl"
}

$configContent = Get-Content -LiteralPath $codexConfigPath -Raw
$replacement = 'url = "https://mcp.supabase.com/mcp?project_ref=' + $projectRef + '"'

if ($configContent -notmatch '(?m)^\[mcp_servers\.supabase\]') {
  $appendBlock = @"

[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp?project_ref=$projectRef"
bearer_token_env_var = "SUPABASE_ACCESS_TOKEN"
"@
  $configContent = $configContent.TrimEnd() + "`r`n" + $appendBlock + "`r`n"
} else {
  $configContent = [regex]::Replace(
    $configContent,
    '(?m)^url = "https://mcp\.supabase\.com/mcp\?project_ref=[^"]+"',
    $replacement,
    1
  )
}

Set-Content -LiteralPath $codexConfigPath -Value $configContent

Write-Host "Codex Supabase MCP project set to $projectRef"
Write-Host "Restart the Codex/Cursor MCP session to pick up the new target."
