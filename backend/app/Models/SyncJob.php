<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncJob extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'business_id',
        'initiated_by_user_id',
        'job_type',
        'entity_type',
        'entity_id',
        'queue_name',
        'status',
        'attempt_count',
        'max_attempts',
        'idempotency_key',
        'failure_code',
        'failure_message',
        'payload',
        'response_payload',
        'queued_at',
        'started_at',
        'finished_at',
        'failed_at',
        'dead_lettered_at',
        'next_retry_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'response_payload' => 'array',
            'queued_at' => 'datetime',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'failed_at' => 'datetime',
            'dead_lettered_at' => 'datetime',
            'next_retry_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function initiatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by_user_id');
    }
}
