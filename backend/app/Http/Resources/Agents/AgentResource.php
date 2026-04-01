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
            'email' => $user?->email,
            'user_status' => $user?->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
