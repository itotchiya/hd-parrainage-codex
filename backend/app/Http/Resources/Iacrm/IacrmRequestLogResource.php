<?php

namespace App\Http\Resources\Iacrm;

use App\Models\IacrmRequestLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin IacrmRequestLog
 */
class IacrmRequestLogResource extends JsonResource
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
            'sync_job_id' => $this->sync_job_id,
            'actor_type' => $this->actor_type,
            'source' => $this->source,
            'direction' => $this->direction,
            'method' => $this->method,
            'endpoint' => $this->endpoint,
            'status' => $this->status,
            'status_code' => $this->status_code,
            'duration_ms' => $this->duration_ms,
            'error_message' => $this->error_message,
            'request_payload' => $this->request_payload ?? [],
            'response_payload' => $this->response_payload ?? [],
            'meta' => $this->meta ?? [],
            'requested_at' => $this->requested_at?->toISOString(),
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
