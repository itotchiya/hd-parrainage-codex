<?php

namespace App\Http\Controllers\Api\Prospects;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Program;
use App\Models\Prospect;
use App\Models\ProspectStatusHistory;
use App\Models\SyncJob;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PublicProspectController extends Controller
{
    /**
     * Return minimal portal branding info for an agent+program combination.
     * No auth required – only exposes non-sensitive data.
     */
    public function portalInfo(Request $request, string $programId): JsonResponse
    {
        $agentCode = (string) $request->string('agent_code');

        abort_if($agentCode === '', 400, 'agent_code is required.');

        $agent = Agent::query()
            ->where('agent_code', $agentCode)
            ->where('status', 'active')
            ->first();

        abort_if($agent === null, 404, 'Invalid or inactive agent.');

        $program = Program::query()
            ->whereKey($programId)
            ->where('business_id', $agent->business_id)
            ->whereIn('status', ['active', 'paused', 'suspended'])
            ->whereHas('agentAssignments', function (Builder $builder) use ($agent): void {
                $builder
                    ->where('agent_id', $agent->id)
                    ->where('status', 'active');
            })
            ->with('business')
            ->first();

        abort_if($program === null, 404, 'Program not found or agent not assigned.');

        return response()->json([
            'data' => [
                'business_name' => $program->business?->display_name ?? $program->business?->name ?? '',
                'program_name' => $program->name,
                'program_description' => $program->description,
                'program_status' => $program->status,
            ],
        ]);
    }

    /**
     * Create a prospect submitted through the public referral portal.
     * No auth required – agent is resolved from agent_code.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'agent_code' => ['required', 'string', 'max:64'],
            'program_id' => ['required', 'uuid'],
            'contact_name' => ['required', 'string', 'max:160'],
            'contact_email' => ['nullable', 'email', 'max:190'],
            'contact_phone_raw' => ['nullable', 'string', 'max:40'],
            'company_name' => ['nullable', 'string', 'max:160'],
        ]);

        $agent = Agent::query()
            ->where('agent_code', (string) $validated['agent_code'])
            ->where('status', 'active')
            ->first();

        abort_if($agent === null, 404, 'Invalid or inactive agent.');

        $businessId = $agent->business_id;

        $contactEmail = $validated['contact_email'] === null
            ? null
            : mb_strtolower(trim((string) $validated['contact_email']));
        $contactPhoneRaw = $validated['contact_phone_raw'] === null
            ? null
            : trim((string) $validated['contact_phone_raw']);
        $contactPhoneE164 = $this->normalizePhone($contactPhoneRaw);

        if ($contactEmail === null && $contactPhoneE164 === null) {
            throw ValidationException::withMessages([
                'contact_email' => 'Either an email or a phone number is required.',
                'contact_phone_raw' => 'Either an email or a phone number is required.',
            ]);
        }

        $program = Program::query()
            ->whereKey((string) $validated['program_id'])
            ->where('business_id', $businessId)
            ->where('status', 'active')
            ->whereHas('agentAssignments', function (Builder $builder) use ($agent): void {
                $builder
                    ->where('agent_id', $agent->id)
                    ->where('status', 'active');
            })
            ->first();

        abort_if($program === null, 403, 'Program not available for this agent.');

        $duplicateQuery = Prospect::query()
            ->where('business_id', $businessId)
            ->where('program_id', $program->id);

        if ($contactPhoneE164 !== null) {
            $duplicateQuery->where('contact_phone_e164', $contactPhoneE164);
        } elseif ($contactEmail !== null) {
            $duplicateQuery->whereRaw('lower(contact_email) = ?', [$contactEmail]);
        }

        if ($duplicateQuery->exists()) {
            throw ValidationException::withMessages([
                'contact_email' => 'An active prospect already exists for this contact in the selected program.',
            ]);
        }

        $prospect = Prospect::query()->create([
            'business_id' => $businessId,
            'program_id' => $program->id,
            'agent_id' => $agent->id,
            'submitted_by_user_id' => $agent->user_id,
            'contact_name' => trim((string) $validated['contact_name']),
            'contact_email' => $contactEmail,
            'contact_phone_raw' => $contactPhoneRaw,
            'contact_phone_e164' => $contactPhoneE164,
            'company_name' => $validated['company_name'] === null
                ? null
                : trim((string) $validated['company_name']),
            'submission_status' => 'pending_sync',
            'pipeline_stage' => 'suspect',
            'progression_status' => 'suspect',
            'conversion_status' => 'open',
            'source' => 'hd_parrainage',
            'submitted_at' => now(),
            'pipeline_stage_changed_at' => now(),
            'raw_iacrm_payload' => [],
        ]);

        $prospect->statusHistory()->create([
            'source_system' => 'hd_parrainage',
            'old_submission_status' => null,
            'new_submission_status' => 'pending_sync',
            'old_progression_status' => null,
            'new_progression_status' => 'suspect',
            'reason' => 'Prospect submitted via public referral portal.',
            'payload_snapshot' => ['event' => 'prospect_submitted_public'],
            'changed_by_user_id' => $agent->user_id,
        ]);

        SyncJob::query()->create([
            'business_id' => $prospect->business_id,
            'initiated_by_user_id' => $agent->user_id,
            'job_type' => 'iacrm.prospect.create',
            'entity_type' => 'prospect',
            'entity_id' => $prospect->id,
            'queue_name' => 'sync-high',
            'status' => 'queued',
            'attempt_count' => 0,
            'max_attempts' => 5,
            'idempotency_key' => sprintf('iacrm.prospect.create:%s:v1', $prospect->id),
            'payload' => [
                'business_id' => $prospect->business_id,
                'prospect_id' => $prospect->id,
                'program_id' => $prospect->program_id,
                'agent_id' => $prospect->agent_id,
                'submission_status' => $prospect->submission_status,
            ],
            'response_payload' => [],
            'queued_at' => now(),
        ]);

        return response()->json([
            'data' => [
                'id' => $prospect->id,
                'contact_name' => $prospect->contact_name,
            ],
        ], 201);
    }

    private function normalizePhone(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($value, '+')) {
            return "+{$digits}";
        }

        if (str_starts_with($digits, '00')) {
            return '+'.substr($digits, 2);
        }

        if (str_starts_with($digits, '0')) {
            return '+33'.ltrim($digits, '0');
        }

        return "+{$digits}";
    }
}
