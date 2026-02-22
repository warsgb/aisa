#!/bin/bash

# Database Migration Runner
# This script runs the SQL migration files to update the database schema

set -e

# Load environment variables from .env file if it exists
if [ -f backend/.env ]; then
  export $(cat backend/.env | grep -v '^#' | xargs)
elif [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_DATABASE=${DB_DATABASE:-aisa}
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

echo "Running database migration..."
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_DATABASE"
echo ""

# Run the migration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE -f backend/migrations/add-system-config-tables.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ Database migration completed successfully!"
  echo ""
  echo "Next step: Run the initialization script to create default system configurations"
  echo "  node backend/init-system-config.js"
else
  echo ""
  echo "✗ Database migration failed!"
  exit 1
fi
