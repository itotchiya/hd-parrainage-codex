<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Prospect extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'business_id',
        'program_id',
        'agent_id',
        'submitted_by_user_id',
        'contact_name',
        'contact_email',
        'contact_phone_raw',
        'contact_phone_e164',
        'company_name',
        'submission_status',
        'pipeline_stage',
        'progression_status',
        'conversion_status',
        'iacrm_prospect_id',
        'iacrm_status_code',
        'iacrm_status_label',
        'last_synced_at',
        'sync_error_message',
        'source',
        'submitted_at',
        'first_synced_at',
        'pipeline_stage_changed_at',
        'conversion_locked_at',
        'converted_at',
        'lost_at',
        'soft_deleted_by_user_id',
        'soft_delete_reason',
        'raw_iacrm_payload',
    ];

    protected function casts(): array
    {
        return [
            'last_synced_at' => 'datetime',
            'submitted_at' => 'datetime',
            'first_synced_at' => 'datetime',
            'pipeline_stage_changed_at' => 'datetime',
            'conversion_locked_at' => 'datetime',
            'converted_at' => 'datetime',
            'lost_at' => 'datetime',
            'deleted_at' => 'datetime',
            'raw_iacrm_payload' => 'array',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function submittedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function softDeletedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'soft_deleted_by_user_id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(ProspectStatusHistory::class)->orderByDesc('created_at');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class)->orderByDesc('occurred_at');
    }

    public function pointsLedgerEntries(): HasMany
    {
        return $this->hasMany(PointsLedger::class)->orderByDesc('effective_at');
    }
}
