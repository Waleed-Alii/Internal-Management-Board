param(
  [string]$ServiceName = "AQMABoardBackendTunnel",
  [string]$NssmPath = ""
)

$ErrorActionPreference = "Stop"

function Resolve-Nssm {
  param([string]$RequestedPath)

  if ($RequestedPath -and (Test-Path $RequestedPath)) {
    return (Resolve-Path $RequestedPath).Path
  }

  $fromPath = Get-Command nssm.exe -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  $commonPaths = @(
    "C:\nssm\nssm.exe",
    "C:\nssm\win64\nssm.exe",
    "$env:ProgramFiles\nssm\nssm.exe",
    "${env:ProgramFiles(x86)}\nssm\nssm.exe"
  )

  foreach ($path in $commonPaths) {
    if ($path -and (Test-Path $path)) {
      return $path
    }
  }

  throw "nssm.exe was not found. Pass -NssmPath C:\path\to\nssm.exe"
}

$nssm = Resolve-Nssm $NssmPath

if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
  & $nssm stop $ServiceName 2>$null | Out-Null
  & $nssm remove $ServiceName confirm | Out-Null
  Write-Host "Removed Windows service: $ServiceName"
} else {
  Write-Host "Service not found: $ServiceName"
}
