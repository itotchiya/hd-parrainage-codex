<?php

namespace App\Services;

use App\Models\IacrmRequestLog;
use App\Models\SyncJob;

class IacrmRequestLogger
{
    /**
     * @param array<string, mixed> $attributes
     */
    public function log(array $attributes): IacrmRequestLog
    {
        return IacrmRequestLog::query()->create([
            'business_id' => $attributes['business_id'] ?? null,
            'initiated_by_user_id' => $attributes['initiated_by_user_id'] ?? null,
            'sync_job_id' => $attributes['sync_job_id'] ?? null,
            'actor_type' => $attributes['actor_type'],
            'source' => $attributes['source'],
            'direction' => $attributes['direction'],
            'method' => strtoupper((string) $attributes['method']),
            'endpoint' => $attributes['endpoint'],
            'status' => $attributes['status'],
            'status_code' => $attributes['status_code'] ?? null,
            'duration_ms' => $attributes['duration_ms'] ?? null,
            'error_message' => $attributes['error_message'] ?? null,
            'request_payload' => $attributes['request_payload'] ?? [],
            'response_payload' => $attributes['response_payload'] ?? [],
            'meta' => $attributes['meta'] ?? [],
            'requested_at' => $attributes['requested_at'] ?? now(),
        ]);
    }

    /**
     * @param array<string, mixed> $attributes
     */
    public function logSyncJob(SyncJob $job, array $attributes): IacrmRequestLog
    {
        return $this->log([
            'business_id' => $job->business_id,
            'initiated_by_user_id' => $job->initiated_by_user_id,
            'sync_job_id' => $job->id,
            'actor_type' => 'server',
            'source' => $job->job_type,
            ...$attributes,
        ]);
    }
}
