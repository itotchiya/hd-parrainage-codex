<?php

namespace App\Http\Controllers\Api\Prospects;

use App\Http\Controllers\Controller;
use App\Http\Resources\Prospects\ProspectHistoryResource;
use App\Http\Resources\Prospects\ProspectResource;
use App\Models\Program;
use App\Models\Prospect;
use App\Models\ProspectStatusHistory;
use App\Models\SyncJob;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ProspectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'prospect.view', $businessId);

        $prospects = $this->applyFilters(
            $this->scopedProspectsQuery($user)
                ->with([
                    'business',
                    'program',
                    'agent.user',
                    'softDeletedByUser',
                ])
                ->withCount('statusHistory'),
            $request,
        )
            ->orderByDesc('submitted_at')
            ->get();

        return response()->json([
            'data' => $prospects->map(fn (Prospect $prospect) => ProspectResource::make($prospect)->resolve($request)),
        ]);
    }

    public function deleted(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        if ($this->activeRoleSlugs($user, $businessId)->contains('agent')) {
            abort_unless($user->hasPermissionId('prospect.view-own-deleted-history', $businessId), 403, 'Forbidden.');
        } else {
            $this->assertPermission($user, 'prospect.view', $businessId);
        }

        $prospects = $this->applyFilters(
            $this->scopedProspectsQuery($user, includeDeleted: true)
                ->onlyTrashed()
                ->with([
                    'business',
                    'program',
                    'agent.user',
                    'softDeletedByUser',
                ])
                ->withCount('statusHistory'),
            $request,
        )
            ->orderByDesc('deleted_at')
            ->get();

        return response()->json([
            'data' => $prospects->map(fn (Prospect $prospect) => ProspectResource::make($prospect)->resolve($request)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $agent = $user->agentProfile;

        abort_if($agent === null, 403, 'No agent profile is available for this action.');

        $businessId = $agent->business_id;
        $this->assertPermission($user, 'prospect.submit', $businessId);

        $validated = $request->validate([
            'program_id' => ['required', 'uuid'],
            'contact_name' => ['required', 'string', 'max:160'],
            'contact_email' => ['nullable', 'email', 'max:190'],
            'contact_phone_raw' => ['nullable', 'string', 'max:40'],
            'company_name' => ['nullable', 'string', 'max:160'],
        ]);

        $contactEmail = $validated['contact_email'] === null ? null : mb_strtolower(trim((string) $validated['contact_email']));
        $contactPhoneRaw = $validated['contact_phone_raw'] === null ? null : trim((string) $validated['contact_phone_raw']);
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

        abort_if($program === null, 403, 'The selected program is not available in the current agent scope.');

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
            'submitted_by_user_id' => $user->id,
            'contact_name' => trim((string) $validated['contact_name']),
            'contact_email' => $contactEmail,
            'contact_phone_raw' => $contactPhoneRaw,
            'contact_phone_e164' => $contactPhoneE164,
            'company_name' => $validated['company_name'] === null ? null : trim((string) $validated['company_name']),
            'submission_status' => 'pending_sync',
            'pipeline_stage' => 'suspect',
            'progression_status' => 'suspect',
            'conversion_status' => 'open',
            'source' => 'hd_parrainage',
            'submitted_at' => now(),
            'pipeline_stage_changed_at' => now(),
            'raw_iacrm_payload' => [],
        ]);

        $this->recordHistory(
            $prospect,
            sourceSystem: 'hd_parrainage',
            oldSubmissionStatus: null,
            newSubmissionStatus: 'pending_sync',
            oldProgressionStatus: null,
            newProgressionStatus: 'suspect',
            reason: 'Prospect submitted locally by agent.',
            changedByUserId: $user->id,
            payloadSnapshot: ['event' => 'prospect_submitted'],
        );

        $this->queueSyncJob(
            prospect: $prospect,
            initiatedByUserId: $user->id,
            jobType: 'iacrm.prospect.create',
            queueName: 'sync-high',
        );

        $prospect->loadMissing([
            'business',
            'program',
            'agent.user',
            'softDeletedByUser',
        ])->loadCount('statusHistory');

        return response()->json([
            'data' => ProspectResource::make($prospect)->resolve($request),
        ], 201);
    }

    public function show(Request $request, string $prospectId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'prospect.view', $businessId);

        $prospect = $this->scopedProspectsQuery($user, includeDeleted: true)
            ->withTrashed()
            ->with([
                'business',
                'program',
                'agent.user',
                'softDeletedByUser',
            ])
            ->withCount('statusHistory')
            ->findOrFail($prospectId);

        return response()->json([
            'data' => ProspectResource::make($prospect)->resolve($request),
        ]);
    }

    public function history(Request $request, string $prospectId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'prospect.view', $businessId);

        $prospect = $this->scopedProspectsQuery($user, includeDeleted: true)
            ->withTrashed()
            ->findOrFail($prospectId);

        $history = $prospect->statusHistory()
            ->with('changedByUser')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $history->map(fn (ProspectStatusHistory $item) => ProspectHistoryResource::make($item)->resolve($request)),
        ]);
    }

    public function destroy(Request $request, string $prospectId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $agent = $user->agentProfile;

        abort_if($agent === null, 403, 'No agent profile is available for this action.');

        $businessId = $agent->business_id;
        $this->assertPermission($user, 'prospect.delete-own-soft', $businessId);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:240'],
        ]);

        $prospect = Prospect::query()
            ->where('agent_id', $agent->id)
            ->findOrFail($prospectId);

        if ($prospect->conversion_status !== 'open' || $prospect->conversion_locked_at !== null) {
            throw ValidationException::withMessages([
                'reason' => 'This prospect can no longer be deleted because it is locked by downstream business activity.',
            ]);
        }

        $oldSubmissionStatus = $prospect->submission_status;
        $oldProgressionStatus = $prospect->progression_status ?? $prospect->pipeline_stage;

        $prospect->forceFill([
            'submission_status' => 'deleted',
            'soft_deleted_by_user_id' => $user->id,
            'soft_delete_reason' => trim((string) $validated['reason']),
        ]);

        $prospect->save();
        $prospect->delete();

        $this->recordHistory(
            $prospect,
            sourceSystem: 'user',
            oldSubmissionStatus: $oldSubmissionStatus,
            newSubmissionStatus: 'deleted',
            oldProgressionStatus: $oldProgressionStatus,
            newProgressionStatus: $oldProgressionStatus,
            reason: trim((string) $validated['reason']),
            changedByUserId: $user->id,
            payloadSnapshot: ['event' => 'prospect_soft_deleted'],
        );

        $this->queueSyncJob(
            prospect: $prospect,
            initiatedByUserId: $user->id,
            jobType: 'iacrm.prospect.archive',
            queueName: 'sync-high',
        );

        $prospect->loadMissing([
            'business',
            'program',
            'agent.user',
            'softDeletedByUser',
        ])->loadCount('statusHistory');

        return response()->json([
            'data' => ProspectResource::make($prospect)->resolve($request),
        ]);
    }

    private function applyFilters(Builder $query, Request $request): Builder
    {
        if ($request->filled('pipeline_stage')) {
            $query->where('pipeline_stage', (string) $request->string('pipeline_stage'));
        }

        if ($request->filled('submission_status')) {
            $query->where('submission_status', (string) $request->string('submission_status'));
        }

        if ($request->filled('agent_id')) {
            $query->where('agent_id', (string) $request->string('agent_id'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));

            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('contact_name', 'ilike', "%{$search}%")
                    ->orWhere('company_name', 'ilike', "%{$search}%")
                    ->orWhere('contact_email', 'ilike', "%{$search}%")
                    ->orWhereHas('program', fn (Builder $programQuery) => $programQuery->where('name', 'ilike', "%{$search}%"))
                    ->orWhereHas('agent.user', fn (Builder $agentUserQuery) => $agentUserQuery->where('display_name', 'ilike', "%{$search}%"));
            });
        }

        return $query;
    }

    private function scopedProspectsQuery(User $user, bool $includeDeleted = false): Builder
    {
        $businessId = $this->currentBusinessId($user);
        $roleSlugs = $this->activeRoleSlugs($user, $businessId);
        $query = Prospect::query();

        if ($includeDeleted) {
            $query->withTrashed();
        }

        if ($roleSlugs->contains('agent') && ! $roleSlugs->contains('business-owner')) {
            $agent = $user->agentProfile;

            abort_if($agent === null, 403, 'No agent profile is available for this action.');

            return $query->where('agent_id', $agent->id);
        }

        if ($businessId !== null && $roleSlugs->contains('business-owner')) {
            return $query->where('business_id', $businessId);
        }

        return $query;
    }

    private function resolveApiUser(Request $request): User
    {
        /** @var User|null $user */
        $user = $request->user();

        abort_if($user === null, 401);

        return $user->loadMissing([
            'userRoles.role.permissions',
            'businessAssignments.business',
            'primaryBusinessAssignment.business',
            'agentProfile.business',
            'userPermissionOverrides.permission',
        ]);
    }

    private function assertPermission(User $user, string $permissionId, ?string $businessId = null): void
    {
        abort_unless($user->hasPermissionId($permissionId, $businessId), 403, 'Forbidden.');
    }

    private function currentBusinessId(User $user): ?string
    {
        return $user->primaryBusinessAssignment?->business_id ?? $user->agentProfile?->business_id;
    }

    private function activeRoleSlugs(User $user, ?string $businessId = null): Collection
    {
        return $user->activeRoleSlugs($businessId);
    }

    /**
     * @param array<string, mixed> $payloadSnapshot
     */
    private function recordHistory(
        Prospect $prospect,
        string $sourceSystem,
        ?string $oldSubmissionStatus,
        ?string $newSubmissionStatus,
        ?string $oldProgressionStatus,
        ?string $newProgressionStatus,
        ?string $reason,
        ?string $changedByUserId,
        array $payloadSnapshot = [],
    ): void {
        $prospect->statusHistory()->create([
            'source_system' => $sourceSystem,
            'old_submission_status' => $oldSubmissionStatus,
            'new_submission_status' => $newSubmissionStatus,
            'old_progression_status' => $oldProgressionStatus,
            'new_progression_status' => $newProgressionStatus,
            'reason' => $reason,
            'payload_snapshot' => $payloadSnapshot,
            'changed_by_user_id' => $changedByUserId,
        ]);
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

    private function queueSyncJob(
        Prospect $prospect,
        string $initiatedByUserId,
        string $jobType,
        string $queueName,
    ): void {
        SyncJob::query()->create([
            'business_id' => $prospect->business_id,
            'initiated_by_user_id' => $initiatedByUserId,
            'job_type' => $jobType,
            'entity_type' => 'prospect',
            'entity_id' => $prospect->id,
            'queue_name' => $queueName,
            'status' => 'queued',
            'attempt_count' => 0,
            'max_attempts' => 5,
            'idempotency_key' => sprintf('%s:%s:v1', $jobType, $prospect->id),
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
    }
}
