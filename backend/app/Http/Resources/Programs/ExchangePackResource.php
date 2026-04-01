<?php

namespace App\Http\Resources\Programs;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExchangePack */
class ExchangePackResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'updated_at' => $this->updated_at?->toISOString(),
            'items' => $this->whenLoaded('items', fn () => $this->items
                ->where('status', 'active')
                ->values()
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'title' => $item->title,
                    'description' => $item->description,
                    'item_type' => $item->item_type,
                    'points_cost' => $item->points_cost,
                    'display_order' => $item->display_order,
                ])),
        ];
    }
}
