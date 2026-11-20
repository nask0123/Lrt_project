$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { $null }
$candidates = @(
    (Join-Path $env:ProgramFiles 'nodejs/node.exe'),
    (Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
)
if (!$nodePath) {
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) { $nodePath = $candidate; break }
    }
}
if (!$nodePath) {
    Write-Host 'Node.js not found. Install Windows Installer (.msi), LTS: https://nodejs.org/en/download'
    Read-Host 'Press Enter to exit'
    exit 1
}
Write-Host "Node.js: $nodePath"
Write-Host 'Open http://127.0.0.1:5173 in your browser. Keep this window open. Ctrl+C stops the server.'
& $nodePath (Join-Path $PSScriptRoot 'server.mjs')
