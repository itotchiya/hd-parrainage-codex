#!/bin/sh
set -eu

cd /var/www/html

PORT="${PORT:-8080}"
export PORT

# Cloud Run injects env vars; Laravel reads them without requiring a .env file.
if [ -z "${APP_KEY:-}" ]; then
  echo "ERROR: APP_KEY must be set (use Secret Manager or Cloud Run env)." >&2
  exit 1
fi

if [ "${APP_ENV:-production}" = "production" ] && [ -z "${DB_CONNECTION:-}" ]; then
  echo "ERROR: DB_CONNECTION must be set to pgsql in Cloud Run; production must not fall back to SQLite." >&2
  exit 1
fi

if [ "${APP_ENV:-production}" = "production" ] && [ "${DB_HOST:-}" = "postgres" ]; then
  echo "ERROR: DB_HOST is set to the local Docker hostname 'postgres'. Cloud Run needs the hosted PostgreSQL or Cloud SQL host." >&2
  exit 1
fi

# Optional one-off bootstrap (safe if packages already discovered)
rm -f bootstrap/cache/packages.php bootstrap/cache/services.php
php artisan package:discover --ansi 2>/dev/null || true

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  php artisan migrate --force
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  php artisan db:seed --force
fi

exec php artisan serve --host=0.0.0.0 --port="$PORT"
