<?php

namespace App\Http\Resources\Auth;

use App\Models\UserRole;
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
        $primaryBusiness = $this->primaryBusinessAssignment?->business;
        $currentBusinessId = $primaryBusiness?->id;

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
            'primary_business' => $primaryBusiness === null ? null : [
                'id' => $primaryBusiness->id,
                'slug' => $primaryBusiness->slug,
                'display_name' => $primaryBusiness->display_name,
                'status' => $primaryBusiness->status,
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
            'agent_profile' => $this->agentProfile === null ? null : [
                'id' => $this->agentProfile->id,
                'business_id' => $this->agentProfile->business_id,
                'agent_code' => $this->agentProfile->agent_code,
                'status' => $this->agentProfile->status,
            ],
            'roles' => $this->userRoles
                ->where('status', 'active')
                ->filter(fn (UserRole $assignment) => $assignment->expires_at === null || $assignment->expires_at->isFuture())
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
