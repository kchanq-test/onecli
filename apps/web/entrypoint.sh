#!/bin/sh
set -e

PRISMA="node /app/packages/db/node_modules/prisma/build/index.js"
SCHEMA="--schema /app/packages/db/prisma/schema.prisma"

if [ -n "$DATABASE_URL" ]; then
  echo "External database detected, running Prisma migrations..."
  if ! $PRISMA migrate deploy $SCHEMA 2>&1; then
    echo "migrate deploy failed — bootstrapping baseline migration..."
    $PRISMA migrate resolve --applied 0_init $SCHEMA
    $PRISMA migrate deploy $SCHEMA
  fi
else
  echo "No DATABASE_URL set, initializing embedded PGlite database..."
  node /app/packages/db/scripts/init-dev-db.ts
fi

# Start Next.js
exec node apps/web/server.js
