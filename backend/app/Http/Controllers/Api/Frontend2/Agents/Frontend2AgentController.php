<?php

namespace App\Http\Controllers\Api\Frontend2\Agents;

// Frontend2-only controller. Keep the prototype-specific invite-plus-program-assignment flow isolated from the older frontend controllers.

use App\Http\Controllers\Controller;
use App\Http\Resources\Agents\AgentResource;
use App\Mail\Frontend2AgentInvitationMail;
use App\Models\Agent;
use App\Models\BusinessUserAssignment;
use App\Models\InvitationActivationToken;
use App\Models\Program;
use App\Models\ProgramAgentAssignment;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use App\Support\FrontendUrlResolver;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;
use Illuminate\Validation\ValidationException;

class Frontend2AgentController extends Controller
{
    public function inviteWithProgram(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'agent.invite', $businessId);
        $this->assertPermission($user, 'program.assign-agent', $businessId);

        $payload = $request->validate([
            'display_name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email'],
            'program_id' => ['required', 'uuid'],
            'notes' => ['nullable', 'string'],
        ]);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail((string) $payload['program_id']);

        $email = mb_strtolower(trim((string) $payload['email']));
        $plainToken = Str::upper(Str::random(12));

        $lastException = null;
        $agent = null;
        $createdUser = false;

        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                [$agent, $createdUser] = DB::transaction(function () use ($payload, $email, $user, $businessId, $program, $plainToken): array {
                    $agentRole = Role::query()->where('slug', 'agent')->firstOrFail();

                    $targetUser = User::query()->where('email', $email)->first();

                    if ($targetUser === null) {
                        $targetUser = User::query()->create([
                            'display_name' => trim((string) $payload['display_name']),
                            'email' => $email,
                            'password_hash' => Str::random(32),
                            'status' => 'invited',
                            'invited_at' => now(),
                            'created_by_user_id' => $user->id,
                        ]);
                        $createdUser = true;
                    } else {
                        $createdUser = false;
                        $targetUser->forceFill([
                            'display_name' => trim((string) $payload['display_name']),
                            'status' => $targetUser->status === 'active' ? 'active' : 'invited',
                            'invited_at' => $targetUser->invited_at ?? now(),
                            'updated_by_user_id' => $user->id,
                        ])->save();
                    }

                    BusinessUserAssignment::query()->updateOrCreate(
                        [
                            'business_id' => $businessId,
                            'user_id' => $targetUser->id,
                            'assignment_type' => 'agent',
                        ],
                        [
                            'status' => 'invited',
                            'is_primary' => false,
                            'assigned_by_user_id' => $user->id,
                            'invited_at' => now(),
                        ],
                    );

                    UserRole::query()->updateOrCreate(
                        [
                            'user_id' => $targetUser->id,
                            'role_id' => $agentRole->id,
                            'scope_type' => 'business',
                            'business_id' => $businessId,
                        ],
                        [
                            'assigned_by_user_id' => $user->id,
                            'assigned_at' => now(),
                            'status' => 'active',
                        ],
                    );

                    $agent = Agent::query()
                        ->withTrashed()
                        ->where('business_id', $businessId)
                        ->where('user_id', $targetUser->id)
                        ->first();

                    if ($agent === null) {
                        $agent = new Agent([
                            'business_id' => $businessId,
                            'user_id' => $targetUser->id,
                            'agent_code' => $this->nextAgentCode($businessId),
                        ]);
                    } elseif ($agent->agent_code === null || $agent->agent_code === '') {
                        $agent->agent_code = $this->nextAgentCode($businessId);
                    }

                    $agent->forceFill([
                        'status' => 'invited',
                        'invited_by_user_id' => $user->id,
                        'invited_at' => now(),
                        'notes' => isset($payload['notes']) ? trim((string) $payload['notes']) : null,
                        'suspended_at' => null,
                        'deleted_at' => null,
                    ])->save();

                    ProgramAgentAssignment::query()->updateOrCreate(
                        [
                            'program_id' => $program->id,
                            'agent_id' => $agent->id,
                        ],
                        [
                            'status' => 'active',
                            'assigned_by_user_id' => $user->id,
                            'assigned_at' => now(),
                            'paused_at' => null,
                            'removed_at' => null,
                        ],
                    );

                    InvitationActivationToken::query()
                        ->where('user_id', $targetUser->id)
                        ->whereNull('used_at')
                        ->delete();

                    InvitationActivationToken::query()->create([
                        'user_id' => $targetUser->id,
                        'email' => $targetUser->email,
                        'token_digest' => hash('sha256', $plainToken),
                        'expires_at' => now()->addDays(14),
                        'created_by_user_id' => $user->id,
                    ]);

                    return [$agent->fresh(['user', 'business']), $createdUser];
                });
                $lastException = null;
                break;
            } catch (QueryException $exception) {
                if ($this->isAgentCodeUniqueViolation($exception)) {
                    $lastException = $exception;
                    continue;
                }
                throw $exception;
            }
        }

        if ($lastException !== null || $agent === null) {
            throw ValidationException::withMessages([
                'email' => 'Impossible de finaliser l’invitation pour le moment. Veuillez réessayer.',
            ]);
        }

        $activationUrl = FrontendUrlResolver::activationUrl($request, $agent->user->email, $plainToken);

        $mailDeliveryFailed = false;
        $mailDeliveryError = null;

        try {
            Mail::to($agent->user->email)->send(
                new Frontend2AgentInvitationMail(
                    $agent,
                    $program,
                    $activationUrl,
                ),
            );
        } catch (Throwable $exception) {
            $mailDeliveryFailed = true;
            $mailDeliveryError = $exception->getMessage();

            Log::error('Frontend2 agent invitation email delivery failed.', [
                'agent_id' => $agent->id,
                'user_id' => $agent->user_id,
                'program_id' => $program->id,
                'email' => $agent->user->email,
                'error' => $mailDeliveryError,
            ]);
        }

        $response = [
            'data' => AgentResource::make($agent)->resolve($request),
            'meta' => [
                'created_user' => $createdUser,
                'mail_delivery_failed' => $mailDeliveryFailed,
                'assigned_program_id' => $program->id,
                'assigned_program_name' => $program->name,
            ],
        ];

        if (app()->environment(['local', 'testing'])) {
            $response['meta']['invitation_token'] = $plainToken;
            $response['meta']['activation_url'] = $activationUrl;
            $response['meta']['mail_delivery_error'] = $mailDeliveryError;
        }

        return response()->json($response, 201);
    }

    private function nextAgentCode(string $businessId): string
    {
        $codes = Agent::query()
            ->withTrashed()
            ->where('business_id', $businessId)
            ->whereNotNull('agent_code')
            ->pluck('agent_code');

        $max = 0;
        foreach ($codes as $code) {
            if (preg_match('/^AGT-(\d+)$/', (string) $code, $matches) === 1) {
                $max = max($max, (int) $matches[1]);
            }
        }

        $next = $max + 1;
        do {
            $candidate = 'AGT-'.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
            $exists = Agent::query()
                ->withTrashed()
                ->where('business_id', $businessId)
                ->where('agent_code', $candidate)
                ->exists();
            $next++;
        } while ($exists);

        return $candidate;
    }

    private function isAgentCodeUniqueViolation(QueryException $exception): bool
    {
        return str_contains((string) $exception->getMessage(), 'agents_business_id_agent_code_unique');
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
