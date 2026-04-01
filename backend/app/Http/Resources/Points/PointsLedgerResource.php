<?php

namespace App\Http\Resources\Points;

use App\Models\PointsLedger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PointsLedger
 */
class PointsLedgerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $business = $this->relationLoaded('business') ? $this->business : null;
        $program = $this->relationLoaded('program') ? $this->program : null;
        $agent = $this->relationLoaded('agent') ? $this->agent : null;
        $prospect = $this->relationLoaded('prospect') ? $this->prospect : null;
        $transaction = $this->relationLoaded('transaction') ? $this->transaction : null;
        $exchangeRequest = $this->relationLoaded('exchangeRequest') ? $this->exchangeRequest : null;
        $agentUser = $agent?->relationLoaded('user') ? $agent->user : null;

        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'business_name' => $business?->display_name,
            'program_id' => $this->program_id,
            'program_name' => $program?->name,
            'program_slug' => $program?->slug,
            'agent_id' => $this->agent_id,
            'agent_name' => $agentUser?->display_name,
            'prospect_id' => $this->prospect_id,
            'prospect_name' => $prospect?->contact_name,
            'transaction_id' => $this->transaction_id,
            'transaction_reference' => $transaction?->transaction_reference,
            'exchange_request_id' => $this->exchange_request_id,
            'exchange_request_type' => $exchangeRequest?->request_type,
            'exchange_request_status' => $exchangeRequest?->status,
            'entry_type' => $this->entry_type,
            'entry_status' => $this->entry_status,
            'points_delta' => $this->points_delta,
            'source' => $this->source,
            'description' => $this->description,
            'effective_at' => $this->effective_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
