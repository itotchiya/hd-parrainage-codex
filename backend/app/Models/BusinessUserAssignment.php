<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessUserAssignment extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'business_id',
        'user_id',
        'assignment_type',
        'status',
        'is_primary',
        'assigned_by_user_id',
        'invited_at',
        'activated_at',
        'suspended_at',
        'removed_at',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'invited_at' => 'datetime',
            'activated_at' => 'datetime',
            'suspended_at' => 'datetime',
            'removed_at' => 'datetime',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_user_id');
    }
}
