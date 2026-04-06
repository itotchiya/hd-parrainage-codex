<?php

namespace App\Http\Controllers\Api\Frontend2\Exchanges;

// Frontend2-only controller. Keep the prototype-alignment exchange workflow and notifications isolated from the older frontend controllers.

use App\Http\Controllers\Controller;
use App\Http\Resources\Exchanges\ExchangeRequestResource;
use App\Models\AgentProfile;
use App\Models\AppNotification;
use App\Models\ExchangePackItem;
use App\Models\ExchangeRequest;
use App\Models\PointsLedger;
use App\Models\Program;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class Frontend2ExchangeRequestController extends Controller
{
    public function storeReward(Request $request): JsonResponse
    {
        return $this->storeForType($request, 'reward');
    }

    public function storeCash(Request $request): JsonResponse
    {
        return $this->storeForType($request, 'cash');
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

        $this->notifyRequester(
            record: $record,
            title: 'Demande approuvee',
            message: $record->request_type === 'cash'
                ? "Votre demande de conversion cash pour {$record->cash_amount} {$record->currency_code} a ete approuvee."
                : "Votre demande d echange pour {$record->requested_reward_title} a ete approuvee.",
            severity: 'success',
            metadata: ['event' => 'exchange_request_approved']
        );

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

        $this->notifyRequester(
            record: $record,
            title: 'Demande rejetee',
            message: $record->request_type === 'cash'
                ? 'Votre demande de conversion cash a ete rejetee.'
                : 'Votre demande d echange a ete rejetee.',
            severity: 'error',
            metadata: ['event' => 'exchange_request_rejected']
        );

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
            'program.exchangePack.items',
            'agent.user',
            'requestedByUser',
            'approvedByUser',
            'exchangePackItem',
            'ledgerEntries.exchangeRequest',
        ]);

        $this->notifyRequester(
            record: $record,
            title: 'Demande en cours de traitement',
            message: $record->request_type === 'cash'
                ? 'Votre conversion cash est en cours de traitement.'
                : 'Votre echange est en cours de traitement.',
            severity: 'info',
            metadata: ['event' => 'exchange_request_processing']
        );

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
            'program.exchangePack.items',
            'agent.user',
            'requestedByUser',
            'approvedByUser',
            'exchangePackItem',
            'ledgerEntries.exchangeRequest',
        ]);

        $this->notifyRequester(
            record: $record,
            title: 'Demande finalisee',
            message: $record->request_type === 'cash'
                ? "Votre conversion cash de {$record->cash_amount} {$record->currency_code} a ete finalisee."
                : "Votre echange pour {$record->requested_reward_title} a ete finalise.",
            severity: 'success',
            metadata: ['event' => 'exchange_request_completed']
        );

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

        $ownerBusinessId = $user->primaryBusinessAssignment?->business_id;
        $isOwner = $ownerBusinessId !== null && $record->business_id === $ownerBusinessId;
        $isRequester = $record->requested_by_user_id === $user->id;

        if ($isOwner) {
            $this->assertPermission($user, 'exchange-request.approve', $record->business_id);
        } else {
            abort_unless($isRequester, 403, 'Forbidden.');
        }

        DB::transaction(function () use ($record, $user): void {
            $previousStatus = $record->status;

            $record->forceFill([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ])->save();

            if (in_array($previousStatus, ['approved', 'processing'], true) && $this->requestHasReservedPoints($record)) {
                $this->releaseReservedPoints($record, $user, 'cancelled', 'cancelled');
            } elseif ($previousStatus === 'requested' && $this->requestHasReservedPoints($record)) {
                $this->releaseReservedPoints($record, $user, 'cancelled', 'cancelled');
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

        if ($isOwner) {
            $this->notifyRequester(
                record: $record,
                title: 'Demande annulee',
                message: $record->request_type === 'cash'
                    ? 'Votre conversion cash a ete annulee par le business.'
                    : 'Votre demande d echange a ete annulee par le business.',
                severity: 'warning',
                metadata: ['event' => 'exchange_request_cancelled_by_owner']
            );
        } else {
            $this->notifyBusinessOwners(
                record: $record,
                title: 'Demande annulee par l affilie',
                message: "{$record->agent?->user?->display_name} a annule sa demande d echange sur {$record->program?->name}.",
                severity: 'warning',
                metadata: ['event' => 'exchange_request_cancelled_by_agent']
            );
        }

        return response()->json([
            'data' => ExchangeRequestResource::make($record)->resolve($request),
        ]);
    }

    private function storeForType(Request $request, string $forcedRequestType): JsonResponse
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

            $cashAmount = round(($pointsAmount / $program->points_per_euro), 2);
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
            $exchangeRequest = ExchangeRequest::query()->create([
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

            $this->ensureRequestReserved($exchangeRequest, $user);

            return $exchangeRequest;
        });

        $exchangeRequest->loadMissing([
            'business',
            'program.exchangePack.items',
            'agent.user',
            'requestedByUser',
            'approvedByUser',
            'exchangePackItem',
            'ledgerEntries.exchangeRequest',
        ]);

        $this->notifyBusinessOwners(
            record: $exchangeRequest,
            title: 'Nouvelle demande d echange',
            message: $requestType === 'cash'
                ? "{$user->display_name} demande une conversion cash de {$cashAmount} {$exchangeRequest->currency_code} sur {$program->name}."
                : "{$user->display_name} demande {$requestedRewardTitle} sur {$program->name}.",
            severity: 'warning',
            metadata: ['event' => 'exchange_request_created']
        );

        $this->notifyRequester(
            record: $exchangeRequest,
            title: 'Demande envoyee',
            message: $requestType === 'cash'
                ? "Votre demande de conversion cash a ete envoyee pour validation sur {$program->name}."
                : "Votre demande d echange a ete envoyee pour validation sur {$program->name}.",
            severity: 'info',
            metadata: ['event' => 'exchange_request_submitted']
        );

        return response()->json([
            'data' => ExchangeRequestResource::make($exchangeRequest)->resolve($request),
        ], 201);
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

    private function availablePointsForAgentProgram(string $agentId, ?string $programId): int
    {
        if ($programId === null) {
            return 0;
        }

        $balance = PointsLedger::query()
            ->where('agent_id', $agentId)
            ->where('program_id', $programId)
            ->where('entry_status', 'available')
            ->sum('points_delta');

        return max((int) $balance, 0);
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
            $availablePoints = $this->availablePointsForAgentProgram($record->agent_id, $record->program_id);

            if ($availablePoints < $record->points_amount) {
                throw ValidationException::withMessages([
                    'points_amount' => 'Insufficient available points for this request.',
                ]);
            }

            PointsLedger::query()->firstOrCreate(
                ['idempotency_key' => "frontend2-exchange-{$record->id}-available-reserved"],
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
                    'source' => "frontend2_exchange_{$record->request_type}_reserved",
                    'description' => 'Frontend2 exchange request reserved spendable points from the wallet.',
                    'effective_at' => $record->requested_at ?? now(),
                ],
            );

            PointsLedger::query()->firstOrCreate(
                ['idempotency_key' => "frontend2-exchange-{$record->id}-locked-held"],
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
                    'source' => "frontend2_exchange_{$record->request_type}_reserved",
                    'description' => 'Frontend2 exchange request moved spendable points into the locked bucket.',
                    'effective_at' => $record->requested_at ?? now(),
                ],
            );

            return;
        }

        if ($availableNet === 0 && $lockedNet < 0) {
            $availablePoints = $this->availablePointsForAgentProgram($record->agent_id, $record->program_id);

            if ($availablePoints < $record->points_amount) {
                throw ValidationException::withMessages([
                    'points_amount' => 'Insufficient available points for this request.',
                ]);
            }

            PointsLedger::query()->firstOrCreate(
                ['idempotency_key' => "frontend2-exchange-{$record->id}-available-normalized"],
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
                    'source' => "frontend2_exchange_{$record->request_type}_normalized",
                    'description' => 'Frontend2 normalized a legacy reserved request to also debit the available wallet bucket.',
                    'effective_at' => $record->approved_at ?? $record->requested_at ?? now(),
                ],
            );

            PointsLedger::query()->firstOrCreate(
                ['idempotency_key' => "frontend2-exchange-{$record->id}-locked-normalized"],
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
                    'source' => "frontend2_exchange_{$record->request_type}_normalized",
                    'description' => 'Frontend2 normalized a legacy locked request into the locked bucket transfer model.',
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
            ['idempotency_key' => "frontend2-exchange-{$record->id}-available-restored-{$sourceSuffix}"],
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
                'source' => "frontend2_exchange_{$record->request_type}_{$sourceSuffix}",
                'description' => 'Frontend2 returned reserved points back to the available wallet bucket.',
                'effective_at' => $releaseMoment,
            ],
        );

        PointsLedger::query()->firstOrCreate(
            ['idempotency_key' => "frontend2-exchange-{$record->id}-locked-released-{$sourceSuffix}"],
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
                'source' => "frontend2_exchange_{$record->request_type}_{$sourceSuffix}",
                'description' => 'Frontend2 removed reserved points from the locked bucket.',
                'effective_at' => $releaseMoment,
            ],
        );
    }

    private function moveLockedPointsToConsumed(ExchangeRequest $record, User $user): void
    {
        PointsLedger::query()->firstOrCreate(
            ['idempotency_key' => "frontend2-exchange-{$record->id}-locked-cleared-completed"],
            [
                'business_id' => $record->business_id,
                'program_id' => $record->program_id,
                'agent_id' => $record->agent_id,
                'prospect_id' => null,
                'transaction_id' => null,
                'exchange_request_id' => $record->id,
                'created_by_user_id' => $user->id,
                'entry_type' => 'settlement',
                'entry_status' => 'locked',
                'points_delta' => -1 * $record->points_amount,
                'source' => "frontend2_exchange_{$record->request_type}_completed",
                'description' => 'Frontend2 completed exchange request cleared the locked bucket.',
                'effective_at' => $record->completed_at ?? now(),
            ],
        );

        PointsLedger::query()->firstOrCreate(
            ['idempotency_key' => "frontend2-exchange-{$record->id}-consumed-booked-completed"],
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
                'source' => "frontend2_exchange_{$record->request_type}_completed",
                'description' => 'Frontend2 completed exchange request moved points into the consumed bucket.',
                'effective_at' => $record->completed_at ?? now(),
            ],
        );
    }

    private function notifyBusinessOwners(
        ExchangeRequest $record,
        string $title,
        string $message,
        string $severity,
        array $metadata = []
    ): void {
        $owners = $this->businessOwnerRecipients($record->business_id);

        foreach ($owners as $owner) {
            AppNotification::query()->create([
                'recipient_user_id' => $owner->id,
                'business_id' => $record->business_id,
                'notification_type' => 'exchange_request',
                'title' => $title,
                'message' => $message,
                'severity' => $severity,
                'metadata' => array_merge($metadata, [
                    'exchange_request_id' => $record->id,
                    'program_id' => $record->program_id,
                    'agent_id' => $record->agent_id,
                    'request_type' => $record->request_type,
                ]),
            ]);
        }
    }

    private function notifyRequester(
        ExchangeRequest $record,
        string $title,
        string $message,
        string $severity,
        array $metadata = []
    ): void {
        $recipientUserId = $record->requested_by_user_id ?: $record->agent?->user_id;

        if ($recipientUserId === null) {
            return;
        }

        AppNotification::query()->create([
            'recipient_user_id' => $recipientUserId,
            'business_id' => $record->business_id,
            'notification_type' => 'exchange_request',
            'title' => $title,
            'message' => $message,
            'severity' => $severity,
            'metadata' => array_merge($metadata, [
                'exchange_request_id' => $record->id,
                'program_id' => $record->program_id,
                'agent_id' => $record->agent_id,
                'request_type' => $record->request_type,
            ]),
        ]);
    }

    /**
     * @return Collection<int, User>
     */
    private function businessOwnerRecipients(string $businessId): Collection
    {
        return User::query()
            ->whereHas('businessAssignments', function (Builder $builder) use ($businessId): void {
                $builder
                    ->where('business_id', $businessId)
                    ->where('status', 'active');
            })
            ->get()
            ->filter(fn (User $user) => $user->hasPermissionId('exchange-request.approve', $businessId))
            ->values();
    }

    private function scopedExchangeRequestsQuery(User $user): Builder
    {
        $query = ExchangeRequest::query();
        $ownerBusinessId = $user->primaryBusinessAssignment?->business_id;

        if ($ownerBusinessId !== null && $user->hasPermissionId('exchange-request.view', $ownerBusinessId)) {
            return $query->where('business_id', $ownerBusinessId);
        }

        $agentId = $user->agentProfile?->id;

        if ($agentId !== null && $user->hasPermissionId('exchange-request.view', $user->agentProfile?->business_id)) {
            return $query->where('agent_id', $agentId);
        }

        abort(403, 'Forbidden.');
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

    private function ownerBusinessId(User $user): string
    {
        $businessId = $user->primaryBusinessAssignment?->business_id;
        abort_if($businessId === null, 403, 'No active owner business scope is available.');

        return $businessId;
    }
}
