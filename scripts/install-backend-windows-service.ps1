param(
  [string]$ServiceName = "AQMABoardBackendTunnel",
  [string]$DisplayName = "AQMA Board Backend Tunnel",
  [string]$NssmPath = "",
  [string]$CloudflaredPath = "",
  [string]$VercelToken = "",
  [switch]$UpdateVercel,
  [switch]$DeployVercel
)

$ErrorActionPreference = "Stop"

function Resolve-Executable {
  param(
    [string]$RequestedPath,
    [string]$CommandName,
    [string[]]$CommonPaths,
    [string]$InstallHint
  )

  if ($RequestedPath -and (Test-Path $RequestedPath)) {
    return (Resolve-Path $RequestedPath).Path
  }

  $fromPath = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  foreach ($path in $CommonPaths) {
    if ($path -and (Test-Path $path)) {
      return $path
    }
  }

  throw "$CommandName was not found. $InstallHint"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$runnerScript = Join-Path $repoRoot "scripts\start-backend-and-cloudflare.ps1"
if (!(Test-Path $runnerScript)) {
  throw "Runner script not found: $runnerScript"
}

$nssm = Resolve-Executable `
  -RequestedPath $NssmPath `
  -CommandName "nssm.exe" `
  -CommonPaths @(
    "C:\nssm\nssm.exe",
    "C:\nssm\win64\nssm.exe",
    "$env:ProgramFiles\nssm\nssm.exe",
    "${env:ProgramFiles(x86)}\nssm\nssm.exe"
  ) `
  -InstallHint "Install NSSM or pass -NssmPath C:\path\to\nssm.exe"

$arguments = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$runnerScript`""
)

if ($CloudflaredPath) {
  $arguments += @("-CloudflaredPath", "`"$CloudflaredPath`"")
}
if ($UpdateVercel) {
  $arguments += "-UpdateVercel"
}
if ($DeployVercel) {
  $arguments += "-DeployVercel"
}
if ($VercelToken) {
  $arguments += @("-VercelToken", "`"$VercelToken`"")
}

$stdoutPath = Join-Path $repoRoot "backend-service.log"
$stderrPath = Join-Path $repoRoot "backend-service.err.log"

& $nssm stop $ServiceName 2>$null | Out-Null
& $nssm remove $ServiceName confirm 2>$null | Out-Null

& $nssm install $ServiceName "powershell.exe" ($arguments -join " ")
if ($LASTEXITCODE -ne 0) {
  throw "Failed to install service with NSSM."
}

& $nssm set $ServiceName DisplayName $DisplayName | Out-Null
& $nssm set $ServiceName Description "Runs AQMA Board backend API and Cloudflare tunnel." | Out-Null
& $nssm set $ServiceName AppDirectory $repoRoot | Out-Null
& $nssm set $ServiceName AppStdout $stdoutPath | Out-Null
& $nssm set $ServiceName AppStderr $stderrPath | Out-Null
& $nssm set $ServiceName AppRotateFiles 1 | Out-Null
& $nssm set $ServiceName AppRotateOnline 1 | Out-Null
& $nssm set $ServiceName AppRotateBytes 10485760 | Out-Null
& $nssm set $ServiceName Start SERVICE_AUTO_START | Out-Null
& $nssm set $ServiceName AppThrottle 1500 | Out-Null
& $nssm set $ServiceName AppExit Default Restart | Out-Null

Write-Host "Installed Windows service: $ServiceName"
Write-Host "Display name: $DisplayName"
Write-Host "Repository: $repoRoot"
Write-Host "Stdout log: $stdoutPath"
Write-Host "Stderr log: $stderrPath"
Write-Host ""
Write-Host "Start it now:"
Write-Host "Start-Service $ServiceName"
Write-Host ""
Write-Host "Check status:"
Write-Host "Get-Service $ServiceName"
Write-Host ""
Write-Host "Stop it:"
Write-Host "Stop-Service $ServiceName"
