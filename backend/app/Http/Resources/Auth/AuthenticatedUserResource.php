<?php

namespace App\Http\Resources\Auth;

use App\Models\UserRole;
use App\Support\CurrentBusinessContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class AuthenticatedUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $currentBusinessId = CurrentBusinessContext::resolve($this->resource, $request);
        $currentBusiness = $this->businessAssignments
            ->firstWhere('business_id', $currentBusinessId)?->business;
        $scopedAgentProfile = $this->agentProfile !== null && $this->agentProfile->business_id === $currentBusinessId
            ? $this->agentProfile
            : null;

        return [
            'id' => $this->id,
            'display_name' => $this->display_name,
            'avatar_url' => $this->avatar_url,
            'email' => $this->email,
            'status' => $this->status,
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'last_login_at' => $this->last_login_at?->toISOString(),
            'last_activity_at' => $this->last_activity_at?->toISOString(),
            'current_business_id' => $currentBusinessId,
            'primary_business' => $currentBusiness === null ? null : [
                'id' => $currentBusiness->id,
                'slug' => $currentBusiness->slug,
                'display_name' => $currentBusiness->display_name,
                'status' => $currentBusiness->status,
            ],
            'business_assignments' => $this->businessAssignments
                ->where('status', 'active')
                ->map(fn ($assignment) => [
                    'business_id' => $assignment->business_id,
                    'assignment_type' => $assignment->assignment_type,
                    'is_primary' => $assignment->is_primary,
                    'status' => $assignment->status,
                    'business' => $assignment->business === null ? null : [
                        'id' => $assignment->business->id,
                        'slug' => $assignment->business->slug,
                        'display_name' => $assignment->business->display_name,
                        'status' => $assignment->business->status,
                    ],
                ])
                ->values(),
            'agent_profile' => $scopedAgentProfile === null ? null : [
                'id' => $scopedAgentProfile->id,
                'business_id' => $scopedAgentProfile->business_id,
                'agent_code' => $scopedAgentProfile->agent_code,
                'status' => $scopedAgentProfile->status,
            ],
            'roles' => $this->userRoles
                ->where('status', 'active')
                ->filter(fn (UserRole $assignment) => $assignment->expires_at === null || $assignment->expires_at->isFuture())
                ->filter(function (UserRole $assignment) use ($currentBusinessId): bool {
                    if ($assignment->scope_type === 'global') {
                        return true;
                    }

                    return $assignment->business_id === $currentBusinessId;
                })
                ->map(fn (UserRole $assignment) => [
                    'slug' => $assignment->role?->slug,
                    'name' => $assignment->role?->name,
                    'scope_type' => $assignment->scope_type,
                    'business_id' => $assignment->business_id,
                    'assigned_at' => $assignment->assigned_at?->toISOString(),
                ])
                ->values(),
            'permissions' => $this->resolvedPermissionIds($currentBusinessId)->values(),
        ];
    }
}
