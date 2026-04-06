<?php

namespace App\Http\Controllers\Api\Programs;

use App\Http\Controllers\Controller;
use App\Http\Resources\Programs\AssignedAgentResource;
use App\Mail\ProgramAssignmentMail;
use App\Mail\ProgramUnassignedMail;
use App\Models\Agent;
use App\Models\AppNotification;
use App\Models\Program;
use App\Models\ProgramAgentAssignment;
use App\Models\Prospect;
use App\Models\User;
use App\Services\ProgramAssignedAgentNotifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ProgramAgentAssignmentController extends Controller
{
    public function index(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.view', $businessId);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail($programId);

        $assignments = $program->agentAssignments()
            ->with('agent.user')
            ->where('status', 'active')
            ->orderByDesc('assigned_at')
            ->get();

        return response()->json([
            'data' => $assignments->map(fn (ProgramAgentAssignment $assignment) => AssignedAgentResource::make($assignment)->resolve($request)),
        ]);
    }

    public function sync(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.assign-agent', $businessId);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail($programId);

        $payload = $request->validate([
            'agent_ids' => ['required', 'array'],
            'agent_ids.*' => ['uuid'],
        ]);

        $agentIds = Agent::query()
            ->where('business_id', $businessId)
            ->whereIn('id', $payload['agent_ids'])
            ->pluck('id');

        $activeAssignments = $program->agentAssignments()
            ->where('status', 'active')
            ->get()
            ->keyBy('agent_id');
        $previousAgentIds = $activeAssignments->keys();

        foreach ($agentIds as $agentId) {
            ProgramAgentAssignment::query()->updateOrCreate(
                [
                    'program_id' => $program->id,
                    'agent_id' => $agentId,
                ],
                [
                    'status' => 'active',
                    'assigned_by_user_id' => $user->id,
                    'assigned_at' => now(),
                    'paused_at' => null,
                    'removed_at' => null,
                ],
            );
        }

        $newAgentIds = $agentIds->diff($previousAgentIds)->values();
        $removedAgentIds = $previousAgentIds->diff($agentIds)->values();

        if ($removedAgentIds->isNotEmpty()) {
            $blockedRemovalAgentIds = Prospect::query()
                ->where('program_id', $program->id)
                ->whereIn('agent_id', $removedAgentIds->all())
                ->pluck('agent_id')
                ->unique()
                ->values();

            if ($blockedRemovalAgentIds->isNotEmpty()) {
                $blockedNames = Agent::query()
                    ->whereIn('id', $blockedRemovalAgentIds->all())
                    ->with('user')
                    ->get()
                    ->map(fn (Agent $agent) => $agent->user?->display_name ?? $agent->user?->email ?? $agent->id)
                    ->values()
                    ->all();

                throw ValidationException::withMessages([
                    'agent_ids' => sprintf(
                        'Cannot remove agent(s) from this program because they already created prospects: %s.',
                        implode(', ', $blockedNames)
                    ),
                ]);
            }
        }

        $activeAssignments
            ->reject(fn (ProgramAgentAssignment $assignment, string $agentId) => $agentIds->contains($agentId))
            ->each(function (ProgramAgentAssignment $assignment): void {
                $assignment->forceFill([
                    'status' => 'removed',
                    'removed_at' => now(),
                ])->save();
            });

        if ($newAgentIds->isNotEmpty() && $program->status !== 'draft') {
            $agents = Agent::query()
                ->with('user')
                ->whereIn('id', $newAgentIds->all())
                ->get();
            $businessName = $program->business?->display_name ?? 'Business';
            $programUrl = $this->buildProgramUrl($program->id);
            $mailStaggerIndex = 0;

            foreach ($agents as $agent) {
                if ($agent->user_id === null) {
                    continue;
                }

                AppNotification::query()->create([
                    'recipient_user_id' => $agent->user_id,
                    'business_id' => $businessId,
                    'notification_type' => 'program',
                    'title' => 'Program assigned',
                    'message' => sprintf('You were assigned to program "%s".', $program->name),
                    'severity' => 'info',
                    'metadata' => [
                        'event' => 'program_assigned',
                        'program_id' => $program->id,
                        'agent_id' => $agent->id,
                    ],
                    'read_at' => null,
                ]);

                if ($agent->user?->email) {
                    ProgramAssignedAgentNotifier::deliverProgramAgentMail(
                        $agent->user->email,
                        $mailStaggerIndex,
                        new ProgramAssignmentMail($program, $businessName, $programUrl),
                        'Program assignment email delivery failed.',
                        [
                            'program_id' => $program->id,
                            'agent_id' => $agent->id,
                            'email' => $agent->user->email,
                        ],
                    );
                    $mailStaggerIndex++;
                }
            }
        }

        if ($removedAgentIds->isNotEmpty()) {
            $removedAgents = Agent::query()
                ->with('user')
                ->whereIn('id', $removedAgentIds->all())
                ->get();
            $businessName = $program->business?->display_name ?? 'Business';
            $programUrl = $this->buildProgramUrl($program->id);
            $mailStaggerIndex = 0;

            foreach ($removedAgents as $agent) {
                if ($agent->user_id === null) {
                    continue;
                }

                AppNotification::query()->create([
                    'recipient_user_id' => $agent->user_id,
                    'business_id' => $businessId,
                    'notification_type' => 'program',
                    'title' => 'Program unassigned',
                    'message' => sprintf('You were removed from program "%s".', $program->name),
                    'severity' => 'info',
                    'metadata' => [
                        'event' => 'program_unassigned',
                        'program_id' => $program->id,
                        'agent_id' => $agent->id,
                    ],
                    'read_at' => null,
                ]);

                if ($agent->user?->email) {
                    ProgramAssignedAgentNotifier::deliverProgramAgentMail(
                        $agent->user->email,
                        $mailStaggerIndex,
                        new ProgramUnassignedMail($program, $businessName, $programUrl),
                        'Program unassignment email delivery failed.',
                        [
                            'program_id' => $program->id,
                            'agent_id' => $agent->id,
                            'email' => $agent->user->email,
                        ],
                    );
                    $mailStaggerIndex++;
                }
            }
        }

        $assignments = $program->agentAssignments()
            ->with('agent.user')
            ->where('status', 'active')
            ->orderByDesc('assigned_at')
            ->get();

        return response()->json([
            'data' => $assignments->map(fn (ProgramAgentAssignment $assignment) => AssignedAgentResource::make($assignment)->resolve($request)),
        ]);
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

    private function buildProgramUrl(string $programId): string
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5175'), '/');

        return $frontendUrl.'/programs/'.$programId;
    }
}
