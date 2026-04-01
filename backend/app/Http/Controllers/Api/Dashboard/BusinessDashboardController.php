<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Prospect;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class BusinessDashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        abort_if($businessId === null, 403, 'No active business scope is available.');

        $roleSlugs = $this->activeRoleSlugs($user, $businessId);

        abort_unless($roleSlugs->contains('business-owner'), 403, 'Forbidden.');
        $this->assertPermission($user, 'dashboard.view-business', $businessId);

        $prospects = Prospect::query()
            ->where('business_id', $businessId)
            ->get([
                'id',
                'agent_id',
                'submitted_at',
                'deleted_at',
            ]);

        $transactions = Transaction::query()
            ->where('business_id', $businessId)
            ->get([
                'id',
                'agent_id',
                'prospect_id',
                'status',
                'points_awarded',
                'occurred_at',
            ]);
        $agents = Agent::query()
            ->where('business_id', $businessId)
            ->get([
                'id',
                'status',
                'activated_at',
                'invited_at',
                'created_at',
            ]);

        [$currentStart, $currentEnd, $previousStart, $previousEnd] = $this->resolveComparisonPeriods();

        $activeProspects = $prospects->whereNull('deleted_at');
        $activeTransactions = $transactions;

        $currentProspects = $this->filterByDateRange($activeProspects, 'submitted_at', $currentStart, $currentEnd);
        $previousProspects = $this->filterByDateRange($activeProspects, 'submitted_at', $previousStart, $previousEnd);

        $currentTransactions = $this->filterByDateRange($activeTransactions, 'occurred_at', $currentStart, $currentEnd);
        $previousTransactions = $this->filterByDateRange($activeTransactions, 'occurred_at', $previousStart, $previousEnd);
        $historicalTransactionsBeforeCurrentMonth = $activeTransactions->filter(function ($transaction) use ($currentStart): bool {
            if ($transaction->occurred_at === null) {
                return false;
            }

            return CarbonImmutable::parse($transaction->occurred_at)->lt($currentStart);
        });
        $historicalProspectsBeforeCurrentMonth = $activeProspects->filter(function ($prospect) use ($currentStart): bool {
            if ($prospect->submitted_at === null) {
                return false;
            }

            return CarbonImmutable::parse($prospect->submitted_at)->lt($currentStart);
        });

        $totalProspects = $activeProspects->count();
        $totalConvertedClients = $this->uniqueLinkedProspectCount($activeTransactions);
        $totalConversionRate = $totalProspects > 0
            ? (int) round(($totalConvertedClients / $totalProspects) * 100)
            : 0;

        $currentConvertedClients = $this->uniqueLinkedProspectCount($currentTransactions);
        $previousConvertedClients = $this->uniqueLinkedProspectCount($previousTransactions);

        $currentConversionRate = $currentProspects->count() > 0
            ? (int) round(($currentConvertedClients / $currentProspects->count()) * 100)
            : 0;
        $previousConversionRate = $previousProspects->count() > 0
            ? (int) round(($previousConvertedClients / $previousProspects->count()) * 100)
            : 0;

        $activeAgents = $agents->where('status', 'active')->values();

        $contributingAffiliates = $activeAgents->count();
        $addedContributorCount = $activeAgents
            ->filter(function ($agent) use ($currentStart, $currentEnd): bool {
                $referenceDate = $agent->activated_at ?? $agent->invited_at ?? $agent->created_at;
                if ($referenceDate === null) {
                    return false;
                }

                return CarbonImmutable::parse($referenceDate)->betweenIncluded($currentStart, $currentEnd);
            })
            ->count();

        $pointsAutoAttributed = (int) $activeTransactions->sum(fn ($transaction) => (int) ($transaction->points_awarded ?? 0));
        $currentPointsAutoAttributed = (int) $currentTransactions->sum(fn ($transaction) => (int) ($transaction->points_awarded ?? 0));

        return response()->json([
            'data' => [
                'cards' => [
                    [
                        'key' => 'prospects_synced',
                        'title' => 'Prospects synchronises',
                        'value' => (string) $totalProspects,
                        'description' => 'Total actifs',
                        'tone' => 'primary',
                        'badge' => $this->buildPercentChangeBadge($currentProspects->count(), $previousProspects->count()),
                    ],
                    [
                        'key' => 'clients_converted',
                        'title' => 'Clients convertis',
                        'value' => (string) $totalConvertedClients,
                        'description' => 'Total convertis',
                        'tone' => 'success',
                        'badge' => $this->buildPercentChangeBadge($currentConvertedClients, $previousConvertedClients),
                    ],
                    [
                        'key' => 'prospect_to_client_rate',
                        'title' => 'Taux prospect -> client',
                        'value' => sprintf('%d%%', $totalConversionRate),
                        'description' => 'Taux actuel',
                        'tone' => 'warning',
                        'badge' => [
                            'tone' => 'warning',
                            'label' => sprintf('Mois precedent %d%%', $previousConversionRate),
                            'icon' => null,
                        ],
                    ],
                    [
                        'key' => 'affiliates_contributors',
                        'title' => 'Affilies contributeurs',
                        'value' => (string) $contributingAffiliates,
                        'description' => 'Total contributeurs',
                        'tone' => 'info',
                        'badge' => [
                            'tone' => $addedContributorCount > 0 ? 'success' : 'neutral',
                            'label' => sprintf(
                                '%s%d %s ce mois',
                                $addedContributorCount > 0 ? '+' : '',
                                $addedContributorCount,
                                $addedContributorCount === 1 ? 'agent' : 'agents',
                            ),
                            'icon' => null,
                        ],
                    ],
                    [
                        'key' => 'points_auto_awarded',
                        'title' => 'Points attribues auto',
                        'value' => number_format($currentPointsAutoAttributed, 0, '.', ',').' pts',
                        'description' => 'Points ce mois',
                        'tone' => 'info',
                        'badge' => [
                            'tone' => 'info',
                            'label' => sprintf('Total %s pts', number_format($pointsAutoAttributed, 0, '.', ',')),
                            'helper_text' => null,
                            'icon' => null,
                        ],
                    ],
                ],
            ],
        ]);
    }

    private function resolveComparisonPeriods(): array
    {
        $currentEnd = CarbonImmutable::now();
        $currentStart = $currentEnd->startOfMonth();
        $previousStart = $currentStart->subMonthNoOverflow()->startOfMonth();
        $previousEnd = $previousStart->endOfMonth();

        return [$currentStart, $currentEnd, $previousStart, $previousEnd];
    }

    private function filterByDateRange(
        Collection $items,
        string $field,
        CarbonImmutable $start,
        CarbonImmutable $end,
    ): Collection {
        return $items->filter(function ($item) use ($field, $start, $end): bool {
            $value = $item->{$field};

            if ($value === null) {
                return false;
            }

            $date = CarbonImmutable::parse($value);

            return $date->betweenIncluded($start, $end);
        })->values();
    }

    private function uniqueLinkedProspectCount(Collection $transactions): int
    {
        return $transactions
            ->filter(fn ($transaction) => in_array($transaction->status, ['validated', 'paid'], true))
            ->pluck('prospect_id')
            ->filter()
            ->unique()
            ->count();
    }

    private function buildPercentChangeBadge(int|float $current, int|float $previous): array
    {
        if ($current === 0 && $previous === 0) {
            return [
                'tone' => 'neutral',
                'label' => '0% vs le mois dernier',
                'icon' => 'neutral',
            ];
        }

        if ($current === $previous) {
            return [
                'tone' => 'neutral',
                'label' => '0% vs le mois dernier',
                'icon' => 'neutral',
            ];
        }

        if ($previous == 0) {
            return [
                'tone' => $current > 0 ? 'success' : 'neutral',
                'label' => $current > 0 ? '+100% vs le mois dernier' : '0% vs le mois dernier',
                'icon' => $current > 0 ? 'up' : 'neutral',
            ];
        }

        $change = (($current - $previous) / $previous) * 100;
        $rounded = round(abs($change), 1);
        $roundedSigned = round($change, 1);

        if ($roundedSigned == 0.0) {
            return [
                'tone' => 'neutral',
                'label' => '0% vs le mois dernier',
                'icon' => 'neutral',
            ];
        }

        $formatted = floor($rounded) === $rounded
            ? (string) (int) $rounded
            : number_format($rounded, 1, '.', '');

        return [
            'tone' => $change > 0 ? 'success' : 'danger',
            'label' => sprintf('%s%s%% vs le mois dernier', $change > 0 ? '+' : '-', $formatted),
            'icon' => $change > 0 ? 'up' : 'down',
        ];
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
