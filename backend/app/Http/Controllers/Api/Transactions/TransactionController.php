<?php

namespace App\Http\Controllers\Api\Transactions;

use App\Http\Controllers\Controller;
use App\Http\Resources\Transactions\TransactionResource;
use App\Models\Transaction;
use App\Models\User;
use App\Support\CurrentBusinessContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);

        $this->assertPermission($user, 'transaction.view', $businessId);

        $transactions = $this->applyFilters(
            $this->scopedTransactionsQuery($user)
                ->with([
                    'business',
                    'program',
                    'agent.user',
                    'prospect',
                ]),
            $request,
        )
            ->orderByDesc('occurred_at')
            ->get();

        return response()->json([
            'data' => $transactions->map(fn (Transaction $transaction) => TransactionResource::make($transaction)->resolve($request)),
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);

        $this->assertPermission($user, 'transaction.view', $businessId);

        $query = $this->applyFilters($this->scopedTransactionsQuery($user), $request);
        $transactions = $query->get();

        $validatedStatuses = ['validated', 'paid'];

        return response()->json([
            'data' => [
                'transaction_count' => $transactions->count(),
                'total_amount' => round((float) $transactions->sum('amount'), 2),
                'validated_amount' => round((float) $transactions->whereIn('status', $validatedStatuses)->sum('amount'), 2),
                'paid_amount' => round((float) $transactions->where('status', 'paid')->sum('amount'), 2),
                'points_awarded_total' => (int) $transactions->sum('points_awarded'),
                'linked_prospect_count' => $transactions->whereNotNull('prospect_id')->pluck('prospect_id')->unique()->count(),
                'status_breakdown' => [
                    'detected' => $transactions->where('status', 'detected')->count(),
                    'pending' => $transactions->where('status', 'pending')->count(),
                    'validated' => $transactions->where('status', 'validated')->count(),
                    'rejected' => $transactions->where('status', 'rejected')->count(),
                    'paid' => $transactions->where('status', 'paid')->count(),
                ],
            ],
        ]);
    }

    public function show(Request $request, string $transactionId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'transaction.view', $businessId);

        $transaction = $this->scopedTransactionsQuery($user)
            ->with([
                'business',
                'program',
                'agent.user',
                'prospect',
            ])
            ->findOrFail($transactionId);

        return response()->json([
            'data' => TransactionResource::make($transaction)->resolve($request),
        ]);
    }

    private function applyFilters(Builder $query, Request $request): Builder
    {
        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('business_id')) {
            $query->where('business_id', (string) $request->string('business_id'));
        }

        if ($request->filled('program_id')) {
            $query->where('program_id', (string) $request->string('program_id'));
        }

        if ($request->filled('agent_id')) {
            $query->where('agent_id', (string) $request->string('agent_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('occurred_at', '>=', (string) $request->string('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('occurred_at', '<=', (string) $request->string('date_to'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));

            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('transaction_reference', 'ilike', "%{$search}%")
                    ->orWhere('product_name', 'ilike', "%{$search}%")
                    ->orWhereHas('prospect', function (Builder $prospectQuery) use ($search): void {
                        $prospectQuery
                            ->where('contact_name', 'ilike', "%{$search}%")
                            ->orWhere('company_name', 'ilike', "%{$search}%");
                    })
                    ->orWhereHas('program', fn (Builder $programQuery) => $programQuery->where('name', 'ilike', "%{$search}%"))
                    ->orWhereHas('agent.user', fn (Builder $agentUserQuery) => $agentUserQuery->where('display_name', 'ilike', "%{$search}%"));
            });
        }

        return $query;
    }

    private function scopedTransactionsQuery(User $user): Builder
    {
        $businessId = $this->currentBusinessId($user);
        $roleSlugs = $this->activeRoleSlugs($user, $businessId);
        $query = Transaction::query();

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

    private function currentBusinessId(Request|User $requestOrUser, ?User $user = null): ?string
    {
        if ($requestOrUser instanceof Request) {
            return CurrentBusinessContext::resolve($user, $requestOrUser);
        }

        return CurrentBusinessContext::resolve($requestOrUser);
    }

    private function activeRoleSlugs(User $user, ?string $businessId = null): Collection
    {
        return $user->activeRoleSlugs($businessId);
    }
}
