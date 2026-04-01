<?php

namespace App\Http\Controllers\Api\Sync;

use App\Http\Controllers\Controller;
use App\Http\Resources\Sync\SyncJobResource;
use App\Models\SyncJob;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SyncJobController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);
        $this->assertPermission($user, 'iacrm.sync-view', $businessId);

        $baseQuery = $this->scopedSyncJobsQuery($user);

        $statusCounts = collect([
            'queued',
            'processing',
            'succeeded',
            'failed',
            'dead_lettered',
            'cancelled',
        ])->mapWithKeys(fn (string $status): array => [
            $status => (clone $baseQuery)->where('status', $status)->count(),
        ]);

        $jobs = (clone $baseQuery)->count();
        $failedJobs = $statusCounts->get('failed', 0) + $statusCounts->get('dead_lettered', 0);
        $latestFailure = (clone $baseQuery)
            ->whereIn('status', ['failed', 'dead_lettered'])
            ->orderByDesc('failed_at')
            ->orderByDesc('dead_lettered_at')
            ->first();
        $oldestQueued = (clone $baseQuery)
            ->where('status', 'queued')
            ->orderBy('queued_at')
            ->first();

        return response()->json([
            'data' => [
                'jobs_total' => $jobs,
                'status_counts' => $statusCounts,
                'failed_jobs_total' => $failedJobs,
                'queue_names' => (clone $baseQuery)
                    ->select('queue_name')
                    ->distinct()
                    ->orderBy('queue_name')
                    ->pluck('queue_name')
                    ->values(),
                'oldest_queued_at' => $oldestQueued?->queued_at?->toISOString(),
                'latest_failure' => $latestFailure === null
                    ? null
                    : SyncJobResource::make($latestFailure->loadMissing(['business', 'initiatedByUser']))->resolve($request),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);
        $this->assertPermission($user, 'iacrm.sync-view', $businessId);

        $query = $this->scopedSyncJobsQuery($user)
            ->with(['business', 'initiatedByUser']);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('job_type')) {
            $query->where('job_type', (string) $request->string('job_type'));
        }

        if ($request->filled('entity_type')) {
            $query->where('entity_type', (string) $request->string('entity_type'));
        }

        if ($request->filled('queue_name')) {
            $query->where('queue_name', (string) $request->string('queue_name'));
        }

        $jobs = $query
            ->orderByDesc('queued_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $jobs->map(fn (SyncJob $job) => SyncJobResource::make($job)->resolve($request)),
            'meta' => [
                'total' => $jobs->count(),
            ],
        ]);
    }

    public function show(Request $request, string $jobId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);
        $this->assertPermission($user, 'iacrm.sync-view', $businessId);

        $job = $this->scopedSyncJobsQuery($user)
            ->with(['business', 'initiatedByUser'])
            ->findOrFail($jobId);

        return response()->json([
            'data' => SyncJobResource::make($job)->resolve($request),
        ]);
    }

    public function retry(Request $request, string $jobId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);
        $this->assertPermission($user, 'iacrm.sync-retry', $businessId);

        $job = $this->scopedSyncJobsQuery($user)->findOrFail($jobId);
        abort_unless(in_array($job->status, ['failed', 'dead_lettered'], true), 422, 'Only failed sync jobs can be retried.');

        $retryJob = SyncJob::query()->create([
            'business_id' => $job->business_id,
            'initiated_by_user_id' => $user->id,
            'job_type' => $job->job_type,
            'entity_type' => $job->entity_type,
            'entity_id' => $job->entity_id,
            'queue_name' => $job->queue_name,
            'status' => 'queued',
            'attempt_count' => 0,
            'max_attempts' => $job->max_attempts,
            'idempotency_key' => sprintf(
                '%s:retry:%s',
                $job->idempotency_key,
                Str::lower((string) Str::uuid()),
            ),
            'payload' => array_merge($job->payload ?? [], [
                'retry_of_job_id' => $job->id,
                'retry_requested_at' => now()->toISOString(),
                'retry_requested_by_user_id' => $user->id,
            ]),
            'response_payload' => [],
            'queued_at' => now(),
        ]);

        $retryJob->loadMissing(['business', 'initiatedByUser']);

        return response()->json([
            'data' => SyncJobResource::make($retryJob)->resolve($request),
        ], 201);
    }

    private function scopedSyncJobsQuery(User $user): Builder
    {
        $businessId = $this->currentBusinessId($user);
        $roleSlugs = $user->activeRoleSlugs($businessId);
        $query = SyncJob::query();

        if ($roleSlugs->contains('super-admin')) {
            return $query;
        }

        if ($businessId !== null) {
            return $query->where('business_id', $businessId);
        }

        return $query->whereRaw('1 = 0');
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

    private function currentBusinessId(User $user): ?string
    {
        return $user->primaryBusinessAssignment?->business_id ?? $user->agentProfile?->business_id;
    }

    private function assertPermission(User $user, string $permissionId, ?string $businessId = null): void
    {
        abort_unless($user->hasPermissionId($permissionId, $businessId), 403, 'Forbidden.');
    }
}
