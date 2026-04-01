<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProspectStatusHistory extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'prospect_status_history';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'prospect_id',
        'source_system',
        'old_submission_status',
        'new_submission_status',
        'old_progression_status',
        'new_progression_status',
        'reason',
        'payload_snapshot',
        'changed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'payload_snapshot' => 'array',
        ];
    }

    public function prospect(): BelongsTo
    {
        return $this->belongsTo(Prospect::class);
    }

    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
