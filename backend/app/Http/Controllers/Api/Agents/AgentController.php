<?php

namespace App\Http\Controllers\Api\Agents;

use App\Mail\AgentInvitationMail;
use App\Http\Controllers\Controller;
use App\Http\Resources\Agents\AgentResource;
use App\Models\Agent;
use App\Models\AppNotification;
use App\Models\BusinessUserAssignment;
use App\Models\InvitationActivationToken;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use App\Support\CurrentBusinessContext;
use App\Support\FrontendUrlResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;
use Illuminate\Validation\ValidationException;

class AgentController extends Controller
{
    public function show(Request $request, string $agentId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);
        $this->assertPermission($user, 'agent.view', $businessId);

        $agent = $this->scopedAgentsQuery($user, $businessId)
            ->with([
                'user',
                'programAssignments' => function ($query): void {
                    $query
                        ->whereNull('removed_at')
                        ->orderByDesc('assigned_at')
                        ->with([
                            'program' => function ($programQuery): void {
                                $programQuery->withCount([
                                    'agentAssignments as assigned_agents_count' => function ($assignmentQuery): void {
                                        $assignmentQuery->whereNull('removed_at');
                                    },
                                ]);
                            },
                        ]);
                },
                'prospects' => function ($query): void {
                    $query
                        ->with('program')
                        ->orderByDesc('submitted_at');
                },
            ])
            ->withCount([
                'prospects as active_pipeline_prospects_count' => fn (Builder $query) => $this->activePipelineProspectsScope($query),
                'programAssignments as assigned_programs_count' => fn (Builder $query) => $query->whereNull('removed_at'),
            ])
            ->findOrFail($agentId);

        return response()->json([
            'data' => AgentResource::make($agent)->resolve($request),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);

        $this->assertPermission($user, 'agent.view', $businessId);

        $query = $this->scopedAgentsQuery($user, $businessId)
            ->with([
                'user',
                'programAssignments' => function ($query): void {
                    $query
                        ->whereNull('removed_at')
                        ->orderByDesc('assigned_at')
                        ->with([
                            'program' => function ($programQuery): void {
                                $programQuery->withCount([
                                    'agentAssignments as assigned_agents_count' => function ($assignmentQuery): void {
                                        $assignmentQuery->whereNull('removed_at');
                                    },
                                ]);
                            },
                        ]);
                },
            ])
            ->withCount([
                'prospects as active_pipeline_prospects_count' => fn (Builder $prospectsQuery) => $this->activePipelineProspectsScope($prospectsQuery),
                'programAssignments as assigned_programs_count' => fn (Builder $query) => $query->whereNull('removed_at'),
            ]);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('agent_code', 'ilike', "%{$search}%")
                    ->orWhereHas('user', function (Builder $userQuery) use ($search): void {
                        $userQuery
                            ->where('display_name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    });
            });
        }

        $records = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $records->map(fn (Agent $agent) => AgentResource::make($agent)->resolve($request)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'agent.invite', $businessId);

        $payload = $request->validate([
            'display_name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email'],
            'notes' => ['nullable', 'string'],
        ]);

        $email = mb_strtolower(trim((string) $payload['email']));
        $plainToken = Str::upper(Str::random(12));

        $lastException = null;
        $agent = null;
        $createdUser = false;

        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                [$agent, $createdUser] = DB::transaction(function () use ($payload, $email, $user, $businessId, $plainToken): array {
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

        AppNotification::query()->create([
            'recipient_user_id' => $agent->user_id,
            'business_id' => $businessId,
            'notification_type' => 'agent',
            'title' => 'Invitation envoyee',
            'message' => 'Votre invitation agent est creee. Activez votre compte pour commencer.',
            'severity' => 'info',
            'metadata' => [
                'event' => 'agent_invited',
                'agent_id' => $agent->id,
            ],
            'read_at' => null,
        ]);

        AppNotification::query()->create([
            'recipient_user_id' => $user->id,
            'business_id' => $businessId,
            'notification_type' => 'business',
            'title' => 'Agent invite',
            'message' => sprintf('%s a ete invite en tant qu agent.', $agent->user->display_name ?? $agent->user->email),
            'severity' => 'info',
            'metadata' => [
                'event' => 'agent_invited',
                'agent_id' => $agent->id,
                'agent_user_id' => $agent->user_id,
            ],
            'read_at' => null,
        ]);

        $mailDeliveryFailed = false;
        $mailDeliveryError = null;

        try {
            Mail::to($agent->user->email)->send(new AgentInvitationMail($agent, $activationUrl));
        } catch (Throwable $exception) {
            $mailDeliveryFailed = true;
            $mailDeliveryError = $exception->getMessage();

            Log::error('Agent invitation email delivery failed.', [
                'agent_id' => $agent->id,
                'user_id' => $agent->user_id,
                'email' => $agent->user->email,
                'error' => $mailDeliveryError,
            ]);
        }

        $response = [
            'data' => AgentResource::make($agent)->resolve($request),
            'meta' => [
                'created_user' => $createdUser,
                'mail_delivery_failed' => $mailDeliveryFailed,
            ],
        ];

        if (app()->environment(['local', 'testing'])) {
            $response['meta']['invitation_token'] = $plainToken;
            $response['meta']['activation_url'] = $activationUrl;
            $response['meta']['mail_delivery_error'] = $mailDeliveryError;
        }

        return response()->json($response, 201);
    }

    public function suspend(Request $request, string $agentId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);
        $this->assertPermission($user, 'agent.suspend', $businessId);

        $payload = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $agent = Agent::query()
            ->where('business_id', $businessId)
            ->with('user')
            ->withCount([
                'prospects as active_pipeline_prospects_count' => fn (Builder $query) => $this->activePipelineProspectsScope($query),
                'programAssignments as assigned_programs_count' => fn (Builder $query) => $query->whereNull('removed_at'),
            ])
            ->findOrFail($agentId);

        if ($agent->status === 'suspended') {
            throw ValidationException::withMessages([
                'status' => 'Agent is already suspended.',
            ]);
        }

        $agent->forceFill([
            'status' => 'suspended',
            'suspended_at' => now(),
        ])->save();

        $agent->user?->forceFill([
            'status' => 'suspended',
            'suspended_at' => now(),
        ])->save();

        $reason = trim((string) $payload['reason']);
        $this->notifyAgentLifecycleChange(
            agent: $agent,
            businessId: $businessId,
            event: 'agent_suspended',
            title: 'Compte affilié suspendu',
            message: sprintf(
                'Votre accès affilié a été suspendu. Motif : %s',
                $reason
            ),
            metadata: [
                'reason' => $reason,
                'active_pipeline_prospects_count' => (int) ($agent->active_pipeline_prospects_count ?? 0),
            ],
        );

        $agent->load('user')->loadCount([
            'prospects as active_pipeline_prospects_count' => fn (Builder $query) => $this->activePipelineProspectsScope($query),
            'programAssignments as assigned_programs_count' => fn (Builder $query) => $query->whereNull('removed_at'),
        ]);

        return response()->json([
            'data' => AgentResource::make($agent)->resolve($request),
        ]);
    }

    public function reactivate(Request $request, string $agentId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);
        $this->assertPermission($user, 'agent.reactivate', $businessId);

        $agent = Agent::query()
            ->where('business_id', $businessId)
            ->with('user')
            ->withCount([
                'prospects as active_pipeline_prospects_count' => fn (Builder $query) => $this->activePipelineProspectsScope($query),
                'programAssignments as assigned_programs_count' => fn (Builder $query) => $query->whereNull('removed_at'),
            ])
            ->findOrFail($agentId);

        if ($agent->status !== 'suspended') {
            throw ValidationException::withMessages([
                'status' => 'Only suspended agents can be reactivated.',
            ]);
        }

        $agent->forceFill([
            'status' => 'active',
            'activated_at' => $agent->activated_at ?? now(),
            'suspended_at' => null,
        ])->save();

        $agent->user?->forceFill([
            'status' => 'active',
            'activated_at' => $agent->user->activated_at ?? now(),
            'suspended_at' => null,
        ])->save();

        $this->notifyAgentLifecycleChange(
            agent: $agent,
            businessId: $businessId,
            event: 'agent_reactivated',
            title: 'Compte affilié réactivé',
            message: 'Votre accès affilié a été réactivé. Vous pouvez à nouveau utiliser la plateforme.',
            metadata: [
                'active_pipeline_prospects_count' => (int) ($agent->active_pipeline_prospects_count ?? 0),
            ],
        );

        $agent->load('user')->loadCount([
            'prospects as active_pipeline_prospects_count' => fn (Builder $query) => $this->activePipelineProspectsScope($query),
            'programAssignments as assigned_programs_count' => fn (Builder $query) => $query->whereNull('removed_at'),
        ]);

        return response()->json([
            'data' => AgentResource::make($agent)->resolve($request),
        ]);
    }

    private function activePipelineProspectsScope(Builder $query): void
    {
        $query
            ->where('submission_status', '!=', 'deleted')
            ->whereNotIn('conversion_status', ['converted', 'lost']);
    }

    private function notifyAgentLifecycleChange(
        Agent $agent,
        string $businessId,
        string $event,
        string $title,
        string $message,
        array $metadata = [],
    ): void {
        if ($agent->user_id === null) {
            return;
        }

        AppNotification::query()->create([
            'recipient_user_id' => $agent->user_id,
            'business_id' => $businessId,
            'notification_type' => 'agent',
            'title' => $title,
            'message' => $message,
            'severity' => $event === 'agent_suspended' ? 'warning' : 'info',
            'metadata' => array_merge([
                'event' => $event,
                'agent_id' => $agent->id,
            ], $metadata),
            'read_at' => null,
        ]);
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

    private function scopedAgentsQuery(User $user, ?string $businessId): Builder
    {
        $query = Agent::query();

        if ($businessId !== null && $user->activeRoleSlugs($businessId)->contains('business-owner')) {
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

    private function currentBusinessId(Request|User $requestOrUser, ?User $user = null): ?string
    {
        if ($requestOrUser instanceof Request) {
            return CurrentBusinessContext::resolve($user, $requestOrUser);
        }

        return CurrentBusinessContext::resolve($requestOrUser);
    }

    private function ownerBusinessId(User $user): string
    {
        $businessId = $this->currentBusinessId($user);
        abort_if($businessId === null, 403, 'No business scope is available for this action.');
        return $businessId;
    }
}
