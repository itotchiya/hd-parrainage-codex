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
        $user = $request->user();
        $businessId = $this->business_id;
        $linkedProgramsCount = isset($this->programs_count)
            ? (int) $this->programs_count
            : (int) $this->programs()->count();
        $activeItemsCount = isset($this->active_items_count)
            ? (int) $this->active_items_count
            : (int) $this->items()->where('status', 'active')->count();
        $canUpdate = $user?->hasPermissionId('exchange-pack.update', $businessId) ?? false;
        $canDelete = ($user?->hasPermissionId('exchange-pack.delete', $businessId) ?? false)
            && $linkedProgramsCount === 0;
        $canDisable = $canUpdate && $this->status === 'active' && $linkedProgramsCount === 0;
        $canActivate = $canUpdate && $this->status === 'inactive';

        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'active_items_count' => $activeItemsCount,
            'linked_programs_count' => $linkedProgramsCount,
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
                    'status' => $item->status,
                ])),
            'linked_programs' => $this->whenLoaded('programs', fn () => $this->programs
                ->values()
                ->map(fn ($program) => [
                    'id' => $program->id,
                    'name' => $program->name,
                    'status' => $program->status,
                    'exchange_mode' => $program->exchange_mode,
                    'assigned_agents_count' => isset($program->active_agent_assignments_count)
                        ? (int) $program->active_agent_assignments_count
                        : null,
                    'updated_at' => $program->updated_at?->toISOString(),
                ])),
            'actions' => [
                'can_create' => $user?->hasPermissionId('exchange-pack.create', $businessId) ?? false,
                'can_update' => $canUpdate,
                'can_delete' => $canDelete,
                'can_disable' => $canDisable,
                'can_activate' => $canActivate,
            ],
        ];
    }
}
