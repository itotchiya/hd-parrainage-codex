<?php

namespace App\Http\Controllers\Api\Frontend2\Dashboard;

// Frontend2-only controller. Keep prototype KPI contracts isolated from the original frontend dashboard endpoints.

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Business;
use App\Models\ExchangeRequest;
use App\Models\PointsLedger;
use App\Models\Program;
use App\Models\Prospect;
use App\Models\Transaction;
use App\Support\Frontend2\Frontend2PointsMetrics;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class Frontend2DashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);
        $roleSlugs = $this->activeRoleSlugs($user, $businessId);

        if ($roleSlugs->contains('super-admin')) {
            $this->assertPermission($user, 'dashboard.view-platform', $businessId);

            return response()->json([
                'data' => [
                    'cards' => $this->platformCards(),
                ],
            ]);
        }

        if ($roleSlugs->contains('business-owner')) {
            abort_if($businessId === null, 403, 'No active business scope is available.');
            $this->assertPermission($user, 'dashboard.view-business', $businessId);

            return response()->json([
                'data' => [
                    'cards' => $this->businessCards($businessId),
                ],
            ]);
        }

        if ($roleSlugs->contains('agent')) {
            $agent = $user->agentProfile;

            abort_if($agent === null, 403, 'No agent profile is available for this action.');
            $this->assertPermission($user, 'dashboard.view-own', $agent->business_id);

            return response()->json([
                'data' => [
                    'cards' => $this->agentCards($agent),
                ],
            ]);
        }

        abort(403, 'Forbidden.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function platformCards(): array
    {
        $transactions = Transaction::query()->get([
            'id',
            'agent_id',
            'prospect_id',
            'status',
            'amount',
            'points_awarded',
        ]);
        $businesses = Business::query()->get(['id', 'status']);
        $agents = Agent::query()->get(['id', 'status']);
        $prospects = Prospect::query()->whereNull('deleted_at')->get(['id']);

        $totalAmount = round((float) $transactions->sum('amount'), 2);
        $totalPointsAwarded = (int) $transactions->sum(fn (Transaction $transaction) => (int) ($transaction->points_awarded ?? 0));
        $approvedBusinessesCount = $businesses->where('status', 'approved')->count();
        $activeAgentsCount = $agents->where('status', 'active')->count();
        $pendingPointsVolume = (int) $transactions
            ->where('status', 'pending')
            ->sum(fn (Transaction $transaction) => (int) ($transaction->points_awarded ?? 0));
        $arpuBusiness = $approvedBusinessesCount > 0 ? round($totalAmount / $approvedBusinessesCount, 2) : 0;
        $agentsWithTransactionsCount = $transactions->pluck('agent_id')->filter()->unique()->count();
        $agentActivationRate = $activeAgentsCount > 0
            ? (int) round(($agentsWithTransactionsCount / $activeAgentsCount) * 100)
            : 0;
        $convertedProspectsCount = $transactions
            ->whereIn('status', ['validated', 'paid'])
            ->pluck('prospect_id')
            ->filter()
            ->unique()
            ->count();
        $globalConversionRate = $prospects->count() > 0
            ? (int) round(($convertedProspectsCount / $prospects->count()) * 100)
            : 0;

        return [
            [
                'key' => 'points_totaux',
                'title' => 'Points totaux',
                'value' => number_format($totalAmount, 0, '.', ',').' pts',
                'description' => 'Volume global genere',
                'tone' => 'primary',
            ],
            [
                'key' => 'points_distribues',
                'title' => 'Points distribues',
                'value' => number_format($totalPointsAwarded, 0, '.', ',').' pts',
                'description' => 'Total valide',
                'tone' => 'cyan',
            ],
            [
                'key' => 'entreprises',
                'title' => 'Entreprises',
                'value' => (string) $businesses->count(),
                'description' => sprintf('%d approuvees', $approvedBusinessesCount),
                'tone' => 'success',
            ],
            [
                'key' => 'affilies_actifs',
                'title' => 'Affilies actifs',
                'value' => (string) $activeAgentsCount,
                'description' => 'Sur la plateforme',
                'tone' => 'warning',
            ],
            [
                'key' => 'points_en_attente',
                'title' => 'Points en attente',
                'value' => number_format($pendingPointsVolume, 0, '.', ',').' pts',
                'description' => 'Volume a regulariser',
                'tone' => 'warning',
            ],
            [
                'key' => 'points_par_entreprise',
                'title' => 'Points / Entr. (ARPU)',
                'value' => number_format($arpuBusiness, 0, '.', ',').' pts',
                'description' => 'Moyenne par entreprise',
                'tone' => 'cyan',
            ],
            [
                'key' => 'activation_affilies',
                'title' => 'Activation Affilies',
                'value' => sprintf('%d%%', $agentActivationRate),
                'description' => 'Affilies ayant performe',
                'tone' => 'success',
            ],
            [
                'key' => 'conversion_globale',
                'title' => 'Conversion globale',
                'value' => sprintf('%d%%', $globalConversionRate),
                'description' => 'Clients / total prospects',
                'tone' => 'primary',
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function businessCards(string $businessId): array
    {
        $prospects = Prospect::query()
            ->where('business_id', $businessId)
            ->whereNull('deleted_at')
            ->get([
                'id',
                'agent_id',
                'submitted_at',
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

        $currentProspects = $this->filterByDateRange($prospects, 'submitted_at', $currentStart, $currentEnd);
        $previousProspects = $this->filterByDateRange($prospects, 'submitted_at', $previousStart, $previousEnd);
        $currentTransactions = $this->filterByDateRange($transactions, 'occurred_at', $currentStart, $currentEnd);
        $previousTransactions = $this->filterByDateRange($transactions, 'occurred_at', $previousStart, $previousEnd);

        $totalProspects = $prospects->count();
        $totalConvertedClients = $this->uniqueLinkedProspectCount($transactions);
        $totalConversionRate = $totalProspects > 0
            ? (int) round(($totalConvertedClients / $totalProspects) * 100)
            : 0;

        $currentConvertedClients = $this->uniqueLinkedProspectCount($currentTransactions);
        $previousConvertedClients = $this->uniqueLinkedProspectCount($previousTransactions);
        $previousConversionRate = $previousProspects->count() > 0
            ? (int) round(($previousConvertedClients / $previousProspects->count()) * 100)
            : 0;

        $activeAgents = $agents->where('status', 'active')->values();
        $addedContributorCount = $activeAgents
            ->filter(function (Agent $agent) use ($currentStart, $currentEnd): bool {
                $referenceDate = $agent->activated_at ?? $agent->invited_at ?? $agent->created_at;

                if ($referenceDate === null) {
                    return false;
                }

                return CarbonImmutable::parse($referenceDate)->betweenIncluded($currentStart, $currentEnd);
            })
            ->count();

        $pointsAutoAttributed = (int) $transactions->sum(fn (Transaction $transaction) => (int) ($transaction->points_awarded ?? 0));
        $currentPointsAutoAttributed = (int) $currentTransactions->sum(fn (Transaction $transaction) => (int) ($transaction->points_awarded ?? 0));

        return [
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
                'value' => (string) $activeAgents->count(),
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
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function agentCards(Agent $agent): array
    {
        $transactions = Transaction::query()
            ->where('agent_id', $agent->id)
            ->get([
                'id',
                'prospect_id',
                'program_id',
                'status',
                'points_awarded',
            ]);
        $prospects = Prospect::query()
            ->where('agent_id', $agent->id)
            ->whereNull('deleted_at')
            ->get([
                'id',
                'program_id',
                'submission_status',
            ]);
        $exchangeRequests = ExchangeRequest::query()
            ->where('agent_id', $agent->id)
            ->get([
                'id',
                'request_type',
                'status',
                'points_amount',
                'cash_amount',
            ]);
        $ledgerEntries = PointsLedger::query()
            ->where('agent_id', $agent->id)
            ->get([
                'id',
                'program_id',
                'exchange_request_id',
                'entry_status',
                'points_delta',
            ]);
        $programs = Program::query()
            ->whereHas('agentAssignments', function (Builder $builder) use ($agent): void {
                $builder
                    ->where('agent_id', $agent->id)
                    ->where('status', 'active');
            })
            ->get([
                'id',
                'status',
            ]);

        $pointsMetrics = Frontend2PointsMetrics::summarize($ledgerEntries, $exchangeRequests);
        $pendingPoints = (int) $ledgerEntries
            ->where('entry_status', 'pending')
            ->sum('points_delta');
        $generatedPoints = (int) $transactions->sum(fn (Transaction $transaction) => (int) ($transaction->points_awarded ?? 0));
        $cashExchanged = round((float) $exchangeRequests
            ->where('request_type', 'cash')
            ->whereIn('status', ['approved', 'processing', 'completed'])
            ->sum('cash_amount'), 2);
        $activeProgramsCount = $programs->where('status', 'active')->count();
        $hotProspectsCount = $prospects->where('submission_status', 'prospect-chaud')->count();
        $convertedClientsCount = $transactions
            ->whereIn('status', ['validated', 'paid'])
            ->pluck('prospect_id')
            ->filter()
            ->unique()
            ->count();
        $conversionRate = $prospects->count() > 0
            ? (int) round(($convertedClientsCount / $prospects->count()) * 100)
            : 0;

        return [
            [
                'key' => 'available_points',
                'title' => 'Solde de points disponible',
                'value' => number_format($pointsMetrics['available_points'], 0, '.', ',').' pts',
                'description' => 'Meme solde que la page Points',
                'tone' => 'primary',
            ],
            [
                'key' => 'cash_exchanged',
                'title' => 'Cash echange',
                'value' => number_format($cashExchanged, 2, '.', ',').' EUR',
                'description' => 'Conversions cash approuvees',
                'tone' => 'success',
            ],
            [
                'key' => 'redeemed_points',
                'title' => 'Points consommes',
                'value' => number_format($pointsMetrics['locked_points'] + $pointsMetrics['consumed_points'], 0, '.', ',').' pts',
                'description' => 'Points engages dans vos demandes',
                'tone' => 'warning',
            ],
            [
                'key' => 'active_programs',
                'title' => 'Programmes actifs',
                'value' => (string) $activeProgramsCount,
                'description' => 'Programmes sur lesquels vous performez',
                'tone' => 'cyan',
            ],
            [
                'key' => 'my_prospects',
                'title' => 'Mes prospects',
                'value' => (string) $prospects->count(),
                'description' => sprintf('%d demandes de devis', $hotProspectsCount),
                'tone' => 'primary',
            ],
            [
                'key' => 'converted_clients',
                'title' => 'Clients convertis',
                'value' => (string) $convertedClientsCount,
                'description' => sprintf('%s pts attribues', number_format($generatedPoints, 0, '.', ',')),
                'tone' => 'cyan',
            ],
            [
                'key' => 'pending_points',
                'title' => 'Points en attente',
                'value' => number_format($pendingPoints, 0, '.', ',').' pts',
                'description' => 'Transactions pas encore finalisees',
                'tone' => 'warning',
            ],
            [
                'key' => 'conversion_rate',
                'title' => 'Taux de conversion',
                'value' => sprintf('%d%%', $conversionRate),
                'description' => 'Prospects devenus clients',
                'tone' => 'success',
            ],
        ];
    }

    private function resolveComparisonPeriods(): array
    {
        $currentEnd = CarbonImmutable::now();
        $currentStart = $currentEnd->startOfMonth();
        $previousStart = $currentStart->subMonthNoOverflow()->startOfMonth();
        $previousEnd = $previousStart->endOfMonth();

        return [$currentStart, $currentEnd, $previousStart, $previousEnd];
    }

    private function filterByDateRange(Collection $items, string $field, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
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
        if (($current === 0 && $previous === 0) || $current === $previous) {
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
            'agentProfile.user',
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
