<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'slug',
        'name',
        'description',
        'is_system',
        'status',
        'created_by_user_id',
        'updated_by_user_id',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions', 'role_id', 'permission_id');
    }

    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }
}
