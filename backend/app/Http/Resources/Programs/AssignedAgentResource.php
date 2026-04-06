<?php

namespace App\Http\Resources\Programs;

use App\Models\Prospect;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ProgramAgentAssignment */
class AssignedAgentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $hasProspectsInProgram = Prospect::query()
            ->where('program_id', $this->program_id)
            ->where('agent_id', $this->agent_id)
            ->exists();

        return [
            'assignment_id' => $this->id,
            'status' => $this->status,
            'assigned_at' => $this->assigned_at?->toISOString(),
            'has_prospects_in_program' => $hasProspectsInProgram,
            'can_unassign' => ! $hasProspectsInProgram,
            'agent' => $this->agent === null ? null : [
                'id' => $this->agent->id,
                'user_id' => $this->agent->user_id,
                'agent_code' => $this->agent->agent_code,
                'status' => $this->agent->status,
                'display_name' => $this->agent->user?->display_name,
                'email' => $this->agent->user?->email,
                'avatar_url' => $this->agent->user?->avatar_url,
            ],
        ];
    }
}
