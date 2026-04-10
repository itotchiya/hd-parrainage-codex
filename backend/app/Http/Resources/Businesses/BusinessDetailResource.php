<?php

namespace App\Http\Resources\Businesses;

use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Business
 */
class BusinessDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $ownerAssignments = $this->relationLoaded('userAssignments')
            ? $this->userAssignments
                ->where('assignment_type', 'owner')
                ->values()
            : collect();

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'legal_name' => $this->legal_name,
            'display_name' => $this->display_name,
            'logo_url' => $this->logo_url,
            'industry' => $this->industry,
            'website_url' => $this->website_url,
            'contact_email' => $this->contact_email,
            'contact_phone' => $this->contact_phone,
            'country_code' => $this->country_code,
            'currency_code' => $this->currency_code,
            'timezone' => $this->timezone,
            'status' => $this->status,
            'iacrm_business_id' => $this->iacrm_business_id,
            'approved_at' => $this->approved_at?->toISOString(),
            'approved_by' => $this->approvedByUser === null ? null : [
                'user_id' => $this->approvedByUser->id,
                'display_name' => $this->approvedByUser->display_name,
                'email' => $this->approvedByUser->email,
            ],
            'rejected_at' => $this->rejected_at?->toISOString(),
            'rejected_by' => $this->rejectedByUser === null ? null : [
                'user_id' => $this->rejectedByUser->id,
                'display_name' => $this->rejectedByUser->display_name,
                'email' => $this->rejectedByUser->email,
            ],
            'suspended_at' => $this->suspended_at?->toISOString(),
            'archived_at' => $this->archived_at?->toISOString(),
            'last_synced_at' => $this->last_synced_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'owners' => $ownerAssignments->map(function ($assignment) {
                $owner = $assignment->relationLoaded('user') ? $assignment->user : null;

                return [
                    'assignment_id' => $assignment->id,
                    'assignment_type' => $assignment->assignment_type,
                    'status' => $assignment->status,
                    'is_primary' => $assignment->is_primary,
                    'invited_at' => $assignment->invited_at?->toISOString(),
                    'activated_at' => $assignment->activated_at?->toISOString(),
                    'user' => $owner === null ? null : [
                        'id' => $owner->id,
                        'display_name' => $owner->display_name,
                        'email' => $owner->email,
                        'status' => $owner->status,
                        'last_activity_at' => $owner->last_activity_at?->toISOString(),
                    ],
                ];
            })->values(),
            'linked_programs' => $this->relationLoaded('programs')
                ? $this->programs->map(fn ($program) => [
                    'id' => $program->id,
                    'slug' => $program->slug,
                    'name' => $program->name,
                    'status' => $program->status,
                    'commission_type' => $program->commission_type,
                    'exchange_mode' => $program->exchange_mode,
                    'points_per_transaction' => $program->points_per_transaction,
                    'points_per_euro' => $program->points_per_euro,
                    'starts_at' => $program->starts_at?->toISOString(),
                    'ends_at' => $program->ends_at?->toISOString(),
                ])->values()
                : [],
            'summary' => [
                'program_count' => $this->programs_count ?? 0,
                'active_program_count' => $this->active_programs_count ?? 0,
                'agent_count' => $this->agents_count ?? 0,
                'active_agent_count' => $this->active_agents_count ?? 0,
                'prospect_count' => $this->prospects_count ?? 0,
                'transaction_count' => $this->transactions_count ?? 0,
                'pending_exchange_request_count' => $this->exchange_requests_count ?? 0,
            ],
        ];
    }
}
