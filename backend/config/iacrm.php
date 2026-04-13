<?php

return [
    'http_sync' => [
        'enabled' => env('IACRM_HTTP_SYNC_ENABLED', true),
        'job_limit' => env('IACRM_HTTP_SYNC_JOB_LIMIT', 10),
        'push_interval_seconds' => env('IACRM_HTTP_SYNC_PUSH_INTERVAL_SECONDS', 5),
        'pull_interval_seconds' => env('IACRM_HTTP_SYNC_PULL_INTERVAL_SECONDS', 60),
        'lock_seconds' => env('IACRM_HTTP_SYNC_LOCK_SECONDS', 20),
    ],
];
