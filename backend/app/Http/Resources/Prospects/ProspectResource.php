<?php

namespace App\Http\Resources\Prospects;

use App\Models\Prospect;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Prospect
 */
class ProspectResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User|null $viewer */
        $viewer = $request->user();
        $businessId = $viewer?->primaryBusinessAssignment?->business_id ?? $viewer?->agentProfile?->business_id;
        $canDelete = $viewer !== null
            && $viewer->hasPermissionId('prospect.delete-own-soft', $businessId)
            && $viewer->agentProfile?->id === $this->agent_id
            && $this->conversion_status === 'open'
            && $this->conversion_locked_at === null
            && $this->deleted_at === null;
        $canRetrySync = $viewer !== null
            && $viewer->hasPermissionId('iacrm.sync-retry', $businessId)
            && $this->deleted_at === null
            && in_array($this->submission_status, ['pending_sync', 'sync_failed'], true);

        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'business_name' => $this->business?->display_name,
            'program_id' => $this->program_id,
            'program_name' => $this->program?->name,
            'program_status' => $this->program?->status,
            'agent_id' => $this->agent_id,
            'agent_name' => $this->agent?->user?->display_name,
            'agent_email' => $this->agent?->user?->email,
            'contact_name' => $this->contact_name,
            'contact_email' => $this->contact_email,
            'contact_phone_raw' => $this->contact_phone_raw,
            'contact_phone_e164' => $this->contact_phone_e164,
            'company_name' => $this->company_name,
            'submission_status' => $this->submission_status,
            'pipeline_stage' => $this->pipeline_stage,
            'progression_status' => $this->progression_status,
            'conversion_status' => $this->conversion_status,
            'iacrm_prospect_id' => $this->iacrm_prospect_id,
            'iacrm_status_code' => $this->iacrm_status_code,
            'iacrm_status_label' => $this->iacrm_status_label,
            'sync_error_message' => $this->sync_error_message,
            'source' => $this->source,
            'submitted_at' => $this->submitted_at?->toISOString(),
            'first_synced_at' => $this->first_synced_at?->toISOString(),
            'last_synced_at' => $this->last_synced_at?->toISOString(),
            'pipeline_stage_changed_at' => $this->pipeline_stage_changed_at?->toISOString(),
            'conversion_locked_at' => $this->conversion_locked_at?->toISOString(),
            'converted_at' => $this->converted_at?->toISOString(),
            'lost_at' => $this->lost_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
            'soft_delete_reason' => $this->soft_delete_reason,
            'deleted_by_user' => $this->softDeletedByUser === null ? null : [
                'id' => $this->softDeletedByUser->id,
                'display_name' => $this->softDeletedByUser->display_name,
                'email' => $this->softDeletedByUser->email,
            ],
            'history_count' => $this->whenCounted('statusHistory'),
            'actions' => [
                'can_delete' => $canDelete,
                'can_retry_sync' => $canRetrySync,
                'can_view_history' => $viewer !== null,
            ],
        ];
    }
}
