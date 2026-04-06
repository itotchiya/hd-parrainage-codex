<?php

namespace App\Http\Controllers\Api\Frontend2\Points;

// Frontend2-only controller. Keep prototype wallet and points-summary calculations isolated from the original frontend points endpoints.

use App\Http\Controllers\Controller;
use App\Models\ExchangeRequest;
use App\Models\PointsLedger;
use App\Models\Prospect;
use App\Models\Program;
use App\Models\User;
use App\Support\Frontend2\Frontend2PointsMetrics;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class Frontend2PointsController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'points.view', $businessId);

        $ledgerEntries = $this->filteredLedgerEntries($request, $user);
        $openProspects = $this->filteredOpenProspects($request, $user);
        $exchangeRequests = $this->filteredExchangeRequests($request, $user);
        $metrics = Frontend2PointsMetrics::summarize($ledgerEntries, $exchangeRequests);

        return response()->json([
            'data' => [
                'forecast_points' => $this->forecastPointsForProspects($openProspects),
                'pending_points' => $this->sumLedgerPointsByStatus($ledgerEntries, 'pending'),
                'available_points' => $metrics['available_points'],
                'locked_points' => $metrics['locked_points'],
                'consumed_points' => $metrics['consumed_points'],
                'reversed_points' => $metrics['reversed_points'],
                'open_prospect_count' => $openProspects->count(),
                'ledger_entry_count' => $ledgerEntries->count(),
                'active_exchange_request_count' => $metrics['active_exchange_request_count'],
            ],
        ]);
    }

    public function byProgram(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'points.view', $businessId);

        $ledgerEntries = $this->filteredLedgerEntries($request, $user);
        $openProspects = $this->filteredOpenProspects($request, $user);
        $exchangeRequests = $this->filteredExchangeRequests($request, $user);

        $programIds = $ledgerEntries
            ->pluck('program_id')
            ->merge($openProspects->pluck('program_id'))
            ->merge($exchangeRequests->pluck('program_id'))
            ->filter()
            ->unique()
            ->values();

        $programs = Program::query()
            ->whereIn('id', $programIds)
            ->with('exchangePack.items')
            ->get()
            ->keyBy('id');

        $groupedLedger = $ledgerEntries->groupBy('program_id');
        $groupedProspects = $openProspects->groupBy('program_id');
        $groupedExchangeRequests = $exchangeRequests->groupBy('program_id');

        $data = $programIds->map(function (string $programId) use ($groupedLedger, $groupedProspects, $groupedExchangeRequests, $programs): array {
            $program = $programs->get($programId);
            $entries = $groupedLedger->get($programId, collect());
            $prospects = $groupedProspects->get($programId, collect());
            $requests = $groupedExchangeRequests->get($programId, collect());
            $metrics = Frontend2PointsMetrics::summarize($entries, $requests);

            return [
                'program_id' => $programId,
                'program_name' => $program?->name,
                'program_slug' => $program?->slug,
                'exchange_mode' => $program?->exchange_mode,
                'exchange_pack_name' => $program?->exchangePack?->name,
                'exchange_pack_items' => $program?->exchangePack?->items
                    ?->where('status', 'active')
                    ->values()
                    ->map(fn ($item) => [
                        'id' => $item->id,
                        'title' => $item->title,
                        'points_cost' => $item->points_cost,
                        'status' => $item->status,
                    ])
                    ->all() ?? [],
                'forecast_points' => $this->forecastPointsForProspects($prospects),
                'pending_points' => $this->sumLedgerPointsByStatus($entries, 'pending'),
                'available_points' => $metrics['available_points'],
                'locked_points' => $metrics['locked_points'],
                'consumed_points' => $metrics['consumed_points'],
                'reversed_points' => $metrics['reversed_points'],
                'open_prospect_count' => $prospects->count(),
                'ledger_entry_count' => $entries->count(),
            ];
        })->sortByDesc('available_points')->values();

        return response()->json([
            'data' => $data,
        ]);
    }

    private function filteredLedgerEntries(Request $request, User $user): Collection
    {
        $query = $this->ledgerQuery($user);

        if ($request->filled('program_id')) {
            $query->where('program_id', (string) $request->string('program_id'));
        }

        if ($request->filled('agent_id')) {
            $query->where('agent_id', (string) $request->string('agent_id'));
        }

        return $query->get();
    }

    private function filteredOpenProspects(Request $request, User $user): Collection
    {
        $query = $this->openProspectsQuery($user);

        if ($request->filled('program_id')) {
            $query->where('program_id', (string) $request->string('program_id'));
        }

        if ($request->filled('agent_id')) {
            $query->where('agent_id', (string) $request->string('agent_id'));
        }

        return $query
            ->with(['program', 'transactions'])
            ->get();
    }

    private function filteredExchangeRequests(Request $request, User $user): Collection
    {
        $query = $this->exchangeRequestsQuery($user);

        if ($request->filled('program_id')) {
            $query->where('program_id', (string) $request->string('program_id'));
        }

        if ($request->filled('agent_id')) {
            $query->where('agent_id', (string) $request->string('agent_id'));
        }

        return $query->get();
    }

    private function ledgerQuery(User $user): Builder
    {
        $businessId = $this->currentBusinessId($user);
        $roleSlugs = $this->activeRoleSlugs($user, $businessId);
        $query = PointsLedger::query();

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

    private function exchangeRequestsQuery(User $user): Builder
    {
        $businessId = $this->currentBusinessId($user);
        $roleSlugs = $this->activeRoleSlugs($user, $businessId);
        $query = ExchangeRequest::query();

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

    private function openProspectsQuery(User $user): Builder
    {
        $businessId = $this->currentBusinessId($user);
        $roleSlugs = $this->activeRoleSlugs($user, $businessId);
        $query = Prospect::query()
            ->where('conversion_status', 'open')
            ->whereNull('deleted_at');

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

    private function forecastPointsForProspects(Collection $prospects): int
    {
        return $prospects->sum(function (Prospect $prospect): int {
            $program = $prospect->program;

            if ($program === null) {
                return 0;
            }

            $latestCommercialSignal = $prospect->transactions
                ->sortByDesc('occurred_at')
                ->first(fn ($transaction) => in_array($transaction->status, ['detected', 'pending'], true));

            if ($latestCommercialSignal !== null) {
                return match ($program->commission_type) {
                    'per_transaction' => (int) ($program->points_per_transaction ?? 0),
                    'revenue_tier' => $program->points_per_euro === null ? 0 : (int) round(((float) $latestCommercialSignal->amount) * ($program->points_per_euro / 100)),
                    default => 0,
                };
            }

            return match ($program->commission_type) {
                'per_transaction' => (int) ($program->points_per_transaction ?? 0),
                default => 0,
            };
        });
    }

    private function sumLedgerPointsByStatus(Collection $entries, string $status): int
    {
        return (int) $entries
            ->where('entry_status', $status)
            ->sum('points_delta');
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
}
