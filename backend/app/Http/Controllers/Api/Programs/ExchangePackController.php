<?php

namespace App\Http\Controllers\Api\Programs;

use App\Http\Controllers\Controller;
use App\Http\Resources\Programs\ExchangePackResource;
use App\Models\ExchangePack;
use App\Models\ExchangePackItem;
use App\Models\Program;
use App\Models\User;
use App\Services\ProgramAssignedAgentNotifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExchangePackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $user->primaryBusinessAssignment?->business_id;

        abort_if($businessId === null, 403, 'No business scope is available for this action.');
        abort_unless($user->hasPermissionId('exchange-pack.view', $businessId), 403, 'Forbidden.');

        $statusFilter = $request->string('status')->toString();
        $sort = $request->string('sort')->toString();

        $packsQuery = ExchangePack::query()
            ->where('business_id', $businessId)
            ->with([
                'items',
                'programs' => function ($relation): void {
                    $relation
                        ->where('status', '!=', 'archived')
                        ->withCount([
                            'agentAssignments as active_agent_assignments_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                        ])
                        ->orderBy('name');
                },
            ])
            ->withCount([
                'items as active_items_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                'programs',
            ]);

        if ($statusFilter === 'active' || $statusFilter === 'inactive') {
            $packsQuery->where('status', $statusFilter);
        }

        match ($sort) {
            'name-asc' => $packsQuery->orderBy('name'),
            'name-desc' => $packsQuery->orderByDesc('name'),
            'updated-asc' => $packsQuery->orderBy('updated_at')->orderBy('name'),
            'items-desc' => $packsQuery->orderByDesc('active_items_count')->orderBy('name'),
            'programs-desc' => $packsQuery->orderByDesc('programs_count')->orderBy('name'),
            default => $packsQuery->orderByDesc('updated_at')->orderBy('name'),
        };

        $packs = $packsQuery->get();

        return response()->json([
            'data' => $packs->map(fn (ExchangePack $pack) => ExchangePackResource::make($pack)->resolve($request)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.create', $businessId);

        $payload = $this->validatedPackPayload($request);

        $pack = ExchangePack::query()->create([
            'business_id' => $businessId,
            'name' => $payload['name'],
            'description' => $payload['description'],
            'status' => 'active',
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);

        return response()->json([
            'data' => ExchangePackResource::make($this->loadPackForResponse($pack))->resolve($request),
        ], 201);
    }

    public function show(Request $request, string $exchangePackId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $user->primaryBusinessAssignment?->business_id;

        abort_if($businessId === null, 403, 'No business scope is available for this action.');
        $this->assertPermission($user, 'exchange-pack.view', $businessId);

        $pack = ExchangePack::query()
            ->where('business_id', $businessId)
            ->findOrFail($exchangePackId);

        return response()->json([
            'data' => ExchangePackResource::make($this->loadPackForResponse($pack))->resolve($request),
        ]);
    }

    public function update(Request $request, string $exchangePackId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.update', $businessId);

        $pack = $this->resolveOwnerPack($businessId, $exchangePackId);
        $payload = $this->validatedPackPayload($request);

        $pack->forceFill([
            'name' => $payload['name'],
            'description' => $payload['description'],
            'updated_by_user_id' => $user->id,
        ])->save();

        return response()->json([
            'data' => ExchangePackResource::make($this->loadPackForResponse($pack))->resolve($request),
        ]);
    }

    public function updateStatus(Request $request, string $exchangePackId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.update', $businessId);

        $pack = ExchangePack::query()
            ->where('business_id', $businessId)
            ->withCount('programs')
            ->findOrFail($exchangePackId);

        $payload = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $nextStatus = (string) $payload['status'];

        if ($nextStatus === 'inactive' && $pack->programs_count > 0) {
            throw ValidationException::withMessages([
                'status' => 'Impossible de désactiver ce pack tant qu’il est utilisé par un programme.',
            ]);
        }

        $pack->forceFill([
            'status' => $nextStatus,
            'updated_by_user_id' => $user->id,
        ])->save();

        return response()->json([
            'data' => ExchangePackResource::make($this->loadPackForResponse($pack))->resolve($request),
        ]);
    }

    public function destroy(Request $request, string $exchangePackId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.delete', $businessId);

        $pack = ExchangePack::query()
            ->where('business_id', $businessId)
            ->withCount('programs')
            ->findOrFail($exchangePackId);

        if ($pack->programs_count > 0) {
            throw ValidationException::withMessages([
                'exchange_pack_id' => 'This pack is still linked to one or more programs.',
            ]);
        }

        DB::transaction(function () use ($pack): void {
            $pack->items()->delete();
            $pack->delete();
        });

        return response()->json([
            'data' => [
                'id' => $exchangePackId,
                'deleted' => true,
            ],
        ]);
    }

    public function storeItem(Request $request, string $exchangePackId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.update', $businessId);

        $pack = $this->resolveOwnerPack($businessId, $exchangePackId);
        $payload = $this->validatedItemPayload($request);
        $nextDisplayOrder = ((int) $pack->items()->max('display_order')) + 1;

        $pack->items()->create([
            'title' => $payload['title'],
            'description' => null,
            'item_type' => 'reward',
            'points_cost' => $payload['points_cost'],
            'display_order' => $nextDisplayOrder,
            'status' => 'active',
        ]);

        $pack->forceFill(['updated_by_user_id' => $user->id])->save();
        return response()->json([
            'data' => ExchangePackResource::make($this->loadPackForResponse($pack))->resolve($request),
        ], 201);
    }

    public function updateItem(Request $request, string $exchangePackId, string $itemId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.update', $businessId);

        $pack = $this->resolveOwnerPack($businessId, $exchangePackId);
        $item = $this->resolvePackItem($pack, $itemId);
        $payload = $this->validatedItemPayload($request);

        $item->forceFill([
            'title' => $payload['title'],
            'points_cost' => $payload['points_cost'],
        ])->save();

        $pack->forceFill(['updated_by_user_id' => $user->id])->save();
        return response()->json([
            'data' => ExchangePackResource::make($this->loadPackForResponse($pack))->resolve($request),
        ]);
    }

    public function reorderItems(Request $request, string $exchangePackId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.update', $businessId);

        $pack = $this->resolveOwnerPack($businessId, $exchangePackId);
        $payload = $this->validatedItemOrderPayload($request);
        $activeItemCount = $pack->items()
            ->where('status', 'active')
            ->count();
        $items = $pack->items()
            ->where('status', 'active')
            ->whereIn('id', $payload['item_ids'])
            ->get()
            ->keyBy('id');

        if ($items->count() !== count($payload['item_ids']) || $activeItemCount !== count($payload['item_ids'])) {
            throw ValidationException::withMessages([
                'item_ids' => 'The order contains one or more invalid gift identifiers.',
            ]);
        }

        DB::transaction(function () use ($pack, $payload, $items, $user): void {
            foreach ($payload['item_ids'] as $index => $itemId) {
                $items[$itemId]->forceFill([
                    'display_order' => $index + 1,
                ])->save();
            }

            $pack->forceFill(['updated_by_user_id' => $user->id])->save();
        });

        return response()->json([
            'data' => ExchangePackResource::make($this->loadPackForResponse($pack))->resolve($request),
        ]);
    }

    public function destroyItem(Request $request, string $exchangePackId, string $itemId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.update', $businessId);

        $pack = $this->resolveOwnerPack($businessId, $exchangePackId);
        $item = $this->resolvePackItem($pack, $itemId);

        $item->delete();
        $pack->forceFill(['updated_by_user_id' => $user->id])->save();
        return response()->json([
            'data' => ExchangePackResource::make($this->loadPackForResponse($pack))->resolve($request),
        ]);
    }

    public function notifyAgents(Request $request, string $exchangePackId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.update', $businessId);

        $pack = $this->resolveOwnerPack($businessId, $exchangePackId);
        $draftPayload = $this->validatedPackDraftPayload($request);

        if ($draftPayload !== null) {
            $this->applyPackDraft($pack, $draftPayload, $user);
            $pack = $this->resolveOwnerPack($businessId, $exchangePackId);
        }

        $notifiedProgramsCount = $this->notifyLinkedPrograms($pack);

        return response()->json([
            'data' => ExchangePackResource::make($this->loadPackForResponse($pack))->resolve($request),
            'meta' => [
                'notified_programs_count' => $notifiedProgramsCount,
            ],
        ]);
    }

    private function resolveApiUser(Request $request): User
    {
        /** @var User|null $user */
        $user = $request->user();

        abort_if($user === null, 401);

        return $user->loadMissing([
            'userRoles.role.permissions',
            'primaryBusinessAssignment.business',
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

        abort_if($businessId === null, 403, 'No business scope is available for this action.');

        return $businessId;
    }

    /**
     * @return array{name: string, description: string|null}
     */
    private function validatedPackPayload(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string'],
        ]);

        return [
            'name' => trim((string) $validated['name']),
            'description' => isset($validated['description']) && $validated['description'] !== null
                ? trim((string) $validated['description'])
                : null,
        ];
    }

    /**
     * @return array{title: string, points_cost: int}
     */
    private function validatedItemPayload(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'points_cost' => ['required', 'integer', 'min:1'],
        ]);

        return [
            'title' => trim((string) $validated['title']),
            'points_cost' => (int) $validated['points_cost'],
        ];
    }

    /**
     * @return array{item_ids: array<int, string>}
     */
    private function validatedItemOrderPayload(Request $request): array
    {
        $validated = $request->validate([
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => ['required', 'string', 'distinct'],
        ]);

        return [
            'item_ids' => array_values(array_map('strval', $validated['item_ids'])),
        ];
    }

    /**
     * @return array{name: string, description: string|null, items: array<int, array{id: string|null, title: string, points_cost: int}>}|null
     */
    private function validatedPackDraftPayload(Request $request): ?array
    {
        if (! $request->has('pack')) {
            return null;
        }

        $validated = $request->validate([
            'pack.name' => ['required', 'string', 'max:160'],
            'pack.description' => ['nullable', 'string'],
            'pack.items' => ['required', 'array'],
            'pack.items.*.id' => ['nullable', 'string'],
            'pack.items.*.title' => ['required', 'string', 'max:160'],
            'pack.items.*.points_cost' => ['required', 'integer', 'min:1'],
        ]);

        return [
            'name' => trim((string) $validated['pack']['name']),
            'description' => isset($validated['pack']['description']) && $validated['pack']['description'] !== null
                ? trim((string) $validated['pack']['description'])
                : null,
            'items' => array_values(array_map(
                fn (array $item): array => [
                    'id' => isset($item['id']) && is_string($item['id']) && ! str_starts_with($item['id'], 'temp-')
                        ? $item['id']
                        : null,
                    'title' => trim((string) $item['title']),
                    'points_cost' => (int) $item['points_cost'],
                ],
                $validated['pack']['items'],
            )),
        ];
    }

    /**
     * @param  array{name: string, description: string|null, items: array<int, array{id: string|null, title: string, points_cost: int}>}  $payload
     */
    private function applyPackDraft(ExchangePack $pack, array $payload, User $user): void
    {
        DB::transaction(function () use ($pack, $payload, $user): void {
            $pack->forceFill([
                'name' => $payload['name'],
                'description' => $payload['description'],
                'updated_by_user_id' => $user->id,
            ])->save();

            $activeItems = $pack->items()
                ->where('status', 'active')
                ->get()
                ->keyBy('id');
            $keptIds = [];

            foreach ($payload['items'] as $index => $itemPayload) {
                $item = $itemPayload['id'] !== null
                    ? $activeItems->get($itemPayload['id'])
                    : null;

                if ($item === null) {
                    $item = $pack->items()->make([
                        'description' => null,
                        'item_type' => 'reward',
                        'status' => 'active',
                    ]);
                }

                $item->forceFill([
                    'title' => $itemPayload['title'],
                    'points_cost' => $itemPayload['points_cost'],
                    'display_order' => $index + 1,
                ])->save();

                $keptIds[] = $item->id;
            }

            $deleteQuery = $pack->items()->where('status', 'active');

            if ($keptIds !== []) {
                $deleteQuery->whereNotIn('id', $keptIds);
            }

            $deleteQuery->delete();
        });
    }

    private function resolveOwnerPack(string $businessId, string $exchangePackId): ExchangePack
    {
        return ExchangePack::query()
            ->where('business_id', $businessId)
            ->findOrFail($exchangePackId);
    }

    private function resolvePackItem(ExchangePack $pack, string $itemId): ExchangePackItem
    {
        return $pack->items()
            ->where('status', 'active')
            ->findOrFail($itemId);
    }

    private function loadPackForResponse(ExchangePack $pack): ExchangePack
    {
        return $pack->fresh()
            ->load([
                'items',
                'programs' => function ($relation): void {
                    $relation
                        ->where('status', '!=', 'archived')
                        ->withCount([
                            'agentAssignments as active_agent_assignments_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                        ])
                        ->orderBy('name');
                },
            ])
            ->loadCount([
                'items as active_items_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                'programs',
            ]);
    }

    private function notifyLinkedPrograms(ExchangePack $pack): int
    {
        $programs = Program::query()
            ->where('exchange_pack_id', $pack->id)
            ->where('status', '!=', 'archived')
            ->with(['business', 'exchangePack.items'])
            ->get();

        foreach ($programs as $program) {
            ProgramAssignedAgentNotifier::notifyRewardsUpdated($program);
        }

        return $programs->count();
    }
}
