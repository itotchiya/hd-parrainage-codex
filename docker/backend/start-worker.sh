#!/bin/sh
set -eu

cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ ! -f vendor/autoload.php ]; then
  until [ -f vendor/autoload.php ]; do
    sleep 2
  done
fi

exec php artisan queue:work --tries=3 --timeout=120
