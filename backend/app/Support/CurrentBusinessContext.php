<?php

namespace App\Support;

use App\Models\Agent;
use App\Models\BusinessUserAssignment;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class CurrentBusinessContext
{
    public const SESSION_KEY = 'auth.current_business_id';

    public static function remember(Request $request, ?string $businessId): void
    {
        if (! $request->hasSession()) {
            return;
        }

        if ($businessId === null) {
            $request->session()->forget(self::SESSION_KEY);

            return;
        }

        $request->session()->put(self::SESSION_KEY, $businessId);
    }

    public static function resolve(User $user, ?Request $request = null): ?string
    {
        $sessionBusinessId = $request?->hasSession()
            ? $request->session()->get(self::SESSION_KEY)
            : null;

        if (is_string($sessionBusinessId) && self::userCanAccessBusiness($user, $sessionBusinessId)) {
            return $sessionBusinessId;
        }

        $currentBusinessId = self::activeAssignments($user)
            ->sortByDesc(fn (BusinessUserAssignment $assignment) => (int) $assignment->is_primary)
            ->pluck('business_id')
            ->filter()
            ->first();

        if (! is_string($currentBusinessId)) {
            $currentBusinessId = self::activeBusinessRoles($user)
                ->pluck('business_id')
                ->filter()
                ->first();
        }

        if (! is_string($currentBusinessId)) {
            $currentBusinessId = self::activeAgentProfile($user)?->business_id;
        }

        if ($request !== null) {
            self::remember($request, is_string($currentBusinessId) ? $currentBusinessId : null);
        }

        return is_string($currentBusinessId) ? $currentBusinessId : null;
    }

    public static function resolveInvitationTargetBusinessId(User $user): ?string
    {
        $invitedAssignment = self::assignments($user)
            ->where('status', 'invited')
            ->sortByDesc(fn (BusinessUserAssignment $assignment) => optional($assignment->invited_at)?->getTimestamp() ?? 0)
            ->first();

        if ($invitedAssignment?->business_id !== null) {
            return $invitedAssignment->business_id;
        }

        $recentBusinessRole = self::businessRoles($user)
            ->sortByDesc(fn (UserRole $assignment) => optional($assignment->assigned_at)?->getTimestamp() ?? 0)
            ->first();

        return $recentBusinessRole?->business_id;
    }

    public static function userCanAccessBusiness(User $user, string $businessId): bool
    {
        if (self::activeAssignments($user)->contains(fn (BusinessUserAssignment $assignment) => $assignment->business_id === $businessId)) {
            return true;
        }

        if (self::activeBusinessRoles($user)->contains(fn (UserRole $assignment) => $assignment->business_id === $businessId)) {
            return true;
        }

        return self::activeAgentProfile($user)?->business_id === $businessId;
    }

    /**
     * @return Collection<int, BusinessUserAssignment>
     */
    private static function assignments(User $user): Collection
    {
        if ($user->relationLoaded('businessAssignments')) {
            /** @var Collection<int, BusinessUserAssignment> $assignments */
            $assignments = $user->businessAssignments;

            return $assignments;
        }

        /** @var Collection<int, BusinessUserAssignment> $assignments */
        $assignments = $user->businessAssignments()->get();

        return $assignments;
    }

    /**
     * @return Collection<int, BusinessUserAssignment>
     */
    private static function activeAssignments(User $user): Collection
    {
        return self::assignments($user)
            ->where('status', 'active')
            ->values();
    }

    /**
     * @return Collection<int, UserRole>
     */
    private static function roles(User $user): Collection
    {
        if ($user->relationLoaded('userRoles')) {
            /** @var Collection<int, UserRole> $roles */
            $roles = $user->userRoles;

            return $roles;
        }

        /** @var Collection<int, UserRole> $roles */
        $roles = $user->userRoles()->with('role.permissions')->get();

        return $roles;
    }

    /**
     * @return Collection<int, UserRole>
     */
    private static function businessRoles(User $user): Collection
    {
        return self::roles($user)
            ->where('scope_type', 'business')
            ->filter(fn (UserRole $assignment) => $assignment->business_id !== null)
            ->values();
    }

    /**
     * @return Collection<int, UserRole>
     */
    private static function activeBusinessRoles(User $user): Collection
    {
        return self::businessRoles($user)
            ->where('status', 'active')
            ->filter(fn (UserRole $assignment) => $assignment->expires_at === null || $assignment->expires_at->isFuture())
            ->values();
    }

    private static function activeAgentProfile(User $user): ?Agent
    {
        $agent = null;

        if ($user->relationLoaded('agentProfile')) {
            $agent = $user->agentProfile;
        } else {
            $agent = $user->agentProfile()->first();
        }

        if (! $agent instanceof Agent) {
            return null;
        }

        return $agent->status === 'active' ? $agent : null;
    }
}
