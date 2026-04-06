<?php

namespace App\Http\Controllers\Api\Frontend2\Programs;

// Frontend2-only controller. Keep the simplified prototype-alignment logic isolated from the older frontend controllers.

use App\Http\Controllers\Controller;
use App\Http\Resources\Programs\ProgramResource;
use App\Models\ExchangePack;
use App\Models\Program;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Frontend2ProgramController extends Controller
{
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
            'activated_at' => $payload['status'] === 'active' ? now() : null,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);

        $program->loadMissing(['business', 'exchangePack.items']);

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
        ], 201);
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
            'updated_by_user_id' => $user->id,
        ]);

        if ($program->isDirty('name')) {
            $program->slug = $this->uniqueSlugForBusiness($businessId, $payload['name'], $program->id);
        }

        if ($payload['status'] === 'active') {
            $program->activated_at = $program->activated_at ?? now();
            $program->paused_at = null;
            if ($this->programsSuspensionColumnsExist()) {
                $program->suspended_at = null;
                $program->suspension_deadline_at = null;
            }
        }

        if ($payload['status'] === 'paused') {
            $program->paused_at = now();
        }

        $program->save();
        $program->loadMissing(['business', 'exchangePack.items']);

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

        $attributes = [
            'status' => 'suspended',
            'paused_at' => now(),
            'updated_by_user_id' => $user->id,
        ];

        if ($this->programsSuspensionColumnsExist()) {
            $attributes['suspended_at'] = now();
            $attributes['suspension_deadline_at'] = null;
        }

        $program->forceFill($attributes)->save();
        $program->loadMissing(['business', 'exchangePack.items']);

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

        $attributes = [
            'status' => 'active',
            'activated_at' => now(),
            'paused_at' => null,
            'updated_by_user_id' => $user->id,
        ];

        if ($this->programsSuspensionColumnsExist()) {
            $attributes['suspended_at'] = null;
            $attributes['suspension_deadline_at'] = null;
        }

        $program->forceFill($attributes)->save();
        $program->loadMissing(['business', 'exchangePack.items']);

        return response()->json([
            'data' => ProgramResource::make($program)->resolve($request),
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
            'eligibility_criteria' => ['nullable', 'string'],
            'status' => ['nullable', 'in:draft,active,paused,suspended'],
        ]);

        $commissionType = $this->normalizeCommissionType((string) $validated['commission_type']);
        $exchangeMode = (string) $validated['exchange_mode'];
        $status = (string) ($validated['status'] ?? ($program?->status ?? 'active'));
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
            $packExists = ExchangePack::query()
                ->where('business_id', $businessId)
                ->where('id', $exchangePackId)
                ->exists();

            if (! $packExists) {
                throw ValidationException::withMessages([
                    'exchange_pack_id' => 'The selected exchange pack is not available in the current business scope.',
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
            'eligibility_criteria' => trim((string) ($validated['eligibility_criteria'] ?? '')),
            'status' => $status,
        ];
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

    private function programsSuspensionColumnsExist(): bool
    {
        static $cache = null;

        if ($cache !== null) {
            return $cache;
        }

        return $cache = \Illuminate\Support\Facades\Schema::hasColumn('programs', 'suspended_at')
            && \Illuminate\Support\Facades\Schema::hasColumn('programs', 'suspension_deadline_at');
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
