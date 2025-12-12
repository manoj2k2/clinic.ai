#!/bin/bash
set -e

echo "Running migrations..."
for file in /migrations/*.sql; do
  if [ -f "$file" ]; then
    echo "Applying migration: $file"
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$file"
  fi
done
echo "Migrations completed."
