#!/bin/bash

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install postgresql@14
        brew services start postgresql@14
    else
        # Linux
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        sudo service postgresql start
    fi
fi

# Create database and user
psql postgres <<EOF
CREATE DATABASE hubspot_dashboard;
CREATE USER hubspot_user WITH ENCRYPTED PASSWORD 'hubspot_password';
GRANT ALL PRIVILEGES ON DATABASE hubspot_dashboard TO hubspot_user;
\c hubspot_dashboard
GRANT ALL ON SCHEMA public TO hubspot_user;
EOF

# Update .env.local with database URL
echo "Updating .env.local with database URL..."
sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL="postgresql://hubspot_user:hubspot_password@localhost:5432/hubspot_dashboard"|' ../.env.local

# Initialize Prisma
echo "Initializing Prisma..."
cd ..
npx prisma generate
npx prisma db push

echo "Database setup complete!" 