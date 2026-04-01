<?php

namespace App\Http\Resources\Businesses;

use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Business
 */
class BusinessListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $ownerAssignment = $this->relationLoaded('userAssignments')
            ? $this->userAssignments
                ->where('assignment_type', 'owner')
                ->where('is_primary', true)
                ->first()
            : null;
        $ownerUser = $ownerAssignment?->relationLoaded('user') ? $ownerAssignment->user : null;

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'legal_name' => $this->legal_name,
            'display_name' => $this->display_name,
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
            'rejected_at' => $this->rejected_at?->toISOString(),
            'suspended_at' => $this->suspended_at?->toISOString(),
            'archived_at' => $this->archived_at?->toISOString(),
            'last_synced_at' => $this->last_synced_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'owner' => $ownerUser === null ? null : [
                'user_id' => $ownerUser->id,
                'display_name' => $ownerUser->display_name,
                'email' => $ownerUser->email,
                'status' => $ownerUser->status,
            ],
            'program_count' => $this->programs_count ?? 0,
            'agent_count' => $this->agents_count ?? 0,
            'prospect_count' => $this->prospects_count ?? 0,
            'transaction_count' => $this->transactions_count ?? 0,
            'pending_exchange_request_count' => $this->exchange_requests_count ?? 0,
        ];
    }
}
