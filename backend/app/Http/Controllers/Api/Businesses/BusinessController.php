<?php

namespace App\Http\Controllers\Api\Businesses;

use App\Http\Controllers\Controller;
use App\Http\Resources\Businesses\BusinessDetailResource;
use App\Http\Resources\Businesses\BusinessListResource;
use App\Mail\BusinessInvitationMail;
use App\Models\Business;
use App\Models\BusinessUserAssignment;
use App\Models\InvitationActivationToken;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use App\Support\FrontendUrlResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BusinessController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.view');

        $query = Business::query()
            ->with([
                'userAssignments.user',
            ])
            ->withCount([
                'agents',
                'programs',
                'prospects',
                'transactions',
                'exchangeRequests as exchange_requests_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
            ]);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('display_name', 'ilike', "%{$search}%")
                    ->orWhere('legal_name', 'ilike', "%{$search}%")
                    ->orWhere('industry', 'ilike', "%{$search}%")
                    ->orWhere('slug', 'ilike', "%{$search}%")
                    ->orWhereHas('userAssignments.user', function (Builder $userQuery) use ($search): void {
                        $userQuery
                            ->where('display_name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    });
            });
        }

        $records = $query
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 WHEN status = 'approved' THEN 1 WHEN status = 'rejected' THEN 2 ELSE 3 END")
            ->orderBy('display_name')
            ->get();

        return response()->json([
            'data' => $records->map(fn (Business $business) => BusinessListResource::make($business)->resolve($request)),
        ]);
    }

    public function show(Request $request, string $businessId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.view');

        $business = Business::query()
            ->with([
                'approvedByUser',
                'rejectedByUser',
                'userAssignments.user',
                'programs' => fn ($query) => $query->orderBy('name'),
            ])
            ->withCount([
                'programs',
                'programs as active_programs_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                'agents',
                'agents as active_agents_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                'prospects',
                'transactions',
                'exchangeRequests as exchange_requests_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
            ])
            ->findOrFail($businessId);

        return response()->json([
            'data' => BusinessDetailResource::make($business)->resolve($request),
        ]);
    }

    public function approve(Request $request, string $businessId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.approve');

        $business = Business::query()->findOrFail($businessId);

        if ($business->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending businesses can be approved.',
            ]);
        }

        $business->forceFill([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by_user_id' => $user->id,
            'rejected_at' => null,
            'rejected_by_user_id' => null,
            'archived_at' => null,
        ])->save();

        return response()->json([
            'data' => BusinessDetailResource::make(
                $business->fresh([
                    'approvedByUser',
                    'rejectedByUser',
                    'userAssignments.user',
                    'programs',
                ])->loadCount([
                    'programs',
                    'programs as active_programs_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                    'agents',
                    'agents as active_agents_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                    'prospects',
                    'transactions',
                    'exchangeRequests as exchange_requests_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
                ])
            )->resolve($request),
        ]);
    }

    public function reject(Request $request, string $businessId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.reject');

        $business = Business::query()->findOrFail($businessId);

        if ($business->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending businesses can be rejected.',
            ]);
        }

        $business->forceFill([
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejected_by_user_id' => $user->id,
            'approved_at' => null,
            'approved_by_user_id' => null,
        ])->save();

        return response()->json([
            'data' => BusinessDetailResource::make(
                $business->fresh([
                    'approvedByUser',
                    'rejectedByUser',
                    'userAssignments.user',
                    'programs',
                ])->loadCount([
                    'programs',
                    'programs as active_programs_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                    'agents',
                    'agents as active_agents_count' => fn (Builder $builder) => $builder->where('status', 'active'),
                    'prospects',
                    'transactions',
                    'exchangeRequests as exchange_requests_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
                ])
            )->resolve($request),
        ]);
    }

    public function invite(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.approve');

        $payload = $request->validate([
            'iacrm_business_id' => ['required', 'string', 'max:255'],
            'business_name'     => ['required', 'string', 'max:160'],
            'owner_email'       => ['required', 'email', 'max:255'],
            'owner_name'        => ['required', 'string', 'max:160'],
            'notes'             => ['nullable', 'string', 'max:2000'],
        ]);

        $ownerEmail  = mb_strtolower(trim((string) $payload['owner_email']));
        $ownerName   = trim((string) $payload['owner_name']);
        $businessName = trim((string) $payload['business_name']);
        $iacrmId     = trim((string) $payload['iacrm_business_id']);

        // IACRM business ID is required - all businesses must come from IACRM
        if ($iacrmId === '') {
            throw ValidationException::withMessages([
                'iacrm_business_id' => 'Un business IACRM est requis. Veuillez sélectionner un business depuis IACRM.',
            ]);
        }

        $existingByIacrm = Business::query()->where('iacrm_business_id', $iacrmId)->first();
        if ($existingByIacrm !== null) {
            throw ValidationException::withMessages([
                'iacrm_business_id' => 'A business with this IACRM ID already exists on the platform.',
            ]);
        }

        $plainToken = Str::upper(Str::random(12));

        [$business, $owner] = DB::transaction(function () use ($payload, $ownerEmail, $ownerName, $businessName, $iacrmId, $user, $plainToken): array {
            $slug = Str::slug($businessName) ?: Str::slug($ownerEmail);
            $baseSlug = $slug;
            $counter = 1;
            while (Business::query()->where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter++;
            }

            $business = Business::query()->create([
                'slug'              => $slug,
                'legal_name'        => $businessName,
                'display_name'      => $businessName,
                'iacrm_business_id' => $iacrmId,
                'status'            => 'pending',
                'currency_code'     => 'EUR',
                'timezone'          => 'Europe/Paris',
            ]);

            $owner = User::query()->where('email', $ownerEmail)->first();
            if ($owner === null) {
                $owner = User::query()->create([
                    'display_name'      => $ownerName,
                    'email'             => $ownerEmail,
                    'password_hash'     => Str::random(32),
                    'status'            => 'invited',
                    'invited_at'        => now(),
                    'created_by_user_id' => $user->id,
                ]);
            } else {
                $owner->forceFill([
                    'display_name'      => $ownerName,
                    'status'            => $owner->status === 'active' ? 'active' : 'invited',
                    'invited_at'        => $owner->invited_at ?? now(),
                    'updated_by_user_id' => $user->id,
                ])->save();
            }

            $ownerRole = Role::query()->where('slug', 'business-owner')->firstOrFail();

            BusinessUserAssignment::query()->updateOrCreate(
                [
                    'business_id'     => $business->id,
                    'user_id'         => $owner->id,
                    'assignment_type' => 'owner',
                ],
                [
                    'status'               => 'invited',
                    'is_primary'           => true,
                    'assigned_by_user_id'  => $user->id,
                    'invited_at'           => now(),
                ],
            );

            UserRole::query()->updateOrCreate(
                [
                    'user_id'     => $owner->id,
                    'role_id'     => $ownerRole->id,
                    'scope_type'  => 'business',
                    'business_id' => $business->id,
                ],
                [
                    'assigned_by_user_id' => $user->id,
                    'assigned_at'         => now(),
                    'status'              => 'active',
                ],
            );

            InvitationActivationToken::query()
                ->where('user_id', $owner->id)
                ->whereNull('used_at')
                ->delete();

            InvitationActivationToken::query()->create([
                'user_id'            => $owner->id,
                'email'              => $owner->email,
                'token_digest'       => hash('sha256', $plainToken),
                'expires_at'         => now()->addDays(14),
                'created_by_user_id' => $user->id,
            ]);

            return [$business, $owner];
        });

        // Note: IACRM business ID is required.
        // New businesses start with zero data - no agents, programs, or prospects.
        // The business owner must configure everything from scratch after activation.

        $activationUrl = FrontendUrlResolver::activationUrl($request, $owner->email, $plainToken);

        $mailDeliveryFailed = false;
        $mailDeliveryError  = null;

        try {
            Mail::to($owner->email)->send(new BusinessInvitationMail($owner, $business, $activationUrl));
        } catch (Throwable $exception) {
            $mailDeliveryFailed = true;
            $mailDeliveryError  = $exception->getMessage();
            Log::error('Business invitation email delivery failed.', [
                'business_id' => $business->id,
                'user_id'     => $owner->id,
                'email'       => $owner->email,
                'error'       => $mailDeliveryError,
            ]);
        }

        $business->load(['approvedByUser', 'rejectedByUser', 'userAssignments.user', 'programs'])
            ->loadCount([
                'programs',
                'programs as active_programs_count'          => fn (Builder $b) => $b->where('status', 'active'),
                'agents',
                'agents as active_agents_count'              => fn (Builder $b) => $b->where('status', 'active'),
                'prospects',
                'transactions',
                'exchangeRequests as exchange_requests_count' => fn (Builder $b) => $b->where('status', 'pending'),
            ]);

        $response = [
            'data' => BusinessDetailResource::make($business)->resolve($request),
            'meta' => [
                'mail_delivery_failed' => $mailDeliveryFailed,
            ],
        ];

        if (app()->environment(['local', 'testing'])) {
            $response['meta']['invitation_token']    = $plainToken;
            $response['meta']['activation_url']      = $activationUrl;
            $response['meta']['mail_delivery_error'] = $mailDeliveryError;
        }

        return response()->json($response, 201);
    }

    public function resendInvitation(Request $request, string $businessId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $this->assertPermission($user, 'business.approve');

        $business = Business::query()
            ->with(['userAssignments.user'])
            ->findOrFail($businessId);

        $ownerAssignment = $business->userAssignments
            ->where('assignment_type', 'owner')
            ->where('is_primary', true)
            ->first();

        if ($ownerAssignment === null || $ownerAssignment->user === null) {
            throw ValidationException::withMessages([
                'business_id' => 'No primary owner found for this business.',
            ]);
        }

        $owner = $ownerAssignment->user;

        if ($owner->status === 'active') {
            throw ValidationException::withMessages([
                'business_id' => 'The owner has already activated their account.',
            ]);
        }

        $plainToken = Str::upper(Str::random(12));

        InvitationActivationToken::query()
            ->where('user_id', $owner->id)
            ->whereNull('used_at')
            ->delete();

        InvitationActivationToken::query()->create([
            'user_id'            => $owner->id,
            'email'              => $owner->email,
            'token_digest'       => hash('sha256', $plainToken),
            'expires_at'         => now()->addDays(14),
            'created_by_user_id' => $user->id,
        ]);

        $activationUrl = FrontendUrlResolver::activationUrl($request, $owner->email, $plainToken);

        $mailDeliveryFailed = false;
        try {
            Mail::to($owner->email)->send(new BusinessInvitationMail($owner, $business, $activationUrl));
        } catch (Throwable $exception) {
            $mailDeliveryFailed = true;
            Log::error('Business resend invitation email failed.', [
                'business_id' => $business->id,
                'email'       => $owner->email,
                'error'       => $exception->getMessage(),
            ]);
        }

        $response = ['data' => ['message' => 'Invitation resent successfully.']];

        if (app()->environment(['local', 'testing'])) {
            $response['meta']['activation_url']      = $activationUrl;
            $response['meta']['mail_delivery_failed'] = $mailDeliveryFailed;
        }

        return response()->json($response);
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

    private function assertPermission(User $user, string $permissionId): void
    {
        abort_unless($user->hasPermissionId($permissionId), 403, 'Forbidden.');
    }
}
