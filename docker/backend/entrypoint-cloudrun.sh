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

# Optional one-off bootstrap (safe if packages already discovered)
rm -f bootstrap/cache/packages.php bootstrap/cache/services.php
php artisan package:discover --ansi --force 2>/dev/null || true

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  php artisan migrate --force
fi

exec php artisan serve --host=0.0.0.0 --port="$PORT"
