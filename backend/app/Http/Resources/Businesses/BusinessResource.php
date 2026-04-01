<?php

namespace App\Http\Resources\Businesses;

use App\Models\Business;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Business
 */
class BusinessResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
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
            'approved_at' => $this->approved_at?->toISOString(),
            'rejected_at' => $this->rejected_at?->toISOString(),
            'last_synced_at' => $this->last_synced_at?->toISOString(),
            'active_agents_count' => $this->whenCounted('agents'),
            'active_programs_count' => $this->whenCounted('programs'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
