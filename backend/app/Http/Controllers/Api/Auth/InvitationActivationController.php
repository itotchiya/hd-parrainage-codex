<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\Auth\AuthenticatedUserResource;
use App\Models\AppNotification;
use App\Models\BusinessUserAssignment;
use App\Models\InvitationActivationToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvitationActivationController extends Controller
{
    public function validateToken(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
        ]);

        $email = mb_strtolower(trim((string) $payload['email']));
        $tokenDigest = hash('sha256', trim((string) $payload['token']));

        $token = InvitationActivationToken::query()
            ->where('email', $email)
            ->where('token_digest', $tokenDigest)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest('created_at')
            ->first();

        if ($token === null) {
            return response()->json([
                'data' => [
                    'valid' => false,
                    'message' => 'Activation token is invalid or expired.',
                ],
            ], 422);
        }

        $user = User::query()->find($token->user_id);

        if ($user === null) {
            return response()->json([
                'data' => [
                    'valid' => false,
                    'message' => 'Invitation no longer exists.',
                ],
            ], 422);
        }

        return response()->json([
            'data' => [
                'valid' => true,
                'message' => 'Activation token is valid.',
                'display_name' => $user->display_name,
                'email' => $user->email,
            ],
        ]);
    }

    public function activate(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = mb_strtolower(trim((string) $payload['email']));
        $tokenDigest = hash('sha256', trim((string) $payload['token']));

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

        if ($user === null) {
            throw ValidationException::withMessages([
                'email' => 'Invalid activation payload.',
            ]);
        }

        $token = InvitationActivationToken::query()
            ->where('user_id', $user->id)
            ->where('email', $email)
            ->where('token_digest', $tokenDigest)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest('created_at')
            ->first();

        if ($token === null) {
            throw ValidationException::withMessages([
                'token' => 'Activation token is invalid or expired.',
            ]);
        }

        // Resolve businessId from any assignment (not just active ones), because
        // the assignment is still 'invited' at this point and primaryBusinessAssignment
        // filters to status='active' only.
        $businessId = $user->agentProfile?->business_id;

        if ($businessId === null) {
            $anyAssignment = BusinessUserAssignment::query()
                ->where('user_id', $user->id)
                ->where('is_primary', true)
                ->first();
            $businessId = $anyAssignment?->business_id;
        }

        DB::transaction(function () use ($user, $token, $payload, $businessId): void {
            $user->forceFill([
                'password_hash' => (string) $payload['password'],
                'status' => 'active',
                'activated_at' => $user->activated_at ?? now(),
                'email_verified_at' => $user->email_verified_at ?? now(),
                'last_activity_at' => now(),
            ])->save();

            if ($user->agentProfile !== null && $user->agentProfile->status !== 'active') {
                $user->agentProfile->forceFill([
                    'status' => 'active',
                    'activated_at' => $user->agentProfile->activated_at ?? now(),
                ])->save();
            }

            if ($businessId !== null) {
                // Activate both owner and agent assignments (was previously only 'agent')
                BusinessUserAssignment::query()
                    ->where('business_id', $businessId)
                    ->where('user_id', $user->id)
                    ->whereIn('assignment_type', ['owner', 'agent'])
                    ->update([
                        'status' => 'active',
                        'activated_at' => now(),
                        'updated_at' => now(),
                    ]);
            }

            $token->forceFill([
                'used_at' => now(),
            ])->save();
        });

        if ($businessId !== null) {
            AppNotification::query()->create([
                'recipient_user_id' => $user->id,
                'business_id' => $businessId,
                'notification_type' => 'agent',
                'title' => 'Compte active',
                'message' => 'Votre compte agent est maintenant actif.',
                'severity' => 'success',
                'metadata' => [
                    'event' => 'agent_activation',
                ],
                'read_at' => null,
            ]);

            $ownerUserIds = BusinessUserAssignment::query()
                ->where('business_id', $businessId)
                ->where('assignment_type', 'owner')
                ->where('status', 'active')
                ->pluck('user_id')
                ->unique()
                ->values();

            foreach ($ownerUserIds as $ownerUserId) {
                AppNotification::query()->create([
                    'recipient_user_id' => $ownerUserId,
                    'business_id' => $businessId,
                    'notification_type' => 'business',
                    'title' => 'Agent active',
                    'message' => sprintf('%s a active son compte agent.', $user->display_name ?? $user->email),
                    'severity' => 'info',
                    'metadata' => [
                        'event' => 'agent_activation',
                        'agent_user_id' => $user->id,
                    ],
                    'read_at' => null,
                ]);
            }
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

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
