<?php

namespace App\Http\Controllers\Api\Businesses;

use App\Http\Controllers\Controller;
use App\Http\Resources\Businesses\BusinessDetailResource;
use App\Http\Resources\Businesses\BusinessListResource;
use App\Models\Business;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BusinessController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.view');

        $query = Business::query()
            ->with([
                'userAssignments.user',
            ])
            ->withCount([
                'agents',
                'programs',
                'prospects',
                'transactions',
                'exchangeRequests as exchange_requests_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
            ]);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('display_name', 'ilike', "%{$search}%")
                    ->orWhere('legal_name', 'ilike', "%{$search}%")
                    ->orWhere('industry', 'ilike', "%{$search}%")
                    ->orWhere('slug', 'ilike', "%{$search}%")
                    ->orWhereHas('userAssignments.user', function (Builder $userQuery) use ($search): void {
                        $userQuery
                            ->where('display_name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    });
            });
        }

        $records = $query
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 WHEN status = 'approved' THEN 1 WHEN status = 'rejected' THEN 2 ELSE 3 END")
            ->orderBy('display_name')
            ->get();

        return response()->json([
            'data' => $records->map(fn (Business $business) => BusinessListResource::make($business)->resolve($request)),
        ]);
    }

    public function show(Request $request, string $businessId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.view');

        $business = Business::query()
            ->with([
                'approvedByUser',
                'rejectedByUser',
                'userAssignments.user',
                'programs' => fn ($query) => $query->orderBy('name'),
            ])
            ->withCount([
                'programs',
                'programs as active_programs_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                'agents',
                'agents as active_agents_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                'prospects',
                'transactions',
                'exchangeRequests as exchange_requests_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
            ])
            ->findOrFail($businessId);

        return response()->json([
            'data' => BusinessDetailResource::make($business)->resolve($request),
        ]);
    }

    public function approve(Request $request, string $businessId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.approve');

        $business = Business::query()->findOrFail($businessId);

        if ($business->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending businesses can be approved.',
            ]);
        }

        $business->forceFill([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by_user_id' => $user->id,
            'rejected_at' => null,
            'rejected_by_user_id' => null,
            'archived_at' => null,
        ])->save();

        return response()->json([
            'data' => BusinessDetailResource::make(
                $business->fresh([
                    'approvedByUser',
                    'rejectedByUser',
                    'userAssignments.user',
                    'programs',
                ])->loadCount([
                    'programs',
                    'programs as active_programs_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                    'agents',
                    'agents as active_agents_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                    'prospects',
                    'transactions',
                    'exchangeRequests as exchange_requests_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
                ])
            )->resolve($request),
        ]);
    }

    public function reject(Request $request, string $businessId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.reject');

        $business = Business::query()->findOrFail($businessId);

        if ($business->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending businesses can be rejected.',
            ]);
        }

        $business->forceFill([
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejected_by_user_id' => $user->id,
            'approved_at' => null,
            'approved_by_user_id' => null,
        ])->save();

        return response()->json([
            'data' => BusinessDetailResource::make(
                $business->fresh([
                    'approvedByUser',
                    'rejectedByUser',
                    'userAssignments.user',
                    'programs',
                ])->loadCount([
                    'programs',
                    'programs as active_programs_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                    'agents',
                    'agents as active_agents_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                    'prospects',
                    'transactions',
                    'exchangeRequests as exchange_requests_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
                ])
            )->resolve($request),
        ]);
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

    private function assertPermission(User $user, string $permissionId): void
    {
        abort_unless($user->hasPermissionId($permissionId), 403, 'Forbidden.');
    }
}
