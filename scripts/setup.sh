#!/bin/bash

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Create admin user
echo "Creating admin user..."
npm run create-admin

echo "Setup complete! You can now start the application with:"
echo "npm run dev" 