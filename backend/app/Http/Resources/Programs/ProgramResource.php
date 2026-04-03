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
        $assignedAgentsCount = isset($this->active_agent_assignments_count)
            ? (int) $this->active_agent_assignments_count
            : 0;
        $hasOpenProspects = $this->prospects()
            ->where('conversion_status', 'open')
            ->exists();
        $suspensionDaysLeft = $this->suspension_deadline_at === null
            ? null
            : max(0, now()->diffInDays($this->suspension_deadline_at, false));
        $canUpdate = $user?->hasPermissionId('program.update', $businessId) ?? false;
        $canPausePermission = $user?->hasPermissionId('program.pause', $businessId) ?? false;
        $isArchived = $this->status === 'archived';
        $isSuspended = $this->status === 'suspended';
        $secondsUntilSuspensionDeadline = null;
        if ($isSuspended && $this->suspension_deadline_at !== null) {
            $secondsUntilSuspensionDeadline = max(0, (int) now()->diffInSeconds($this->suspension_deadline_at, false));
        }
        $hasActiveAgents = isset($this->active_agent_assignments_count)
            ? $assignedAgentsCount > 0
            : $this->agentAssignments()->where('status', 'active')->exists();
        $hasAnyProspects = $this->prospects()->exists();
        $canEditGeneral = $canUpdate && $assignedAgentsCount === 0 && ! $this->prospects()->exists() && ! $isArchived;
        $canEditCash = $canUpdate && $assignedAgentsCount === 0 && ! $isArchived;
        $canEditRewards = $canUpdate && ! $isArchived;
        $canSuspend = $canPausePermission && in_array($this->status, ['active', 'paused'], true) && ! $hasOpenProspects;
        $canArchive = $canPausePermission
            && $isSuspended
            && $this->suspension_deadline_at !== null
            && $this->suspension_deadline_at->isPast();
        /** Soft-delete: archived (any data), or empty program (no active assignments, no prospects). */
        $canSoftDelete = $canUpdate && (
            $isArchived
            || (! $hasActiveAgents && ! $hasAnyProspects)
        );
        $canDeleteFromArchive = $canSoftDelete;
        $canLiftSuspension = $canPausePermission && $isSuspended && ! $isArchived;
        $draftReadyForActivation = $this->status === 'draft'
            && ($this->commission_type !== 'per_transaction' || $this->points_per_transaction !== null)
            && (! in_array($this->exchange_mode, ['cash', 'both'], true) || $this->points_per_euro !== null)
            && (! in_array($this->exchange_mode, ['reward', 'both'], true) || $this->exchange_pack_id !== null);
        $canActivate = $canUpdate && $draftReadyForActivation;

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
            'suspended_at' => $this->suspended_at?->toISOString(),
            'suspension_deadline_at' => $this->suspension_deadline_at?->toISOString(),
            'suspension_days_left' => $suspensionDaysLeft,
            'seconds_until_suspension_deadline' => $secondsUntilSuspensionDeadline,
            'has_open_prospects' => $hasOpenProspects,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'exchange_pack' => $this->exchangePack === null
                ? null
                : ExchangePackResource::make($this->exchangePack->loadMissing('items'))->resolve($request),
            'assigned_agents_count' => $this->when(
                isset($this->active_agent_assignments_count),
                fn () => $assignedAgentsCount,
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
                'can_edit_general' => $canEditGeneral,
                'can_edit_cash' => $canEditCash,
                'can_edit_rewards' => $canEditRewards,
                'can_activate' => $canActivate,
                'can_pause' => $canPausePermission && $this->status === 'active',
                'can_reactivate' => $canPausePermission && $this->status === 'paused',
                'can_lift_suspension' => $canLiftSuspension,
                'can_suspend' => $canSuspend,
                'can_archive' => $canArchive,
                'can_soft_delete' => $canSoftDelete,
                'can_delete_from_archive' => $canDeleteFromArchive,
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
