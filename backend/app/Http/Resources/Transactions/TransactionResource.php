<?php

namespace App\Http\Resources\Transactions;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Transaction
 */
class TransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $program = $this->whenLoaded('program');
        $business = $this->whenLoaded('business');
        $agent = $this->whenLoaded('agent');
        $prospect = $this->whenLoaded('prospect');
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
            'agent_email' => $agentUser?->email,
            'prospect_id' => $this->prospect_id,
            'prospect_name' => $prospect?->contact_name,
            'prospect_company_name' => $prospect?->company_name,
            'iacrm_transaction_id' => $this->iacrm_transaction_id,
            'transaction_reference' => $this->transaction_reference,
            'product_name' => $this->product_name,
            'amount' => $this->amount === null ? null : (float) $this->amount,
            'currency_code' => $this->currency_code,
            'status' => $this->status,
            'invoice_status' => $this->invoice_status,
            'points_awarded' => $this->points_awarded,
            'occurred_at' => $this->occurred_at?->toISOString(),
            'recognized_at' => $this->recognized_at?->toISOString(),
            'validated_at' => $this->validated_at?->toISOString(),
            'rejected_at' => $this->rejected_at?->toISOString(),
            'paid_at' => $this->paid_at?->toISOString(),
            'last_synced_at' => $this->last_synced_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'prospect' => $prospect === null ? null : [
                'id' => $prospect->id,
                'contact_name' => $prospect->contact_name,
                'company_name' => $prospect->company_name,
                'pipeline_stage' => $prospect->pipeline_stage,
                'conversion_status' => $prospect->conversion_status,
            ],
            'actions' => [
                'can_export' => false,
            ],
        ];
    }
}
