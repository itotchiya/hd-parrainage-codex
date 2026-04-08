<?php

namespace App\Http\Controllers\Api\Programs;

use App\Http\Controllers\Controller;
use App\Http\Resources\Programs\ProgramResource;
use App\Models\ExchangePack;
use App\Models\Program;
use App\Models\Prospect;
use App\Models\User;
use App\Services\ProgramAssignedAgentNotifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class ProgramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'program.view', $businessId);

        $query = $this->scopedProgramsQuery($user)
            ->with([
                'business',
                'exchangePack.items',
                'agentAssignments' => function ($relation): void {
                    $relation
                        ->where('status', 'active')
                        ->orderByDesc('assigned_at')
                        ->with(['agent.user']);
                },
            ])
            ->withCount([
                'agentAssignments as active_agent_assignments_count' => fn (Builder $builder) => $builder->where('status', 'active'),
            ]);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));

            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('name', 'ilike', "%{$search}%")
                    ->orWhereHas('business', fn (Builder $businessQuery) => $businessQuery->where('display_name', 'ilike', "%{$search}%"));
            });
        }

        if ($request->filled('business_id') && $this->activeRoleSlugs($user, $businessId)->contains('super-admin')) {
            $query->where('business_id', (string) $request->string('business_id'));
        }

        $programs = $query
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 WHEN status = 'paused' THEN 1 WHEN status = 'suspended' THEN 2 WHEN status = 'draft' THEN 3 ELSE 4 END")
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $programs->map(fn (Program $program) => ProgramResource::make($program)->resolve($request)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.create', $businessId);

        $payload = $this->validatedPayload($request, $businessId);

        $program = Program::query()->create([
            'business_id' => $businessId,
            'slug' => $this->uniqueSlugForBusiness($businessId, $payload['name']),
            'name' => $payload['name'],
            'description' => $payload['description'],
            'commission_type' => $payload['commission_type'],
            'exchange_mode' => $payload['exchange_mode'],
            'points_per_transaction' => $payload['points_per_transaction'],
            'points_per_euro' => $payload['points_per_euro'],
            'exchange_pack_id' => $payload['exchange_pack_id'],
            'eligibility_criteria' => $payload['eligibility_criteria'],
            'status' => $payload['status'],
            'starts_at' => $payload['starts_at'],
            'ends_at' => $payload['ends_at'],
            'activated_at' => $payload['status'] === 'active' ? now() : null,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);

        $program->loadMissing([
            'business',
            'exchangePack.items',
        ]);

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
        ], 201);
    }

    public function show(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

        $this->assertPermission($user, 'program.view', $businessId);

        $program = $this->scopedProgramsQuery($user)
            ->with([
                'business',
                'exchangePack.items',
                'agentAssignments' => function ($relation): void {
                    $relation
                        ->where('status', 'active')
                        ->orderByDesc('assigned_at')
                        ->with(['agent.user']);
                },
            ])
            ->withCount([
                'agentAssignments as active_agent_assignments_count' => fn (Builder $builder) => $builder->where('status', 'active'),
            ])
            ->findOrFail($programId);

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
        ]);
    }

    public function update(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.update', $businessId);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail($programId);

        $payload = $this->validatedPayload($request, $businessId, $program);

        $hasActiveAssignments = $this->hasActiveAssignments($program);
        $hasProspects = $this->hasAnyProspects($program);
        $isLockedByAssignments = $hasActiveAssignments || $hasProspects;

        $program->fill([
            'name' => $payload['name'],
            'description' => $payload['description'],
            'commission_type' => $payload['commission_type'],
            'exchange_mode' => $payload['exchange_mode'],
            'points_per_transaction' => $payload['points_per_transaction'],
            'points_per_euro' => $payload['points_per_euro'],
            'exchange_pack_id' => $payload['exchange_pack_id'],
            'eligibility_criteria' => $payload['eligibility_criteria'],
            'status' => $payload['status'],
            'starts_at' => $payload['starts_at'],
            'ends_at' => $payload['ends_at'],
            'updated_by_user_id' => $user->id,
        ]);

        if ($isLockedByAssignments) {
            $blockedFields = [
                'name',
                'description',
                'commission_type',
                'exchange_mode',
                'points_per_transaction',
                'points_per_euro',
                'eligibility_criteria',
                'status',
                'starts_at',
                'ends_at',
            ];

            $hasBlockedChange = collect($blockedFields)->contains(
                fn (string $field) => $program->isDirty($field)
            );

            if ($hasBlockedChange) {
                throw ValidationException::withMessages([
                    'program' => 'Program general and cash settings cannot be edited after agents or prospects are attached. Only rewards pack changes are allowed.',
                ]);
            }
        }

        if ($program->isDirty('name')) {
            $program->slug = $this->uniqueSlugForBusiness($businessId, $payload['name'], $program->id);
        }

        if ($payload['status'] === 'active' && $program->activated_at === null) {
            $program->activated_at = now();
            $program->paused_at = null;
        }

        if ($payload['status'] === 'paused') {
            $program->paused_at = now();
        }

        if ($payload['status'] === 'archived') {
            $program->archived_at = now();
        }

        if ($program->isDirty([
            'commission_type',
            'exchange_mode',
            'points_per_transaction',
            'points_per_euro',
            'exchange_pack_id',
            'eligibility_criteria',
        ])) {
            $program->rule_version++;
        }

        $exchangePackChanged = $program->isDirty('exchange_pack_id');
        $becameActiveFromDraft = $program->getOriginal('status') === 'draft' && $program->status === 'active';

        $program->save();
        $program->loadMissing([
            'business',
            'exchangePack.items',
            'agentAssignments.agent.user',
        ]);

        if ($exchangePackChanged) {
            ProgramAssignedAgentNotifier::notifyRewardsUpdated($program);
        }

        if ($becameActiveFromDraft) {
            ProgramAssignedAgentNotifier::notifyAssignmentForAllActiveAgents($program);
        }

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
        ]);
    }

    public function activate(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.update', $businessId);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail($programId);

        if ($program->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => 'Only draft programs can be activated with this action.',
            ]);
        }

        $this->assertDraftReadyForActivation($program);

        $attrs = [
            'status' => 'active',
            'activated_at' => $program->activated_at ?? now(),
            'paused_at' => null,
            'updated_by_user_id' => $user->id,
        ];
        if ($this->programsSuspensionColumnsExist()) {
            $attrs['suspended_at'] = null;
            $attrs['suspension_deadline_at'] = null;
        }
        $program->forceFill($attrs)->save();

        $program->loadMissing([
            'business',
            'exchangePack.items',
            'agentAssignments.agent.user',
        ]);

        ProgramAssignedAgentNotifier::notifyAssignmentForAllActiveAgents($program);

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
        ]);
    }

    public function pause(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.pause', $businessId);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail($programId);

        $program->forceFill([
            'status' => 'paused',
            'paused_at' => now(),
            'updated_by_user_id' => $user->id,
        ])->save();

        $program->loadMissing([
            'business',
            'exchangePack.items',
        ]);

        // Notify on every successful pause (no deduplication): repeat calls re-email assigned agents.
        ProgramAssignedAgentNotifier::notifyPaused($program);

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
        ]);
    }

    public function reactivate(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.pause', $businessId);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail($programId);

        if (! in_array($program->status, ['paused', 'suspended'], true)) {
            throw ValidationException::withMessages([
                'status' => 'Only paused or suspended programs can be reactivated (resume or lift suspension).',
            ]);
        }

        $this->assertProgramOperational($program);

        $attrs = [
            'status' => 'active',
            'activated_at' => now(),
            'paused_at' => null,
            'updated_by_user_id' => $user->id,
        ];
        if ($this->programsSuspensionColumnsExist()) {
            $attrs['suspended_at'] = null;
            $attrs['suspension_deadline_at'] = null;
        }
        $program->forceFill($attrs)->save();

        $program->loadMissing([
            'business',
            'exchangePack.items',
        ]);

        ProgramAssignedAgentNotifier::notifyResumed($program);

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
        ]);
    }

    public function suspend(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.pause', $businessId);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail($programId);

        $this->assertProgramOperational($program);

        if ($program->status === 'suspended') {
            throw ValidationException::withMessages([
                'status' => 'Program is already suspended.',
            ]);
        }

        $hasOpenProspects = $this->hasOpenProspects($program);

        if ($hasOpenProspects) {
            throw ValidationException::withMessages([
                'status' => 'Program cannot be suspended while open prospects still exist.',
            ]);
        }

        if (! $this->programsSuspensionColumnsExist()) {
            throw ValidationException::withMessages([
                'status' => 'Database schema is missing program suspension columns. Run `php artisan migrate` in the backend (migration adds programs.suspended_at and programs.suspension_deadline_at).',
            ]);
        }

        $suspendedAt = now();

        $program->forceFill([
            'status' => 'suspended',
            'paused_at' => $program->paused_at ?? $suspendedAt,
            'suspended_at' => $suspendedAt,
            'suspension_deadline_at' => $suspendedAt->copy()->addDays(30),
            'updated_by_user_id' => $user->id,
        ])->save();

        $program->loadMissing([
            'business',
            'exchangePack.items',
        ]);

        ProgramAssignedAgentNotifier::notifySuspended($program);

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
        ]);
    }

    public function archive(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.pause', $businessId);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail($programId);

        if ($program->status !== 'suspended') {
            throw ValidationException::withMessages([
                'status' => 'Program can be archived only after suspension.',
            ]);
        }

        $deadline = $program->suspension_deadline_at;
        if ($deadline === null || $deadline->isFuture()) {
            throw ValidationException::withMessages([
                'status' => 'Program can be archived only after the 30-day suspension period.',
            ]);
        }

        $program->forceFill([
            'status' => 'archived',
            'archived_at' => now(),
            'updated_by_user_id' => $user->id,
        ])->save();

        $program->loadMissing([
            'business',
            'exchangePack.items',
        ]);

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
        ]);
    }

    public function deleteFromArchive(Request $request, string $programId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);

        $this->assertPermission($user, 'program.update', $businessId);

        $program = Program::query()
            ->where('business_id', $businessId)
            ->findOrFail($programId);

        $hasActiveAgents = $program->agentAssignments()->where('status', 'active')->exists();
        $hasAnyProspects = $program->prospects()->exists();

        $allowed = $program->status === 'archived'
            || (! $hasActiveAgents && ! $hasAnyProspects);

        if (! $allowed) {
            throw ValidationException::withMessages([
                'status' => 'Program can be soft-deleted only when archived, or when it has no active agent assignments and no prospects.',
            ]);
        }

        $program->delete();

        return response()->json([
            'data' => [
                'id' => $programId,
                'deleted' => true,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedPayload(Request $request, string $businessId, ?Program $program = null): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string'],
            'commission_type' => ['required', 'string'],
            'exchange_mode' => ['required', 'in:cash,reward,both'],
            'points_per_transaction' => ['nullable', 'integer', 'min:1'],
            'points_per_euro' => ['nullable', 'integer', 'min:1'],
            'exchange_pack_id' => ['nullable', 'uuid'],
            'eligibility_criteria' => ['required', 'string'],
            'status' => ['nullable', 'in:draft,active,paused'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        $commissionType = $this->normalizeCommissionType((string) $validated['commission_type']);
        $status = (string) ($validated['status'] ?? ($commissionType === 'revenue_tier' ? 'draft' : 'active'));
        $exchangeMode = (string) $validated['exchange_mode'];
        $exchangePackId = $validated['exchange_pack_id'] ?? null;
        $pointsPerTransaction = $validated['points_per_transaction'] ?? null;
        $pointsPerEuro = $validated['points_per_euro'] ?? null;

        if ($commissionType === 'per_transaction' && $pointsPerTransaction === null) {
            throw ValidationException::withMessages([
                'points_per_transaction' => 'Points per transaction is required for per-transaction programs.',
            ]);
        }

        if (in_array($exchangeMode, ['cash', 'both'], true) && $pointsPerEuro === null) {
            throw ValidationException::withMessages([
                'points_per_euro' => 'Points per euro is required when cash exchange is enabled.',
            ]);
        }

        if (in_array($exchangeMode, ['reward', 'both'], true) && $exchangePackId === null) {
            throw ValidationException::withMessages([
                'exchange_pack_id' => 'An exchange pack is required when reward exchange is enabled.',
            ]);
        }

        if ($exchangePackId !== null) {
            $pack = ExchangePack::query()
                ->where('business_id', $businessId)
                ->where('id', $exchangePackId)
                ->where('status', 'active')
                ->withCount([
                    'items as active_items_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                ])
                ->first();

            if ($pack === null) {
                throw ValidationException::withMessages([
                    'exchange_pack_id' => 'The selected exchange pack is not available in the current business scope.',
                ]);
            }

            if (in_array($exchangeMode, ['reward', 'both'], true) && (int) $pack->active_items_count === 0) {
                throw ValidationException::withMessages([
                    'exchange_pack_id' => 'The selected exchange pack must contain at least one active reward item.',
                ]);
            }
        }

        return [
            'name' => trim((string) $validated['name']),
            'description' => $validated['description'] === null ? null : trim((string) $validated['description']),
            'commission_type' => $commissionType,
            'exchange_mode' => $exchangeMode,
            'points_per_transaction' => $pointsPerTransaction,
            'points_per_euro' => $pointsPerEuro,
            'exchange_pack_id' => $exchangePackId,
            'eligibility_criteria' => trim((string) $validated['eligibility_criteria']),
            'status' => $status,
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
        ];
    }

    private function hasActiveAssignments(Program $program): bool
    {
        return $program->agentAssignments()
            ->where('status', 'active')
            ->exists();
    }

    private function hasAnyProspects(Program $program): bool
    {
        return $program->prospects()->exists();
    }

    private function hasOpenProspects(Program $program): bool
    {
        return $program->prospects()
            ->where('conversion_status', 'open')
            ->exists();
    }

    private function assertDraftReadyForActivation(Program $program): void
    {
        if ($program->commission_type === 'per_transaction' && $program->points_per_transaction === null) {
            throw ValidationException::withMessages([
                'points_per_transaction' => 'Set points per transaction before activating.',
            ]);
        }

        if (in_array($program->exchange_mode, ['cash', 'both'], true) && $program->points_per_euro === null) {
            throw ValidationException::withMessages([
                'points_per_euro' => 'Set points per euro before activating.',
            ]);
        }

        if (in_array($program->exchange_mode, ['reward', 'both'], true) && $program->exchange_pack_id === null) {
            throw ValidationException::withMessages([
                'exchange_pack_id' => 'Select an exchange pack before activating.',
            ]);
        }

        if (in_array($program->exchange_mode, ['reward', 'both'], true)) {
            $activeItemsCount = ExchangePack::query()
                ->where('business_id', $program->business_id)
                ->where('id', $program->exchange_pack_id)
                ->where('status', 'active')
                ->whereHas('items', fn (Builder $builder) => $builder->where('status', 'active'))
                ->count();

            if ($activeItemsCount === 0) {
                throw ValidationException::withMessages([
                    'exchange_pack_id' => 'Select an exchange pack with at least one active reward item before activating.',
                ]);
            }
        }
    }

    /** Cached: suspension fields from migration 2026_04_02_120000_add_suspension_fields_to_programs_table. */
    private function programsSuspensionColumnsExist(): bool
    {
        static $cache = null;

        if ($cache !== null) {
            return $cache;
        }

        return $cache = Schema::hasColumn('programs', 'suspended_at')
            && Schema::hasColumn('programs', 'suspension_deadline_at');
    }

    private function assertProgramOperational(Program $program): void
    {
        if ($program->status === 'archived') {
            throw ValidationException::withMessages([
                'status' => 'Archived programs are read-only and cannot be reactivated or paused.',
            ]);
        }
    }

    private function normalizeCommissionType(string $value): string
    {
        return match ($value) {
            'per-transaction' => 'per_transaction',
            'revenue-tier' => 'revenue_tier',
            'per_transaction', 'revenue_tier' => $value,
            default => throw ValidationException::withMessages([
                'commission_type' => 'Unsupported commission type.',
            ]),
        };
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

    private function currentBusinessId(User $user): ?string
    {
        return $user->primaryBusinessAssignment?->business_id ?? $user->agentProfile?->business_id;
    }

    private function ownerBusinessId(User $user): string
    {
        $businessId = $user->primaryBusinessAssignment?->business_id;

        abort_if($businessId === null, 403, 'No business scope is available for this action.');

        return $businessId;
    }

    private function activeRoleSlugs(User $user, ?string $businessId = null): Collection
    {
        return $user->activeRoleSlugs($businessId);
    }

    private function scopedProgramsQuery(User $user): Builder
    {
        $businessId = $this->currentBusinessId($user);
        $roleSlugs = $this->activeRoleSlugs($user, $businessId);

        $query = Program::query();

        if ($roleSlugs->contains('agent') && ! $roleSlugs->contains('business-owner')) {
            $agent = $user->agentProfile;

            abort_if($agent === null, 403, 'No agent profile is available for this action.');

            return $query
                ->where('status', '!=', 'draft')
                ->whereHas('agentAssignments', function (Builder $builder) use ($agent): void {
                    $builder
                        ->where('agent_id', $agent->id)
                        ->where('status', 'active');
                });
        }

        if ($businessId !== null && $roleSlugs->contains('business-owner')) {
            return $query->where('business_id', $businessId);
        }

        return $query;
    }

    private function uniqueSlugForBusiness(string $businessId, string $name, ?string $ignoreProgramId = null): string
    {
        $baseSlug = Str::slug($name);
        $slug = $baseSlug;
        $iteration = 2;

        while (Program::query()
            ->where('business_id', $businessId)
            ->when($ignoreProgramId !== null, fn (Builder $builder) => $builder->whereKeyNot($ignoreProgramId))
            ->where('slug', $slug)
            ->exists()) {
            $slug = "{$baseSlug}-{$iteration}";
            $iteration++;
        }

        return $slug;
    }
}
