<?php

namespace App\Http\Controllers\Api\Programs;

use App\Http\Controllers\Controller;
use App\Http\Resources\Programs\AssignedAgentResource;
use App\Models\Agent;
use App\Models\Program;
use App\Models\ProgramAgentAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

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

        $activeAssignments
            ->reject(fn (ProgramAgentAssignment $assignment, string $agentId) => $agentIds->contains($agentId))
            ->each(function (ProgramAgentAssignment $assignment): void {
                $assignment->forceFill([
                    'status' => 'removed',
                    'removed_at' => now(),
                ])->save();
            });

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
}
