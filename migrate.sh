#!/bin/bash

# Migration runner for SPL Stallions
# Usage: ./migrate.sh [up|down|status]

set -e

DATABASE_URL="${DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

COMMAND="${1:-up}"

case "$COMMAND" in
  up)
    echo "Running pending migrations..."
    
    # Get list of migration files
    for migration in migrations/*.sql; do
      if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")
        
        # Check if migration has been applied
        result=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name';" 2>/dev/null || echo "0")
        
        if [ "$result" -eq 0 ]; then
          echo "Applying migration: $migration_name"
          psql "$DATABASE_URL" -f "$migration"
          psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name');"
          echo "✓ $migration_name applied"
        else
          echo "⊘ $migration_name already applied"
        fi
      fi
    done
    
    echo "All migrations completed."
    ;;
    
  status)
    echo "Migration status:"
    psql "$DATABASE_URL" -c "SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at;"
    ;;
    
  *)
    echo "Usage: ./migrate.sh [up|status]"
    exit 1
    ;;
esac
