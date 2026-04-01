<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\Auth\AuthenticatedUserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurrentUserController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_if($user === null, 401);

        $user->forceFill([
            'last_activity_at' => now(),
        ])->save();

        return response()->json([
            'data' => new AuthenticatedUserResource($user->fresh([
                'userRoles.role.permissions',
                'businessAssignments.business',
                'primaryBusinessAssignment.business',
                'agentProfile.business',
                'userPermissionOverrides.permission',
            ])),
        ]);
    }
}
