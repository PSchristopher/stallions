@echo off
REM Migration runner for SPL Stallions (Windows PowerShell)
REM Usage: migrate.ps1 -Command up|status

param(
  [string]$Command = "up"
)

$DatabaseUrl = $env:DATABASE_URL

if ([string]::IsNullOrEmpty($DatabaseUrl)) {
  Write-Host "Error: DATABASE_URL environment variable is not set" -ForegroundColor Red
  exit 1
}

switch ($Command) {
  "up" {
    Write-Host "Running pending migrations..." -ForegroundColor Cyan
    
    $migrations = Get-ChildItem -Path "migrations\*.sql" | Sort-Object Name
    
    foreach ($migration in $migrations) {
      $migrationName = $migration.Name
      
      # Check if migration has been applied
      $checkCmd = "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migrationName';"
      
      try {
        $result = psql "$DatabaseUrl" -t -c $checkCmd 2>$null
        $count = [int]$result
      } catch {
        $count = 0
      }
      
      if ($count -eq 0) {
        Write-Host "Applying migration: $migrationName" -ForegroundColor Yellow
        psql "$DatabaseUrl" -f $migration.FullName
        psql "$DatabaseUrl" -c "INSERT INTO schema_migrations (migration_name) VALUES ('$migrationName');"
        Write-Host "✓ $migrationName applied" -ForegroundColor Green
      } else {
        Write-Host "⊘ $migrationName already applied" -ForegroundColor Gray
      }
    }
    
    Write-Host "All migrations completed." -ForegroundColor Green
  }
  
  "status" {
    Write-Host "Migration status:" -ForegroundColor Cyan
    psql "$DatabaseUrl" -c "SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at;"
  }
  
  default {
    Write-Host "Usage: migrate.ps1 -Command up|status" -ForegroundColor Yellow
    exit 1
  }
}
