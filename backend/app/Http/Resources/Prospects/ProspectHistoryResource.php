<?php

namespace App\Http\Resources\Prospects;

use App\Models\ProspectStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProspectStatusHistory
 */
class ProspectHistoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source_system' => $this->source_system,
            'old_submission_status' => $this->old_submission_status,
            'new_submission_status' => $this->new_submission_status,
            'old_progression_status' => $this->old_progression_status,
            'new_progression_status' => $this->new_progression_status,
            'reason' => $this->reason,
            'payload_snapshot' => $this->payload_snapshot ?? [],
            'changed_by_user' => $this->changedByUser === null ? null : [
                'id' => $this->changedByUser->id,
                'display_name' => $this->changedByUser->display_name,
                'email' => $this->changedByUser->email,
            ],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
