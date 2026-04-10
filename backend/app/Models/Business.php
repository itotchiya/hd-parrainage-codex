<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Business extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'slug',
        'legal_name',
        'display_name',
        'logo_url',
        'logo_storage_path',
        'industry',
        'website_url',
        'contact_email',
        'contact_phone',
        'country_code',
        'currency_code',
        'timezone',
        'status',
        'iacrm_business_id',
        'approved_at',
        'approved_by_user_id',
        'rejected_at',
        'rejected_by_user_id',
        'suspended_at',
        'archived_at',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'suspended_at' => 'datetime',
            'archived_at' => 'datetime',
            'last_synced_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function userAssignments(): HasMany
    {
        return $this->hasMany(BusinessUserAssignment::class);
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function rejectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function agents(): HasMany
    {
        return $this->hasMany(Agent::class);
    }

    public function exchangePacks(): HasMany
    {
        return $this->hasMany(ExchangePack::class);
    }

    public function programs(): HasMany
    {
        return $this->hasMany(Program::class);
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
