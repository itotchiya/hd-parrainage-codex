<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExchangePackItem extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'exchange_pack_id',
        'title',
        'description',
        'item_type',
        'points_cost',
        'display_order',
        'status',
        'metadata',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'archived_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function exchangePack(): BelongsTo
    {
        return $this->belongsTo(ExchangePack::class);
    }

    public function exchangeRequests(): HasMany
    {
        return $this->hasMany(ExchangeRequest::class);
    }
}
