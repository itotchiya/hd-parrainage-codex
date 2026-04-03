<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Program extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'business_id',
        'slug',
        'name',
        'description',
        'commission_type',
        'exchange_mode',
        'points_per_transaction',
        'points_per_euro',
        'exchange_pack_id',
        'eligibility_criteria',
        'rule_version',
        'status',
        'starts_at',
        'ends_at',
        'activated_at',
        'paused_at',
        'suspended_at',
        'suspension_deadline_at',
        'archived_at',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'activated_at' => 'datetime',
            'paused_at' => 'datetime',
            'suspended_at' => 'datetime',
            'suspension_deadline_at' => 'datetime',
            'archived_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function exchangePack(): BelongsTo
    {
        return $this->belongsTo(ExchangePack::class);
    }

    public function agentAssignments(): HasMany
    {
        return $this->hasMany(ProgramAgentAssignment::class);
    }

    public function prospects(): HasMany
    {
        return $this->hasMany(Prospect::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function exchangeRequests(): HasMany
    {
        return $this->hasMany(ExchangeRequest::class);
    }

    public function pointsLedgerEntries(): HasMany
    {
        return $this->hasMany(PointsLedger::class);
    }
}
