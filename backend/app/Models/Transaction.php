<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'business_id',
        'program_id',
        'agent_id',
        'prospect_id',
        'iacrm_transaction_id',
        'transaction_reference',
        'product_name',
        'amount',
        'currency_code',
        'status',
        'invoice_status',
        'points_awarded',
        'occurred_at',
        'recognized_at',
        'validated_at',
        'rejected_at',
        'paid_at',
        'last_synced_at',
        'raw_iacrm_payload',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'occurred_at' => 'datetime',
            'recognized_at' => 'datetime',
            'validated_at' => 'datetime',
            'rejected_at' => 'datetime',
            'paid_at' => 'datetime',
            'last_synced_at' => 'datetime',
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

    public function prospect(): BelongsTo
    {
        return $this->belongsTo(Prospect::class);
    }

    public function pointsLedgerEntries(): HasMany
    {
        return $this->hasMany(PointsLedger::class)->orderByDesc('effective_at');
    }
}
