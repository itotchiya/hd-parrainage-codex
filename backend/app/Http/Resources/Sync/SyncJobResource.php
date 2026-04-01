<?php

namespace App\Http\Resources\Sync;

use App\Models\SyncJob;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SyncJob
 */
class SyncJobResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'initiated_by_user_id' => $this->initiated_by_user_id,
            'job_type' => $this->job_type,
            'entity_type' => $this->entity_type,
            'entity_id' => $this->entity_id,
            'queue_name' => $this->queue_name,
            'status' => $this->status,
            'attempt_count' => $this->attempt_count,
            'max_attempts' => $this->max_attempts,
            'idempotency_key' => $this->idempotency_key,
            'failure_code' => $this->failure_code,
            'failure_message' => $this->failure_message,
            'payload' => $this->payload ?? [],
            'response_payload' => $this->response_payload ?? [],
            'queued_at' => $this->queued_at?->toISOString(),
            'started_at' => $this->started_at?->toISOString(),
            'finished_at' => $this->finished_at?->toISOString(),
            'failed_at' => $this->failed_at?->toISOString(),
            'dead_lettered_at' => $this->dead_lettered_at?->toISOString(),
            'next_retry_at' => $this->next_retry_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'initiated_by_user' => $this->whenLoaded('initiatedByUser', fn (): array => [
                'id' => $this->initiatedByUser?->id,
                'display_name' => $this->initiatedByUser?->display_name,
                'email' => $this->initiatedByUser?->email,
            ]),
            'business' => $this->whenLoaded('business', fn (): ?array => $this->business === null ? null : [
                'id' => $this->business->id,
                'slug' => $this->business->slug,
                'display_name' => $this->business->display_name,
                'status' => $this->business->status,
            ]),
        ];
    }
}
