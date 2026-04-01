#!/bin/sh
set -eu

cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
fi

upsert_env_var() {
  key="$1"
  value="$2"

  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

upsert_env_var "APP_URL" "${APP_URL:-http://localhost:8081}"
upsert_env_var "DB_CONNECTION" "${DB_CONNECTION:-pgsql}"
upsert_env_var "DB_HOST" "${DB_HOST:-postgres}"
upsert_env_var "DB_PORT" "${DB_PORT:-5432}"
upsert_env_var "DB_DATABASE" "${DB_DATABASE:-hd_parrainage_dev}"
upsert_env_var "DB_USERNAME" "${DB_USERNAME:-hd_parrainage}"
upsert_env_var "DB_PASSWORD" "${DB_PASSWORD:-hd_parrainage_local}"
upsert_env_var "QUEUE_CONNECTION" "${QUEUE_CONNECTION:-redis}"
upsert_env_var "CACHE_STORE" "${CACHE_STORE:-redis}"
upsert_env_var "REDIS_HOST" "${REDIS_HOST:-redis}"
upsert_env_var "REDIS_PORT" "${REDIS_PORT:-6379}"
upsert_env_var "SESSION_DRIVER" "${SESSION_DRIVER:-database}"
upsert_env_var "SESSION_DOMAIN" "${SESSION_DOMAIN:-}"
upsert_env_var "SANCTUM_STATEFUL_DOMAINS" "${SANCTUM_STATEFUL_DOMAINS:-localhost:5175,127.0.0.1:5175,localhost:8081,127.0.0.1:8081}"
upsert_env_var "CORS_ALLOWED_ORIGINS" "${CORS_ALLOWED_ORIGINS:-http://localhost:5175,http://127.0.0.1:5175}"
upsert_env_var "FRONTEND_URL" "${FRONTEND_URL:-http://localhost:5175}"

if [ ! -f vendor/autoload.php ]; then
  rm -rf vendor/*
  composer install --no-interaction --prefer-dist
fi

if ! grep -q '^APP_KEY=base64:' .env; then
  php artisan key:generate --force
fi

php artisan migrate --force

exec php artisan serve --host=0.0.0.0 --port=8000
