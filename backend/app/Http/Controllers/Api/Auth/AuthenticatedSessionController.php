<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\Auth\AuthenticatedUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = mb_strtolower(trim((string) $credentials['email']));
        $password = (string) $credentials['password'];

        /** @var User|null $user */
        $user = User::query()
            ->with([
                'userRoles.role.permissions',
                'businessAssignments.business',
                'primaryBusinessAssignment.business',
                'agentProfile.business',
                'userPermissionOverrides.permission',
            ])
            ->where('email', $email)
            ->first();

        if ($user === null || ! Hash::check($password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'code' => 'AUTH_USER_INACTIVE',
                'message' => 'The user account is not active.',
            ], 403);
        }

        Auth::guard('web')->login($user, (bool) $request->boolean('remember'));
        $request->session()->regenerate();

        $user->forceFill([
            'last_login_at' => now(),
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

    public function destroy(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
