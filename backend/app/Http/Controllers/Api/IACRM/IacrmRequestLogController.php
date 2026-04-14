<?php

namespace App\Http\Controllers\Api\Iacrm;

use App\Http\Controllers\Controller;
use App\Http\Resources\Iacrm\IacrmRequestLogResource;
use App\Models\IacrmRequestLog;
use App\Models\User;
use App\Support\CurrentBusinessContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IacrmRequestLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);
        $this->assertPermission($user, 'iacrm.sync-view', $businessId);

        $query = $this->scopedLogsQuery($user)
            ->with(['business', 'initiatedByUser']);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('actor_type')) {
            $query->where('actor_type', (string) $request->string('actor_type'));
        }

        if ($request->filled('direction')) {
            $query->where('direction', (string) $request->string('direction'));
        }

        if ($request->filled('source')) {
            $query->where('source', (string) $request->string('source'));
        }

        if ($request->filled('method')) {
            $query->where('method', strtoupper((string) $request->string('method')));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('endpoint', 'ilike', "%{$search}%")
                    ->orWhere('source', 'ilike', "%{$search}%")
                    ->orWhere('error_message', 'ilike', "%{$search}%");
            });
        }

        $limit = max(10, min((int) $request->integer('limit', 100), 250));

        $logs = $query
            ->orderByDesc('requested_at')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $logs->map(fn (IacrmRequestLog $log) => IacrmRequestLogResource::make($log)->resolve($request)),
            'meta' => [
                'total' => $logs->count(),
                'limit' => $limit,
            ],
        ]);
    }

    public function storeFrontend(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);
        $this->assertPermission($user, 'iacrm.sync-view', $businessId);

        $validated = $request->validate([
            'source' => ['required', 'string', 'max:64'],
            'direction' => ['required', 'string', 'max:16'],
            'method' => ['required', 'string', 'max:16'],
            'endpoint' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', 'max:16'],
            'status_code' => ['nullable', 'integer', 'min:0', 'max:999'],
            'duration_ms' => ['nullable', 'integer', 'min:0'],
            'error_message' => ['nullable', 'string', 'max:2000'],
            'request_payload' => ['nullable', 'array'],
            'response_payload' => ['nullable', 'array'],
            'meta' => ['nullable', 'array'],
            'requested_at' => ['nullable', 'date'],
        ]);

        $log = IacrmRequestLog::query()->create([
            'business_id' => $businessId,
            'initiated_by_user_id' => $user->id,
            'sync_job_id' => null,
            'actor_type' => 'webapp',
            'source' => (string) $validated['source'],
            'direction' => (string) $validated['direction'],
            'method' => strtoupper((string) $validated['method']),
            'endpoint' => (string) $validated['endpoint'],
            'status' => (string) $validated['status'],
            'status_code' => $validated['status_code'] ?? null,
            'duration_ms' => $validated['duration_ms'] ?? null,
            'error_message' => $validated['error_message'] ?? null,
            'request_payload' => $validated['request_payload'] ?? [],
            'response_payload' => $validated['response_payload'] ?? [],
            'meta' => $validated['meta'] ?? [],
            'requested_at' => $validated['requested_at'] ?? now(),
        ]);

        $log->loadMissing(['business', 'initiatedByUser']);

        return response()->json([
            'data' => IacrmRequestLogResource::make($log)->resolve($request),
        ], 201);
    }

    private function scopedLogsQuery(User $user): Builder
    {
        $businessId = $this->currentBusinessId($user);
        $roleSlugs = $user->activeRoleSlugs($businessId);
        $query = IacrmRequestLog::query();

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

    private function currentBusinessId(Request|User $requestOrUser, ?User $user = null): ?string
    {
        if ($requestOrUser instanceof Request) {
            return CurrentBusinessContext::resolve($user, $requestOrUser);
        }

        return CurrentBusinessContext::resolve($requestOrUser);
    }

    private function assertPermission(User $user, string $permissionId, ?string $businessId = null): void
    {
        abort_unless($user->hasPermissionId($permissionId, $businessId), 403, 'Forbidden.');
    }
}
