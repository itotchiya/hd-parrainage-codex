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

while true; do
  php artisan schedule:run --verbose --no-interaction
  sleep 60
done
