# Migration runner for SPL Stallions (Windows PowerShell)
# Usage: .\migrate.ps1 -Command up|status

param(
  [string]$Command = "up"
)

node scripts/migrate.mjs $Command
exit $LASTEXITCODE
