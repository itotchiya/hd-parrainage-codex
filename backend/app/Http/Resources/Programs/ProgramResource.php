<?php

namespace App\Http\Resources\Programs;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Program */
class ProgramResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        $businessId = $this->business_id;

        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'business_name' => $this->business?->display_name,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'commission_type' => self::serializeCommissionType($this->commission_type),
            'exchange_mode' => $this->exchange_mode,
            'points_per_transaction' => $this->points_per_transaction,
            'points_per_euro' => $this->points_per_euro,
            'eligibility_criteria' => $this->eligibility_criteria,
            'status' => $this->status,
            'rule_version' => $this->rule_version,
            'starts_at' => $this->starts_at?->toISOString(),
            'ends_at' => $this->ends_at?->toISOString(),
            'activated_at' => $this->activated_at?->toISOString(),
            'paused_at' => $this->paused_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'exchange_pack' => $this->exchangePack === null
                ? null
                : ExchangePackResource::make($this->exchangePack->loadMissing('items'))->resolve($request),
            'assigned_agents_count' => $this->when(
                isset($this->active_agent_assignments_count),
                fn () => (int) $this->active_agent_assignments_count,
            ),
            'assigned_agents' => $this->whenLoaded(
                'agentAssignments',
                fn () => $this->agentAssignments
                    ->where('status', 'active')
                    ->values()
                    ->map(fn ($assignment) => AssignedAgentResource::make($assignment)->resolve($request)),
            ),
            'actions' => [
                'can_create' => $user?->hasPermissionId('program.create', $businessId) ?? false,
                'can_update' => $user?->hasPermissionId('program.update', $businessId) ?? false,
                'can_pause' => $user?->hasPermissionId('program.pause', $businessId) ?? false,
                'can_assign_agent' => $user?->hasPermissionId('program.assign-agent', $businessId) ?? false,
            ],
        ];
    }

    public static function serializeCommissionType(string $value): string
    {
        return match ($value) {
            'per_transaction' => 'per-transaction',
            'revenue_tier' => 'revenue-tier',
            default => $value,
        };
    }
}
