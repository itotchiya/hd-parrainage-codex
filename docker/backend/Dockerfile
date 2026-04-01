FROM composer:2 AS composer

FROM php:8.5-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libpq-dev libicu-dev libzip-dev \
    && docker-php-ext-install intl pcntl pdo_pgsql pgsql zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY docker/backend/start-backend.sh /opt/project/docker/backend/start-backend.sh
COPY docker/backend/start-worker.sh /opt/project/docker/backend/start-worker.sh
COPY docker/backend/start-scheduler.sh /opt/project/docker/backend/start-scheduler.sh

RUN chmod +x /opt/project/docker/backend/start-backend.sh \
    /opt/project/docker/backend/start-worker.sh \
    /opt/project/docker/backend/start-scheduler.sh
