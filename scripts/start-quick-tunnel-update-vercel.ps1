param(
  [string]$CloudflaredPath = "C:\Cloudflared\bin\cloudflared.exe",
  [string]$BackendUrl = "http://127.0.0.1:8787",
  [string]$EnvName = "VITE_AUTH_API_URL",
  [string[]]$VercelEnvironments = @("production", "preview", "development"),
  [string]$VercelToken = "",
  [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"

function Invoke-Vercel {
  param([string[]]$Arguments)

  $allArgs = @("vercel") + $Arguments
  if ($VercelToken) {
    $allArgs += @("--token", $VercelToken)
  }

  & npx.cmd @allArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Vercel command failed: npx.cmd $($allArgs -join ' ')"
  }
}

if (!(Test-Path $CloudflaredPath)) {
  throw "cloudflared was not found at: $CloudflaredPath"
}

try {
  Invoke-RestMethod "$BackendUrl/api/health" | Out-Null
} catch {
  throw "Backend health check failed at $BackendUrl/api/health. Start the API first with: npm run dev:api"
}

if (!(Test-Path ".vercel\project.json")) {
  New-Item -ItemType Directory -Force ".vercel" | Out-Null
  '{"projectId":"prj_xM8a8KNxeOlAp6CEhBFbvlz1ZCpp","orgId":"team_Rf2LBhvG6PLsoXOcT8PJc6Yk","projectName":"aqma-board"}' |
    Set-Content ".vercel\project.json" -Encoding UTF8
  Write-Host "Created .vercel\project.json for aqma-board."
}

Write-Host "Checking Vercel access..."
Invoke-Vercel @("whoami") | Out-Null

$stdoutPath = Join-Path $env:TEMP "aqma-cloudflared-out.log"
$stderrPath = Join-Path $env:TEMP "aqma-cloudflared-err.log"
Remove-Item $stdoutPath, $stderrPath -ErrorAction SilentlyContinue

Write-Host "Starting Cloudflare quick tunnel for $BackendUrl..."
$process = Start-Process `
  -FilePath $CloudflaredPath `
  -ArgumentList @("tunnel", "--url", $BackendUrl) `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath `
  -WindowStyle Hidden `
  -PassThru

$tunnelUrl = $null
$deadline = (Get-Date).AddSeconds(120)

while ((Get-Date) -lt $deadline) {
  if ($process.HasExited) {
    $log = (Get-Content $stdoutPath, $stderrPath -ErrorAction SilentlyContinue) -join [Environment]::NewLine
    throw "cloudflared exited before a tunnel URL was created.`n$log"
  }

  $logText = (Get-Content $stdoutPath, $stderrPath -ErrorAction SilentlyContinue) -join [Environment]::NewLine
  $match = [regex]::Match($logText, "https://[a-z0-9-]+\.trycloudflare\.com")
  if ($match.Success) {
    $tunnelUrl = $match.Value
    break
  }

  Start-Sleep -Seconds 2
}

if (!$tunnelUrl) {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  throw "Timed out waiting for a trycloudflare.com URL."
}

Write-Host "Tunnel URL: $tunnelUrl"
Write-Host "Updating Vercel environment variable $EnvName..."

foreach ($environment in $VercelEnvironments) {
  Write-Host "Setting $environment..."
  Invoke-Vercel @(
    "env", "add", $EnvName, $environment,
    "--value", $tunnelUrl,
    "--force",
    "--yes"
  )
}

if (!$SkipDeploy) {
  Write-Host "Redeploying production so Vite uses the new API URL..."
  Invoke-Vercel @("--prod", "--yes")
}

Write-Host ""
Write-Host "Done. Keep this PowerShell window open."
Write-Host "Current API tunnel: $tunnelUrl"
Write-Host "Cloudflared process id: $($process.Id)"
Write-Host "Press Ctrl+C to stop this script and then stop the tunnel process if needed."

try {
  Wait-Process -Id $process.Id
} finally {
  if (!$process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }
}
