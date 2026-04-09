<?php

namespace App\Http\Controllers\Api\Exchanges;

use App\Http\Controllers\Controller;
use App\Http\Resources\Exchanges\ExchangeRequestResource;
use App\Models\ExchangePackItem;
use App\Models\ExchangeRequest;
use App\Models\PointsLedger;
use App\Models\Program;
use App\Models\User;
use App\Support\Points\PointsWalletMetrics;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExchangeRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'exchange-request.view', $businessId);

        $query = $this->scopedExchangeRequestsQuery($user)
            ->with([
                'business',
                'program',
                'agent.user',
                'requestedByUser',
                'approvedByUser',
                'exchangePackItem',
            ]);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('program_id')) {
            $query->where('program_id', (string) $request->string('program_id'));
        }

        if ($request->filled('request_type')) {
            $query->where('request_type', (string) $request->string('request_type'));
        }

        $records = $query
            ->orderByDesc('requested_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $records->map(fn (ExchangeRequest $record) => ExchangeRequestResource::make($record)->resolve($request)),
        ]);
    }

    public function show(Request $request, string $exchangeRequestId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'exchange-request.view', $businessId);

        $record = $this->scopedExchangeRequestsQuery($user)
            ->with([
                'business',
                'program.exchangePack.items',
                'agent.user',
                'requestedByUser',
                'approvedByUser',
                'exchangePackItem',
                'ledgerEntries.exchangeRequest',
            ])
            ->findOrFail($exchangeRequestId);

        return response()->json([
            'data' => ExchangeRequestResource::make($record)->resolve($request),
        ]);
    }

    public function storeReward(Request $request): JsonResponse
    {
        return $this->storeForType($request, 'reward');
    }

    public function storeCash(Request $request): JsonResponse
    {
        return $this->storeForType($request, 'cash');
    }

    public function storeForType(Request $request, string $forcedRequestType): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $agent = $user->agentProfile;

        abort_if($agent === null, 403, 'No agent profile is available for this action.');

        $businessId = $agent->business_id;
        $this->assertPermission($user, 'exchange-request.view', $businessId);

        $payload = $request->validate([
            'program_id' => ['required', 'uuid'],
            'exchange_pack_item_id' => ['nullable', 'uuid'],
            'points_amount' => ['nullable', 'integer', 'min:1'],
            'notes' => ['nullable', 'string'],
        ]);

        if (! in_array($forcedRequestType, ['reward', 'cash'], true)) {
            abort(500, 'Unsupported exchange request type.');
        }

        $requestType = $forcedRequestType;

        $requiredPermission = $requestType === 'reward'
            ? 'exchange-request.create-reward'
            : 'exchange-request.create-cash';
        $this->assertPermission($user, $requiredPermission, $businessId);

        $program = $this->resolveProgramForAgent(
            businessId: $businessId,
            agentId: $agent->id,
            programId: (string) $payload['program_id'],
        );

        if ($requestType === 'reward' && ! in_array($program->exchange_mode, ['reward', 'both'], true)) {
            throw ValidationException::withMessages([
                'request_type' => 'This program does not allow reward exchange requests.',
            ]);
        }

        if ($requestType === 'cash' && ! in_array($program->exchange_mode, ['cash', 'both'], true)) {
            throw ValidationException::withMessages([
                'request_type' => 'This program does not allow cash exchange requests.',
            ]);
        }

        $exchangePackItem = null;
        $pointsAmount = null;
        $requestedRewardTitle = null;
        $cashAmount = null;

        if ($requestType === 'reward') {
            $exchangePackItem = $this->resolvePackItem(
                businessId: $businessId,
                program: $program,
                exchangePackItemId: (string) ($payload['exchange_pack_item_id'] ?? ''),
            );

            $pointsAmount = (int) $exchangePackItem->points_cost;
            $requestedRewardTitle = $exchangePackItem->title;
        } else {
            $pointsAmount = (int) ($payload['points_amount'] ?? 0);

            if ($pointsAmount <= 0) {
                throw ValidationException::withMessages([
                    'points_amount' => 'Points amount is required for cash requests.',
                ]);
            }

            if ($program->points_per_euro === null || $program->points_per_euro <= 0) {
                throw ValidationException::withMessages([
                    'program_id' => 'This program cannot compute cash conversion yet.',
                ]);
            }

            $cashAmount = round(($pointsAmount / $program->points_per_euro) * 100, 2);
        }

        $availablePoints = $this->availablePointsForAgentProgram($agent->id, $program->id);

        if ($availablePoints < $pointsAmount) {
            throw ValidationException::withMessages([
                'points_amount' => 'Insufficient available points for this request.',
            ]);
        }

        $exchangeRequest = DB::transaction(function () use (
            $agent,
            $businessId,
            $user,
            $program,
            $requestType,
            $exchangePackItem,
            $pointsAmount,
            $cashAmount,
            $requestedRewardTitle,
            $payload
        ): ExchangeRequest {
            $record = ExchangeRequest::query()->create([
                'business_id' => $businessId,
                'program_id' => $program->id,
                'agent_id' => $agent->id,
                'requested_by_user_id' => $user->id,
                'approved_by_user_id' => null,
                'exchange_pack_item_id' => $exchangePackItem?->id,
                'request_type' => $requestType,
                'status' => 'requested',
                'points_amount' => $pointsAmount,
                'cash_amount' => $cashAmount,
                'currency_code' => $program->business?->currency_code ?? 'EUR',
                'requested_reward_title' => $requestedRewardTitle,
                'notes' => isset($payload['notes']) ? trim((string) $payload['notes']) : null,
                'requested_at' => now(),
            ]);

            $this->ensureRequestReserved($record, $user);

            return $record->loadMissing([
                'business',
                'program.exchangePack.items',
                'agent.user',
                'requestedByUser',
                'approvedByUser',
                'exchangePackItem',
                'ledgerEntries.exchangeRequest',
            ]);
        });

        return response()->json([
            'data' => ExchangeRequestResource::make($exchangeRequest)->resolve($request),
        ], 201);
    }

    public function approve(Request $request, string $exchangeRequestId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-request.approve', $businessId);

        $record = ExchangeRequest::query()
            ->where('business_id', $businessId)
            ->where('status', 'requested')
            ->findOrFail($exchangeRequestId);

        DB::transaction(function () use ($record, $user): void {
            $this->ensureRequestReserved($record, $user);

            $record->forceFill([
                'status' => 'approved',
                'approved_by_user_id' => $user->id,
                'approved_at' => now(),
            ])->save();
        });

        $record->loadMissing([
            'business',
            'program.exchangePack.items',
            'agent.user',
            'requestedByUser',
            'approvedByUser',
            'exchangePackItem',
            'ledgerEntries.exchangeRequest',
        ]);

        return response()->json([
            'data' => ExchangeRequestResource::make($record)->resolve($request),
        ]);
    }

    public function reject(Request $request, string $exchangeRequestId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-request.reject', $businessId);

        $record = ExchangeRequest::query()
            ->where('business_id', $businessId)
            ->where('status', 'requested')
            ->findOrFail($exchangeRequestId);

        DB::transaction(function () use ($record, $user): void {
            $record->forceFill([
                'status' => 'rejected',
                'approved_by_user_id' => $user->id,
                'rejected_at' => now(),
            ])->save();

            if ($this->requestHasReservedPoints($record)) {
                $this->releaseReservedPoints($record, $user, 'rejected', 'rejected');
            }
        });

        $record->loadMissing([
            'business',
            'program.exchangePack.items',
            'agent.user',
            'requestedByUser',
            'approvedByUser',
            'exchangePackItem',
            'ledgerEntries.exchangeRequest',
        ]);

        return response()->json([
            'data' => ExchangeRequestResource::make($record)->resolve($request),
        ]);
    }

    public function markProcessing(Request $request, string $exchangeRequestId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-request.approve', $businessId);

        $record = ExchangeRequest::query()
            ->where('business_id', $businessId)
            ->whereIn('status', ['approved'])
            ->findOrFail($exchangeRequestId);

        $record->forceFill([
            'status' => 'processing',
            'processed_at' => now(),
        ])->save();

        $record->loadMissing([
            'business',
            'program',
            'agent.user',
            'requestedByUser',
            'approvedByUser',
            'exchangePackItem',
        ]);

        return response()->json([
            'data' => ExchangeRequestResource::make($record)->resolve($request),
        ]);
    }

    public function complete(Request $request, string $exchangeRequestId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-request.approve', $businessId);

        $record = ExchangeRequest::query()
            ->where('business_id', $businessId)
            ->whereIn('status', ['approved', 'processing'])
            ->findOrFail($exchangeRequestId);

        DB::transaction(function () use ($record, $user): void {
            $this->ensureRequestReserved($record, $user);

            $record->forceFill([
                'status' => 'completed',
                'completed_at' => now(),
                'processed_at' => $record->processed_at ?? now(),
            ])->save();

            $this->moveLockedPointsToConsumed($record, $user);
        });

        $record->loadMissing([
            'business',
            'program',
            'agent.user',
            'requestedByUser',
            'approvedByUser',
            'exchangePackItem',
        ]);

        return response()->json([
            'data' => ExchangeRequestResource::make($record)->resolve($request),
        ]);
    }

    public function cancel(Request $request, string $exchangeRequestId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $record = $this->scopedExchangeRequestsQuery($user)
            ->whereIn('status', ['requested', 'approved', 'processing'])
            ->findOrFail($exchangeRequestId);

        $agentProfileId = $user->agentProfile?->id;
        $isRequester = $record->requested_by_user_id === $user->id
            || ($agentProfileId !== null && $record->agent_id === $agentProfileId);
        $ownerBusinessId = $user->primaryBusinessAssignment?->business_id;
        $isOwner = ! $isRequester
            && $ownerBusinessId !== null
            && $record->business_id === $ownerBusinessId
            && $this->activeRoleSlugs($user, $ownerBusinessId)->contains('business-owner');

        if ($isRequester) {
            // Request owners can always cancel their own in-flight exchange.
        } elseif ($isOwner) {
            $this->assertPermission($user, 'exchange-request.approve', $record->business_id);
        } else {
            abort(403, 'Forbidden.');
        }

        DB::transaction(function () use ($record, $user): void {
            $previousStatus = $record->status;

            $record->forceFill([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ])->save();

            if (in_array($previousStatus, ['requested', 'approved', 'processing'], true) && $this->requestHasReservedPoints($record)) {
                $this->releaseReservedPoints($record, $user, 'cancelled', 'cancelled');
            }
        });

        $record->loadMissing([
            'business',
            'program',
            'agent.user',
            'requestedByUser',
            'approvedByUser',
            'exchangePackItem',
        ]);

        return response()->json([
            'data' => ExchangeRequestResource::make($record)->resolve($request),
        ]);
    }

    private function resolveProgramForAgent(string $businessId, string $agentId, string $programId): Program
    {
        $program = Program::query()
            ->with('business')
            ->where('business_id', $businessId)
            ->where('status', 'active')
            ->whereHas('agentAssignments', function (Builder $builder) use ($agentId): void {
                $builder
                    ->where('agent_id', $agentId)
                    ->where('status', 'active');
            })
            ->find($programId);

        if ($program === null) {
            throw ValidationException::withMessages([
                'program_id' => 'The selected program is not available in your agent scope.',
            ]);
        }

        return $program;
    }

    private function resolvePackItem(string $businessId, Program $program, string $exchangePackItemId): ExchangePackItem
    {
        if ($exchangePackItemId === '') {
            throw ValidationException::withMessages([
                'exchange_pack_item_id' => 'A reward item is required for reward requests.',
            ]);
        }

        if ($program->exchange_pack_id === null) {
            throw ValidationException::withMessages([
                'program_id' => 'This program has no active exchange pack.',
            ]);
        }

        $item = ExchangePackItem::query()
            ->where('id', $exchangePackItemId)
            ->whereHas('exchangePack', function (Builder $builder) use ($businessId, $program): void {
                $builder
                    ->where('business_id', $businessId)
                    ->where('id', $program->exchange_pack_id)
                    ->where('status', 'active');
            })
            ->where('status', 'active')
            ->first();

        if ($item === null) {
            throw ValidationException::withMessages([
                'exchange_pack_item_id' => 'The selected reward item is not available for this program.',
            ]);
        }

        return $item;
    }

    private function availablePointsForAgentProgram(string $agentId, ?string $programId, ?string $ignoreExchangeRequestId = null): int
    {
        if ($programId === null) {
            return 0;
        }

        $ledgerEntries = PointsLedger::query()
            ->where('agent_id', $agentId)
            ->where('program_id', $programId)
            ->get();
        $exchangeRequestsQuery = ExchangeRequest::query()
            ->where('agent_id', $agentId)
            ->where('program_id', $programId);

        if ($ignoreExchangeRequestId !== null) {
            $exchangeRequestsQuery->where('id', '!=', $ignoreExchangeRequestId);
        }

        $exchangeRequests = $exchangeRequestsQuery->get();
        $walletSummary = PointsWalletMetrics::summarize($ledgerEntries, $exchangeRequests);

        return $walletSummary['available_points'];
    }

    private function ensureRequestReserved(ExchangeRequest $record, User $user): void
    {
        $availableNet = (int) PointsLedger::query()
            ->where('exchange_request_id', $record->id)
            ->where('entry_status', 'available')
            ->sum('points_delta');
        $lockedNet = (int) PointsLedger::query()
            ->where('exchange_request_id', $record->id)
            ->where('entry_status', 'locked')
            ->sum('points_delta');

        if ($availableNet <= -1 * $record->points_amount && $lockedNet >= $record->points_amount) {
            return;
        }

        if ($availableNet === 0 && $lockedNet === 0) {
            $availablePoints = $this->availablePointsForAgentProgram(
                $record->agent_id,
                $record->program_id,
                $record->id,
            );

            if ($availablePoints < $record->points_amount) {
                throw ValidationException::withMessages([
                    'points_amount' => 'Insufficient available points for this request.',
                ]);
            }

            PointsLedger::query()->firstOrCreate(
                ['idempotency_key' => "exchange-{$record->id}-available-reserved"],
                [
                    'business_id' => $record->business_id,
                    'program_id' => $record->program_id,
                    'agent_id' => $record->agent_id,
                    'prospect_id' => null,
                    'transaction_id' => null,
                    'exchange_request_id' => $record->id,
                    'created_by_user_id' => $user->id,
                    'entry_type' => 'hold',
                    'entry_status' => 'available',
                    'points_delta' => -1 * $record->points_amount,
                    'source' => "exchange_{$record->request_type}_reserved",
                    'description' => 'Exchange request reserved spendable points from the available wallet bucket.',
                    'effective_at' => $record->requested_at ?? now(),
                ],
            );

            PointsLedger::query()->firstOrCreate(
                ['idempotency_key' => "exchange-{$record->id}-locked-held"],
                [
                    'business_id' => $record->business_id,
                    'program_id' => $record->program_id,
                    'agent_id' => $record->agent_id,
                    'prospect_id' => null,
                    'transaction_id' => null,
                    'exchange_request_id' => $record->id,
                    'created_by_user_id' => $user->id,
                    'entry_type' => 'hold',
                    'entry_status' => 'locked',
                    'points_delta' => $record->points_amount,
                    'source' => "exchange_{$record->request_type}_reserved",
                    'description' => 'Exchange request moved spendable points into the pending approval bucket.',
                    'effective_at' => $record->requested_at ?? now(),
                ],
            );

            return;
        }

        if ($availableNet === 0 && $lockedNet < 0) {
            $availablePoints = $this->availablePointsForAgentProgram(
                $record->agent_id,
                $record->program_id,
                $record->id,
            );

            if ($availablePoints < $record->points_amount) {
                throw ValidationException::withMessages([
                    'points_amount' => 'Insufficient available points for this request.',
                ]);
            }

            PointsLedger::query()->firstOrCreate(
                ['idempotency_key' => "exchange-{$record->id}-available-normalized"],
                [
                    'business_id' => $record->business_id,
                    'program_id' => $record->program_id,
                    'agent_id' => $record->agent_id,
                    'prospect_id' => null,
                    'transaction_id' => null,
                    'exchange_request_id' => $record->id,
                    'created_by_user_id' => $user->id,
                    'entry_type' => 'hold',
                    'entry_status' => 'available',
                    'points_delta' => -1 * $record->points_amount,
                    'source' => "exchange_{$record->request_type}_normalized",
                    'description' => 'Exchange request normalized a legacy reservation into the available wallet bucket.',
                    'effective_at' => $record->approved_at ?? $record->requested_at ?? now(),
                ],
            );

            PointsLedger::query()->firstOrCreate(
                ['idempotency_key' => "exchange-{$record->id}-locked-normalized"],
                [
                    'business_id' => $record->business_id,
                    'program_id' => $record->program_id,
                    'agent_id' => $record->agent_id,
                    'prospect_id' => null,
                    'transaction_id' => null,
                    'exchange_request_id' => $record->id,
                    'created_by_user_id' => $user->id,
                    'entry_type' => 'hold',
                    'entry_status' => 'locked',
                    'points_delta' => $record->points_amount,
                    'source' => "exchange_{$record->request_type}_normalized",
                    'description' => 'Exchange request normalized a legacy reservation into the locked bucket.',
                    'effective_at' => $record->approved_at ?? $record->requested_at ?? now(),
                ],
            );
        }
    }

    private function requestHasReservedPoints(ExchangeRequest $record): bool
    {
        $availableNet = (int) PointsLedger::query()
            ->where('exchange_request_id', $record->id)
            ->where('entry_status', 'available')
            ->sum('points_delta');
        $lockedNet = (int) PointsLedger::query()
            ->where('exchange_request_id', $record->id)
            ->where('entry_status', 'locked')
            ->sum('points_delta');

        return $availableNet < 0 || $lockedNet !== 0;
    }

    private function releaseReservedPoints(ExchangeRequest $record, User $user, string $sourceSuffix, string $effectiveDateField): void
    {
        $releaseMoment = $record->{$effectiveDateField . '_at'} ?? now();

        PointsLedger::query()->firstOrCreate(
            ['idempotency_key' => "exchange-{$record->id}-available-restored-{$sourceSuffix}"],
            [
                'business_id' => $record->business_id,
                'program_id' => $record->program_id,
                'agent_id' => $record->agent_id,
                'prospect_id' => null,
                'transaction_id' => null,
                'exchange_request_id' => $record->id,
                'created_by_user_id' => $user->id,
                'entry_type' => 'release',
                'entry_status' => 'available',
                'points_delta' => $record->points_amount,
                'source' => "exchange_{$record->request_type}_{$sourceSuffix}",
                'description' => 'Exchange request returned reserved points back to the available wallet bucket.',
                'effective_at' => $releaseMoment,
            ],
        );

        PointsLedger::query()->firstOrCreate(
            ['idempotency_key' => "exchange-{$record->id}-locked-released-{$sourceSuffix}"],
            [
                'business_id' => $record->business_id,
                'program_id' => $record->program_id,
                'agent_id' => $record->agent_id,
                'prospect_id' => null,
                'transaction_id' => null,
                'exchange_request_id' => $record->id,
                'created_by_user_id' => $user->id,
                'entry_type' => 'release',
                'entry_status' => 'locked',
                'points_delta' => -1 * $record->points_amount,
                'source' => "exchange_{$record->request_type}_{$sourceSuffix}",
                'description' => 'Exchange request removed reserved points from the locked bucket.',
                'effective_at' => $releaseMoment,
            ],
        );
    }

    private function moveLockedPointsToConsumed(ExchangeRequest $record, User $user): void
    {
        PointsLedger::query()->firstOrCreate(
            ['idempotency_key' => "exchange-{$record->id}-locked-cleared-completed"],
            [
                'business_id' => $record->business_id,
                'program_id' => $record->program_id,
                'agent_id' => $record->agent_id,
                'prospect_id' => null,
                'transaction_id' => null,
                'exchange_request_id' => $record->id,
                'created_by_user_id' => $user->id,
                'entry_type' => 'release',
                'entry_status' => 'locked',
                'points_delta' => -1 * $record->points_amount,
                'source' => "exchange_{$record->request_type}_completed",
                'description' => 'Completed exchange request cleared the locked points bucket.',
                'effective_at' => $record->completed_at ?? now(),
            ],
        );

        PointsLedger::query()->firstOrCreate(
            ['idempotency_key' => "exchange-{$record->id}-consumed-booked-completed"],
            [
                'business_id' => $record->business_id,
                'program_id' => $record->program_id,
                'agent_id' => $record->agent_id,
                'prospect_id' => null,
                'transaction_id' => null,
                'exchange_request_id' => $record->id,
                'created_by_user_id' => $user->id,
                'entry_type' => 'spend',
                'entry_status' => 'consumed',
                'points_delta' => $record->points_amount,
                'source' => "exchange_{$record->request_type}_completed",
                'description' => 'Completed exchange request moved points into the consumed bucket.',
                'effective_at' => $record->completed_at ?? now(),
            ],
        );
    }

    private function scopedExchangeRequestsQuery(User $user): Builder
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

    private function ownerBusinessId(User $user): string
    {
        $businessId = $user->primaryBusinessAssignment?->business_id;

        abort_if($businessId === null, 403, 'No business scope is available for this action.');

        return $businessId;
    }

    private function activeRoleSlugs(User $user, ?string $businessId = null): Collection
    {
        return $user->activeRoleSlugs($businessId);
    }
}
