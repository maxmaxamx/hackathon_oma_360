#!/bin/sh
set -e

mkdir -p /app/data /app/public/generated

echo "Applying database schema..."
./node_modules/.bin/prisma db push --skip-generate

echo "Seeding demo foremen (only if the database is empty)..."
node prisma/seed.mjs --if-empty

echo "Starting OMA 360 on ${HOSTNAME}:${PORT}..."
exec npm start
