<?php

namespace App\Http\Controllers\Api\Frontend2\Programs;

// Frontend2-only controller. Keep the prototype-oriented pack mutation contract isolated from the older frontend controllers.

use App\Http\Controllers\Controller;
use App\Http\Resources\Programs\ExchangePackResource;
use App\Models\ExchangePack;
use App\Models\ExchangePackItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class Frontend2ExchangePackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.create', $businessId);

        $payload = $this->validatedPayload($request);

        $pack = DB::transaction(function () use ($businessId, $payload, $user): ExchangePack {
            $pack = ExchangePack::query()->create([
                'business_id' => $businessId,
                'name' => $payload['name'],
                'description' => null,
                'status' => 'active',
                'created_by_user_id' => $user->id,
                'updated_by_user_id' => $user->id,
            ]);

            $this->syncItems($pack, collect(), $payload['items']);

            return $pack->fresh('items');
        });

        return response()->json([
            'data' => ExchangePackResource::make($pack->loadMissing('items'))->resolve($request),
        ], 201);
    }

    public function update(Request $request, string $exchangePackId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'exchange-pack.update', $businessId);

        $pack = ExchangePack::query()
            ->where('business_id', $businessId)
            ->with('items')
            ->findOrFail($exchangePackId);

        $payload = $this->validatedPayload($request);

        DB::transaction(function () use ($pack, $payload, $user): void {
            $pack->forceFill([
                'name' => $payload['name'],
                'updated_by_user_id' => $user->id,
            ])->save();

            $this->syncItems($pack, $pack->items, $payload['items']);
        });

        return response()->json([
            'data' => ExchangePackResource::make($pack->fresh('items'))->resolve($request),
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

        $pack->items()->delete();
        $pack->delete();

        return response()->json([
            'data' => [
                'id' => $exchangePackId,
                'deleted' => true,
            ],
        ]);
    }

    /**
     * @return array{name: string, items: array<int, array{id: string|null, title: string, points_cost: int}>}
     */
    private function validatedPayload(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'items' => ['required', 'array', 'min:3'],
            'items.*.id' => ['nullable', 'uuid'],
            'items.*.title' => ['required', 'string', 'max:160'],
            'items.*.points_cost' => ['required', 'integer', 'min:1'],
        ]);

        return [
            'name' => trim((string) $validated['name']),
            'items' => array_map(
                fn (array $item): array => [
                    'id' => isset($item['id']) ? (string) $item['id'] : null,
                    'title' => trim((string) $item['title']),
                    'points_cost' => (int) $item['points_cost'],
                ],
                $validated['items'],
            ),
        ];
    }

    /**
     * @param  Collection<int, ExchangePackItem>  $existingItems
     * @param  array<int, array{id: string|null, title: string, points_cost: int}>  $items
     */
    private function syncItems(ExchangePack $pack, Collection $existingItems, array $items): void
    {
        $existingById = $existingItems->keyBy('id');
        $keptIds = [];

        foreach ($items as $index => $itemPayload) {
            $itemId = $itemPayload['id'];
            $attributes = [
                'title' => $itemPayload['title'],
                'description' => null,
                'item_type' => 'reward',
                'points_cost' => $itemPayload['points_cost'],
                'display_order' => $index + 1,
                'status' => 'active',
            ];

            if ($itemId !== null && $existingById->has($itemId)) {
                $existingById->get($itemId)?->forceFill($attributes)->save();
                $keptIds[] = $itemId;
                continue;
            }

            $created = $pack->items()->create($attributes);
            $keptIds[] = $created->id;
        }

        $existingItems
            ->reject(fn (ExchangePackItem $item) => in_array($item->id, $keptIds, true))
            ->each
            ->delete();
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

    private function ownerBusinessId(User $user): string
    {
        $businessId = $user->primaryBusinessAssignment?->business_id;
        abort_if($businessId === null, 403, 'No business scope is available for this action.');

        return $businessId;
    }
}
