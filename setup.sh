#!/bin/bash

# Listo Setup Script
# Run this after authenticating with: npx wrangler login

set -e

echo "🎯 Setting up Listo..."
echo ""

# Step 1: Create D1 database
echo "1️⃣  Creating D1 database..."
DB_OUTPUT=$(npx wrangler d1 create listo-db)
echo "$DB_OUTPUT"

# Extract database_id from output
DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | cut -d'"' -f4)

if [ -z "$DB_ID" ]; then
    echo "❌ Failed to create database or extract database_id"
    exit 1
fi

echo "✅ Database created with ID: $DB_ID"
echo ""

# Step 2: Update wrangler.toml
echo "2️⃣  Updating wrangler.toml with database_id..."
sed -i.bak "s/database_id = \"PLACEHOLDER_DB_ID\"/database_id = \"$DB_ID\"/" wrangler.toml
rm wrangler.toml.bak
echo "✅ wrangler.toml updated"
echo ""

# Step 3: Initialize schema locally
echo "3️⃣  Initializing local database schema..."
npx wrangler d1 execute listo-db --local --file=./schema.sql
echo "✅ Local schema initialized"
echo ""

# Step 4: Initialize schema remotely
echo "4️⃣  Initializing remote database schema..."
npx wrangler d1 execute listo-db --remote --file=./schema.sql
echo "✅ Remote schema initialized"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add your TMDB API key to wrangler.toml (optional)"
echo "  2. Run 'npm run dev' to start the development server"
echo ""
