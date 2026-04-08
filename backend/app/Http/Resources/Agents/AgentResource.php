<?php

namespace App\Http\Resources\Agents;

use App\Models\Agent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Agent
 */
class AgentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->whenLoaded('user');

        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'user_id' => $this->user_id,
            'agent_code' => $this->agent_code,
            'status' => $this->status,
            'invited_by_user_id' => $this->invited_by_user_id,
            'invited_at' => $this->invited_at?->toISOString(),
            'activated_at' => $this->activated_at?->toISOString(),
            'suspended_at' => $this->suspended_at?->toISOString(),
            'last_activity_at' => $this->last_activity_at?->toISOString(),
            'notes' => $this->notes,
            'display_name' => $user?->display_name,
            'avatar_url' => $user?->avatar_url,
            'email' => $user?->email,
            'user_status' => $user?->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'active_pipeline_prospects_count' => (int) ($this->active_pipeline_prospects_count ?? 0),
            'assigned_programs' => $this->whenLoaded('programAssignments', function (): array {
                return $this->programAssignments
                    ->filter(fn ($assignment) => $assignment->program !== null)
                    ->map(function ($assignment): array {
                        return [
                            'assignment_id' => $assignment->id,
                            'status' => $assignment->status,
                            'assigned_at' => $assignment->assigned_at?->toISOString(),
                            'program' => [
                                'id' => $assignment->program->id,
                                'name' => $assignment->program->name,
                                'status' => $assignment->program->status,
                                'exchange_mode' => $assignment->program->exchange_mode,
                                'assigned_agents_count' => $assignment->program->assigned_agents_count,
                            ],
                        ];
                    })
                    ->values()
                    ->all();
            }),
            'prospects' => $this->whenLoaded('prospects', function (): array {
                return $this->prospects
                    ->map(function ($prospect): array {
                        return [
                            'id' => $prospect->id,
                            'contact_name' => $prospect->contact_name,
                            'company_name' => $prospect->company_name,
                            'program_id' => $prospect->program_id,
                            'program_name' => $prospect->program?->name,
                            'pipeline_stage' => $prospect->pipeline_stage,
                            'submission_status' => $prospect->submission_status,
                            'conversion_status' => $prospect->conversion_status,
                            'submitted_at' => $prospect->submitted_at?->toISOString(),
                            'last_synced_at' => $prospect->last_synced_at?->toISOString(),
                        ];
                    })
                    ->values()
                    ->all();
            }),
            'actions' => [
                'can_suspend' => $this->status !== 'suspended',
                'can_reactivate' => $this->status === 'suspended',
                'requires_suspend_timer' => ((int) ($this->active_pipeline_prospects_count ?? 0)) > 0,
            ],
        ];
    }
}
