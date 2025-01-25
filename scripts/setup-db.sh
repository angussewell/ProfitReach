#!/bin/bash

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
  echo "PostgreSQL is not running. Please start PostgreSQL first."
  exit 1
fi

# Create database and user
psql postgres << EOF
CREATE DATABASE profitreach;
CREATE USER profitreach_user WITH ENCRYPTED PASSWORD 'profitreach_password';
GRANT ALL PRIVILEGES ON DATABASE profitreach TO profitreach_user;
\c profitreach
GRANT ALL ON SCHEMA public TO profitreach_user;
EOF

# Update .env.local with new database URL
sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL="postgresql://profitreach_user:profitreach_password@localhost:5432/profitreach"|' ../.env.local

echo "Database setup complete!" 