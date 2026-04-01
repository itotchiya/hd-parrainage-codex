<?php

namespace App\Http\Resources\Notifications;

use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AppNotification
 */
class AppNotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'recipient_user_id' => $this->recipient_user_id,
            'business_id' => $this->business_id,
            'notification_type' => $this->notification_type,
            'title' => $this->title,
            'message' => $this->message,
            'severity' => $this->severity,
            'metadata' => $this->metadata,
            'read_at' => $this->read_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
