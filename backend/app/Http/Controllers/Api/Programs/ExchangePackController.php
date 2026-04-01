<?php

namespace App\Http\Controllers\Api\Programs;

use App\Http\Controllers\Controller;
use App\Http\Resources\Programs\ExchangePackResource;
use App\Models\ExchangePack;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExchangePackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $user->primaryBusinessAssignment?->business_id;

        abort_if($businessId === null, 403, 'No business scope is available for this action.');
        abort_unless($user->hasPermissionId('exchange-pack.view', $businessId), 403, 'Forbidden.');

        $packs = ExchangePack::query()
            ->where('business_id', $businessId)
            ->where('status', 'active')
            ->with('items')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $packs->map(fn (ExchangePack $pack) => ExchangePackResource::make($pack)->resolve($request)),
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
}
