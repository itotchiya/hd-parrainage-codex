<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IacrmRequestLog extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'business_id',
        'initiated_by_user_id',
        'sync_job_id',
        'actor_type',
        'source',
        'direction',
        'method',
        'endpoint',
        'status',
        'status_code',
        'duration_ms',
        'error_message',
        'request_payload',
        'response_payload',
        'meta',
        'requested_at',
    ];

    protected function casts(): array
    {
        return [
            'request_payload' => 'array',
            'response_payload' => 'array',
            'meta' => 'array',
            'requested_at' => 'datetime',
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

    public function syncJob(): BelongsTo
    {
        return $this->belongsTo(SyncJob::class);
    }
}
