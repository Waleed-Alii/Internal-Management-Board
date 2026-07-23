param(
  [string]$TaskName = "AQMA Board Backend Tunnel",
  [string]$CloudflaredPath = "",
  [switch]$AtStartup,
  [switch]$UpdateVercel,
  [switch]$DeployVercel
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$runnerScript = Join-Path $repoRoot "scripts\start-backend-and-cloudflare.ps1"

if (!(Test-Path $runnerScript)) {
  throw "Runner script not found: $runnerScript"
}

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

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument ($arguments -join " ") `
  -WorkingDirectory $repoRoot

$trigger = if ($AtStartup) {
  New-ScheduledTaskTrigger -AtStartup
} else {
  New-ScheduledTaskTrigger -AtLogOn
}

$principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive `
  -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Days 365) `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Starts AQMA Board backend and Cloudflare tunnel." `
  -Force | Out-Null

Write-Host "Installed scheduled task: $TaskName"
Write-Host "Mode: $(if ($AtStartup) { 'At startup' } else { 'At logon' })"
Write-Host "Repository: $repoRoot"
Write-Host ""
Write-Host "Start it now with:"
Write-Host "Start-ScheduledTask -TaskName `"$TaskName`""
Write-Host ""
Write-Host "View status with:"
Write-Host "Get-ScheduledTask -TaskName `"$TaskName`" | Get-ScheduledTaskInfo"
