<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $keyType = 'string';

    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'display_name',
        'avatar_url',
        'avatar_storage_path',
        'email',
        'phone_number',
        'password_hash',
        'status',
        'invited_at',
        'activated_at',
        'suspended_at',
        'last_activity_at',
        'last_login_at',
        'email_verified_at',
        'created_by_user_id',
        'updated_by_user_id',
        'archived_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'invited_at' => 'datetime',
            'activated_at' => 'datetime',
            'suspended_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'last_login_at' => 'datetime',
            'archived_at' => 'datetime',
            'deleted_at' => 'datetime',
            'password_hash' => 'hashed',
        ];
    }

    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    public function businessAssignments(): HasMany
    {
        return $this->hasMany(BusinessUserAssignment::class);
    }

    public function primaryBusinessAssignment(): HasOne
    {
        return $this->hasOne(BusinessUserAssignment::class)
            ->where('status', 'active')
            ->where('is_primary', true);
    }

    public function agentProfile(): HasOne
    {
        return $this->hasOne(Agent::class);
    }

    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    public function userPermissionOverrides(): HasMany
    {
        return $this->hasMany(UserPermissionOverride::class);
    }

    public function submittedProspects(): HasMany
    {
        return $this->hasMany(Prospect::class, 'submitted_by_user_id');
    }

    public function resolvedPermissionIds(?string $businessId = null): Collection
    {
        $roleAssignments = $this->userRoles
            ->where('status', 'active')
            ->filter(function (UserRole $assignment) use ($businessId): bool {
                if ($assignment->expires_at !== null && $assignment->expires_at->isPast()) {
                    return false;
                }

                if ($businessId === null) {
                    return true;
                }

                return $assignment->scope_type === 'global' || $assignment->business_id === $businessId;
            });

        $permissions = $roleAssignments
            ->flatMap(fn (UserRole $assignment) => $assignment->role?->permissions?->pluck('permission_id') ?? collect())
            ->filter()
            ->unique()
            ->values();

        $activeOverrides = $this->userPermissionOverrides
            ->filter(function (UserPermissionOverride $override) use ($businessId): bool {
                if ($override->active_from !== null && $override->active_from->isFuture()) {
                    return false;
                }

                if ($override->active_until !== null && $override->active_until->isPast()) {
                    return false;
                }

                if ($businessId === null) {
                    return true;
                }

                return match ($override->scope_type) {
                    'global' => true,
                    'business' => $override->business_id === $businessId,
                    default => false,
                };
            });

        $denied = $activeOverrides
            ->where('effect', 'deny')
            ->pluck('permission.permission_id')
            ->filter();

        $allowed = $activeOverrides
            ->where('effect', 'allow')
            ->pluck('permission.permission_id')
            ->filter();

        return $permissions
            ->reject(fn (string $permissionId) => $denied->contains($permissionId))
            ->merge($allowed)
            ->unique()
            ->values();
    }

    public function hasPermissionId(string $permissionId, ?string $businessId = null): bool
    {
        return $this->resolvedPermissionIds($businessId)->contains($permissionId);
    }

    public function activeRoleSlugs(?string $businessId = null): Collection
    {
        return $this->userRoles
            ->where('status', 'active')
            ->filter(function (UserRole $assignment) use ($businessId): bool {
                if ($assignment->expires_at !== null && $assignment->expires_at->isPast()) {
                    return false;
                }

                if ($businessId === null) {
                    return true;
                }

                return $assignment->scope_type === 'global' || $assignment->business_id === $businessId;
            })
            ->map(fn (UserRole $assignment) => $assignment->role?->slug)
            ->filter()
            ->unique()
            ->values();
    }
}
