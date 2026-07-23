param(
  [int]$BackendPort = 8787,
  [string]$CloudflaredPath = "",
  [switch]$UpdateVercel,
  [switch]$DeployVercel
)

$ErrorActionPreference = "Stop"

function Resolve-Cloudflared {
  param([string]$RequestedPath)

  if ($RequestedPath -and (Test-Path $RequestedPath)) {
    return (Resolve-Path $RequestedPath).Path
  }

  $fromPath = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  $commonPaths = @(
    "C:\Cloudflared\bin\cloudflared.exe",
    "$env:ProgramFiles\cloudflared\cloudflared.exe",
    "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
    "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"
  )

  foreach ($path in $commonPaths) {
    if ($path -and (Test-Path $path)) {
      return $path
    }
  }

  throw "cloudflared.exe was not found. Install it or pass -CloudflaredPath C:\path\to\cloudflared.exe"
}

function Invoke-Vercel {
  param([string[]]$Arguments)

  & npx.cmd vercel @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Vercel command failed: npx.cmd vercel $($Arguments -join ' ')"
  }
}

function Get-LogText {
  param([string[]]$Paths)

  $content = Get-Content $Paths -ErrorAction SilentlyContinue
  if (!$content) {
    return "(no log output)"
  }
  return ($content | Select-Object -Last 120) -join [Environment]::NewLine
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendUrl = "http://127.0.0.1:$BackendPort"
$cloudflared = Resolve-Cloudflared $CloudflaredPath

Write-Host "Starting AQMA backend on $backendUrl..."
$apiOut = Join-Path $repoRoot "api-local.log"
$apiErr = Join-Path $repoRoot "api-local.err.log"
Remove-Item $apiOut, $apiErr -ErrorAction SilentlyContinue
$apiProcess = Start-Process `
  -FilePath npm.cmd `
  -ArgumentList @("run", "dev:api") `
  -WorkingDirectory $repoRoot `
  -RedirectStandardOutput $apiOut `
  -RedirectStandardError $apiErr `
  -WindowStyle Hidden `
  -PassThru

try {
  $deadline = (Get-Date).AddSeconds(30)
  $healthy = $false
  do {
    if ($apiProcess.HasExited) {
      $log = Get-LogText @($apiOut, $apiErr)
      throw "Backend exited before /api/health became available. Exit code: $($apiProcess.ExitCode)`n$log"
    }

    try {
      Invoke-RestMethod "$backendUrl/api/health" | Out-Null
      $healthy = $true
      break
    } catch {
      Start-Sleep -Seconds 1
    }
  } while ((Get-Date) -lt $deadline)

  if (!$healthy) {
    $log = Get-LogText @($apiOut, $apiErr)
    throw "Backend health check failed at $backendUrl/api/health after 30 seconds.`n$log"
  }

  Write-Host "Starting Cloudflare tunnel..."
  $tunnelOut = Join-Path $env:TEMP "aqma-cloudflared-out.log"
  $tunnelErr = Join-Path $env:TEMP "aqma-cloudflared-err.log"
  Remove-Item $tunnelOut, $tunnelErr -ErrorAction SilentlyContinue

  $tunnelProcess = Start-Process `
    -FilePath $cloudflared `
    -ArgumentList @("tunnel", "--url", $backendUrl) `
    -RedirectStandardOutput $tunnelOut `
    -RedirectStandardError $tunnelErr `
    -WindowStyle Hidden `
    -PassThru

  $tunnelUrl = $null
  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    if ($tunnelProcess.HasExited) {
      $log = (Get-Content $tunnelOut, $tunnelErr -ErrorAction SilentlyContinue) -join [Environment]::NewLine
      throw "cloudflared exited before creating a tunnel URL.`n$log"
    }

    $logText = (Get-Content $tunnelOut, $tunnelErr -ErrorAction SilentlyContinue) -join [Environment]::NewLine
    $match = [regex]::Match($logText, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($match.Success) {
      $tunnelUrl = $match.Value
      break
    }
    Start-Sleep -Seconds 2
  }

  if (!$tunnelUrl) {
    throw "Timed out waiting for a trycloudflare.com URL."
  }

  Write-Host "Backend: $backendUrl"
  Write-Host "Tunnel:  $tunnelUrl"
  Write-Host "API PID: $($apiProcess.Id)"
  Write-Host "Tunnel PID: $($tunnelProcess.Id)"

  if ($UpdateVercel) {
    foreach ($environment in @("production", "preview", "development")) {
      Write-Host "Setting VITE_AUTH_API_URL for $environment..."
      Invoke-Vercel @("env", "add", "VITE_AUTH_API_URL", $environment, "--value", $tunnelUrl, "--force", "--yes")
    }

    Write-Host "Setting backend cookie mode for Cloudflare tunnel..."
    Invoke-Vercel @("env", "add", "SESSION_COOKIE_SAMESITE", "production", "--value", "None", "--force", "--yes")
    Invoke-Vercel @("env", "add", "SESSION_COOKIE_SECURE", "production", "--value", "true", "--force", "--yes")
  }

  if ($DeployVercel) {
    Write-Host "Deploying frontend to Vercel production..."
    Invoke-Vercel @("--prod", "--yes")
  }

  Write-Host ""
  Write-Host "Keep this PowerShell window open. Press Ctrl+C to stop the backend and tunnel."
  Wait-Process -Id $tunnelProcess.Id
} finally {
  if ($tunnelProcess -and !$tunnelProcess.HasExited) {
    Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if ($apiProcess -and !$apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
  }
}
