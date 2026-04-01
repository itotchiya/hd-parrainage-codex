<?php

namespace App\Http\Resources\Exchanges;

use App\Http\Resources\Points\PointsLedgerResource;
use App\Models\ExchangeRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ExchangeRequest
 */
class ExchangeRequestResource extends JsonResource
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
        $agentUser = $agent?->relationLoaded('user') ? $agent->user : null;
        $requestedBy = $this->relationLoaded('requestedByUser') ? $this->requestedByUser : null;
        $approvedBy = $this->relationLoaded('approvedByUser') ? $this->approvedByUser : null;
        $packItem = $this->relationLoaded('exchangePackItem') ? $this->exchangePackItem : null;
        $ledgerEntries = $this->relationLoaded('ledgerEntries') ? $this->ledgerEntries : collect();

        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'business_name' => $business?->display_name,
            'program_id' => $this->program_id,
            'program_name' => $program?->name,
            'program_slug' => $program?->slug,
            'agent_id' => $this->agent_id,
            'agent_name' => $agentUser?->display_name,
            'requested_by_user_id' => $this->requested_by_user_id,
            'requested_by_name' => $requestedBy?->display_name,
            'approved_by_user_id' => $this->approved_by_user_id,
            'approved_by_name' => $approvedBy?->display_name,
            'exchange_pack_item_id' => $this->exchange_pack_item_id,
            'exchange_pack_item_title' => $packItem?->title,
            'exchange_pack_item_points_cost' => $packItem?->points_cost,
            'request_type' => $this->request_type,
            'status' => $this->status,
            'points_amount' => $this->points_amount,
            'cash_amount' => $this->cash_amount === null ? null : (float) $this->cash_amount,
            'currency_code' => $this->currency_code,
            'requested_reward_title' => $this->requested_reward_title,
            'notes' => $this->notes,
            'requested_at' => $this->requested_at?->toISOString(),
            'approved_at' => $this->approved_at?->toISOString(),
            'processed_at' => $this->processed_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'rejected_at' => $this->rejected_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'program_exchange_pack' => $program?->exchangePack === null
                ? null
                : [
                    'id' => $program->exchangePack->id,
                    'name' => $program->exchangePack->name,
                    'items' => $program->exchangePack->relationLoaded('items')
                        ? $program->exchangePack->items
                            ->where('status', 'active')
                            ->values()
                            ->map(fn ($item) => [
                                'id' => $item->id,
                                'title' => $item->title,
                                'description' => $item->description,
                                'item_type' => $item->item_type,
                                'points_cost' => $item->points_cost,
                                'display_order' => $item->display_order,
                            ])
                        : [],
                ],
            'ledger_entries' => $ledgerEntries
                ->values()
                ->map(fn ($entry) => PointsLedgerResource::make($entry)->resolve($request)),
        ];
    }
}
