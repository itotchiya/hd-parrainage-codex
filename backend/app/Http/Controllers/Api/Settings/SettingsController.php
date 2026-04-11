<?php

namespace App\Http\Controllers\Api\Settings;

use App\Mail\SettingsEmailVerificationMail;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\User;
use App\Support\CurrentBusinessContext;
use App\Support\FrontendUrlResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SettingsController extends Controller
{
    private const AVATAR_DISK = 'r2';

    public function show(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);

        $canView = $user->hasPermissionId('settings.view-platform', $businessId)
            || $user->hasPermissionId('settings.view-business', $businessId)
            || $user->hasPermissionId('settings.view-own', $businessId);

        abort_unless($canView, 403, 'Forbidden.');

        $business = $businessId === null ? null : Business::query()->find($businessId);

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'display_name' => $user->display_name,
                    'avatar_url' => $user->avatar_url,
                    'email' => $user->email,
                    'pending_email' => $user->pending_email,
                    'phone_number' => $user->phone_number,
                    'email_verified_at' => $user->email_verified_at?->toISOString(),
                    'pending_email_verification_sent_at' => $user->pending_email_verification_sent_at?->toISOString(),
                    'pending_email_verification_expires_at' => $user->pending_email_verification_expires_at?->toISOString(),
                    'status' => $user->status,
                ],
                'business' => $business === null ? null : [
                    'id' => $business->id,
                    'slug' => $business->slug,
                    'display_name' => $business->display_name,
                    'logo_url' => $business->logo_url,
                    'legal_name' => $business->legal_name,
                    'contact_email' => $business->contact_email,
                    'contact_phone' => $business->contact_phone,
                    'website_url' => $business->website_url,
                    'timezone' => $business->timezone,
                    'currency_code' => $business->currency_code,
                ],
                'permissions' => [
                    'can_update_own' => $user->hasPermissionId('settings.update-own', $businessId),
                    'can_update_business' => $user->hasPermissionId('settings.update-business', $businessId),
                ],
            ],
        ]);
    }

    public function updateOwn(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);
        abort_unless($user->hasPermissionId('settings.update-own', $businessId), 403, 'Forbidden.');

        $payload = $request->validate([
            'display_name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone_number' => ['nullable', 'string', 'max:40'],
            'avatar_url' => ['nullable', 'url', 'max:2048'],
        ]);

        $displayName = trim((string) $payload['display_name']);
        $email = mb_strtolower(trim((string) $payload['email']));
        $phoneNumber = isset($payload['phone_number']) && $payload['phone_number'] !== null
            ? trim((string) $payload['phone_number'])
            : null;
        $user->forceFill([
            'display_name' => $displayName,
            'email' => $email,
            'phone_number' => $phoneNumber !== '' ? $phoneNumber : null,
            'avatar_url' => isset($payload['avatar_url']) && $payload['avatar_url'] !== null
                ? trim((string) $payload['avatar_url'])
                : null,
            'last_activity_at' => now(),
            'updated_by_user_id' => $user->id,
        ])->save();

        return $this->show($request);
    }

    public function resendOwnEmailVerification(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);
        abort_unless($user->hasPermissionId('settings.update-own', $businessId), 403, 'Forbidden.');

        if ($user->pending_email !== null && $user->pending_email !== '') {
            $this->sendPendingEmailVerification($request, $user, $user->pending_email);
        } else {
            abort_if($user->email_verified_at !== null, 422, 'This email address is already verified.');
            $this->sendCurrentEmailVerification($request, $user);
        }

        return response()->json([
            'data' => [
                'message' => 'Verification email sent successfully.',
            ],
        ]);
    }

    public function requestOwnEmailChange(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);
        abort_unless($user->hasPermissionId('settings.update-own', $businessId), 403, 'Forbidden.');

        $payload = $request->validate([
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $pendingEmail = mb_strtolower(trim((string) $payload['email']));

        abort_if($pendingEmail === mb_strtolower((string) $user->email), 422, 'This email is already the active account email.');

        $this->sendPendingEmailVerification($request, $user, $pendingEmail);

        return $this->show($request);
    }

    public function verifyOwnEmailCode(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);
        abort_unless($user->hasPermissionId('settings.update-own', $businessId), 403, 'Forbidden.');

        $payload = $request->validate([
            'code' => ['required', 'digits:6'],
        ]);

        abort_if($user->pending_email === null || $user->pending_email === '', 422, 'No pending email verification is available.');
        abort_if(
            $user->pending_email_verification_expires_at === null || $user->pending_email_verification_expires_at->isPast(),
            422,
            'The verification code has expired. Request a new email verification.',
        );

        $expectedHash = (string) $user->pending_email_verification_code_hash;
        $submittedHash = hash('sha256', (string) $payload['code']);

        abort_unless(hash_equals($expectedHash, $submittedHash), 422, 'The verification code is invalid.');

        $user->forceFill([
            'email' => $user->pending_email,
            'pending_email' => null,
            'pending_email_verification_code_hash' => null,
            'pending_email_verification_sent_at' => null,
            'pending_email_verification_expires_at' => null,
            'email_verified_at' => now(),
            'last_activity_at' => now(),
            'updated_by_user_id' => $user->id,
        ])->save();

        return $this->show($request);
    }

    public function updateOwnPassword(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);
        abort_unless($user->hasPermissionId('settings.update-own', $businessId), 403, 'Forbidden.');

        $payload = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string', 'min:8'],
        ]);

        abort_unless(Hash::check((string) $payload['current_password'], (string) $user->password_hash), 422, 'The current password is incorrect.');

        $user->forceFill([
            'password_hash' => (string) $payload['password'],
            'remember_token' => Str::random(60),
            'last_activity_at' => now(),
            'updated_by_user_id' => $user->id,
        ])->save();

        return response()->json([
            'data' => [
                'message' => 'Password updated successfully.',
            ],
        ]);
    }

    public function updateBusiness(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);
        abort_unless($user->hasPermissionId('settings.update-business', $businessId), 403, 'Forbidden.');

        $payload = $request->validate([
            'display_name' => ['required', 'string', 'max:160'],
            'contact_email' => ['nullable', 'email'],
            'contact_phone' => ['nullable', 'string', 'max:60'],
            'website_url' => ['nullable', 'url', 'max:255'],
            'timezone' => ['nullable', 'string', 'max:80'],
        ]);

        $business = Business::query()->findOrFail($businessId);
        $business->forceFill([
            'display_name' => trim((string) $payload['display_name']),
            'contact_email' => $payload['contact_email'] ?? null,
            'contact_phone' => $payload['contact_phone'] ?? null,
            'website_url' => $payload['website_url'] ?? null,
            'timezone' => $payload['timezone'] ?? $business->timezone,
        ])->save();

        return $this->show($request);
    }

    public function showBusinessIacrm(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);
        abort_unless($user->hasPermissionId('settings.view-business', $businessId), 403, 'Forbidden.');

        $business = Business::query()->findOrFail($businessId);

        return response()->json([
            'data' => $this->businessIacrmPayload($business),
        ]);
    }

    public function updateBusinessIacrm(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);
        abort_unless($user->hasPermissionId('settings.update-business', $businessId), 403, 'Forbidden.');

        $payload = $this->validatedBusinessIacrmPayload($request);
        $business = Business::query()->findOrFail($businessId);
        $currentApiKey = $business->iacrm_api_key;
        $currentBaseUrl = $business->iacrm_base_url;
        $nextBaseUrl = rtrim((string) $payload['base_url'], '/');
        $nextApiKey = trim((string) $payload['api_key']);

        $business->forceFill([
            'iacrm_base_url' => $nextBaseUrl,
            'iacrm_api_key' => $nextApiKey !== '' ? $nextApiKey : null,
            'iacrm_auto_sync_enabled' => (bool) $payload['auto_sync_enabled'],
            'iacrm_connection_status' => $currentApiKey !== $nextApiKey || $currentBaseUrl !== $nextBaseUrl
                ? 'untested'
                : $business->iacrm_connection_status,
            'iacrm_last_tested_at' => $currentApiKey !== $nextApiKey || $currentBaseUrl !== $nextBaseUrl
                ? null
                : $business->iacrm_last_tested_at,
        ])->save();

        return response()->json([
            'data' => $this->businessIacrmPayload($business->fresh()),
        ]);
    }

    public function testBusinessIacrm(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);
        abort_unless($user->hasPermissionId('settings.update-business', $businessId), 403, 'Forbidden.');

        $payload = $this->validatedBusinessIacrmPayload($request);
        $business = Business::query()->findOrFail($businessId);
        $baseUrl = rtrim((string) $payload['base_url'], '/');
        $apiKey = trim((string) $payload['api_key']);

        abort_if($apiKey === '', 422, 'An IACRM API key is required to test the connection.');

        $ok = false;
        $message = 'Connection successful.';

        try {
            $response = Http::withHeaders([
                'X-IACRM-API-Key' => $apiKey,
                'Accept' => 'application/json',
            ])->timeout(10)->post("{$baseUrl}/auth/token", [
                'api_key' => $apiKey,
                'grant_type' => 'api_key',
            ]);

            if ($response->successful()) {
                $ok = true;
            } else {
                $message = $response->body() !== '' ? $response->body() : "IACRM returned {$response->status()}.";
            }
        } catch (\Throwable $exception) {
            $message = $exception->getMessage();
        }

        $business->forceFill([
            'iacrm_base_url' => $baseUrl,
            'iacrm_api_key' => $apiKey,
            'iacrm_auto_sync_enabled' => (bool) $payload['auto_sync_enabled'],
            'iacrm_connection_status' => $ok ? 'connected' : 'failed',
            'iacrm_last_tested_at' => now(),
        ])->save();

        return response()->json([
            'data' => $this->businessIacrmPayload($business->fresh()),
            'meta' => [
                'ok' => $ok,
                'message' => $message,
            ],
        ]);
    }

    public function uploadOwnAvatar(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($request, $user);
        abort_unless($user->hasPermissionId('settings.update-own', $businessId), 403, 'Forbidden.');

        $payload = $request->validate([
            'avatar' => ['required', 'file', 'mimes:webp', 'max:5120'],
        ]);

        $avatar = $payload['avatar'];
        $path = sprintf('avatars/%s/%s.webp', $user->id, (string) Str::uuid());

        $disk = Storage::disk(self::AVATAR_DISK);

        if ($user->avatar_storage_path !== null && $user->avatar_storage_path !== '') {
            $disk->delete($user->avatar_storage_path);
        }

        $stream = fopen($avatar->getRealPath(), 'rb');
        abort_if($stream === false, 422, 'The avatar file could not be processed.');

        $disk->writeStream($path, $stream, [
            'ContentType' => 'image/webp',
            'CacheControl' => 'public, max-age=31536000, immutable',
        ]);

        if (is_resource($stream)) {
            fclose($stream);
        }

        $user->forceFill([
            'avatar_url' => $this->avatarUrl($user->id, basename($path)),
            'avatar_storage_path' => $path,
            'updated_by_user_id' => $user->id,
        ])->save();

        return $this->show($request);
    }

    public function uploadBusinessLogo(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->ownerBusinessId($user);
        abort_unless($user->hasPermissionId('settings.update-business', $businessId), 403, 'Forbidden.');

        $payload = $request->validate([
            'logo' => ['required', 'file', 'mimes:webp', 'max:5120'],
        ]);

        $logo = $payload['logo'];
        $path = sprintf('logos/%s/%s.webp', $businessId, (string) Str::uuid());

        $disk = Storage::disk(self::AVATAR_DISK);

        $business = Business::query()->findOrFail($businessId);

        if ($business->logo_storage_path !== null && $business->logo_storage_path !== '') {
            $disk->delete($business->logo_storage_path);
        }

        $stream = fopen($logo->getRealPath(), 'rb');
        abort_if($stream === false, 422, 'The logo file could not be processed.');

        $disk->writeStream($path, $stream, [
            'ContentType' => 'image/webp',
            'CacheControl' => 'public, max-age=31536000, immutable',
        ]);

        if (is_resource($stream)) {
            fclose($stream);
        }

        $business->forceFill([
            'logo_url' => $this->logoUrl($businessId, basename($path)),
            'logo_storage_path' => $path,
        ])->save();

        return $this->show($request);
    }

    public function showAvatar(string $userId, string $fileName): StreamedResponse
    {
        $path = sprintf('avatars/%s/%s', $userId, $fileName);
        $disk = Storage::disk(self::AVATAR_DISK);

        abort_unless($disk->exists($path), 404);

        $stream = $disk->readStream($path);
        abort_if($stream === false, 404);

        return response()->stream(
            static function () use ($stream): void {
                fpassthru($stream);

                if (is_resource($stream)) {
                    fclose($stream);
                }
            },
            200,
            [
                'Content-Type' => 'image/webp',
                'Cache-Control' => 'public, max-age=31536000, immutable',
            ],
        );
    }

    public function showLogo(string $businessId, string $fileName): StreamedResponse
    {
        $path = sprintf('logos/%s/%s', $businessId, $fileName);
        $disk = Storage::disk(self::AVATAR_DISK);

        abort_unless($disk->exists($path), 404);

        $stream = $disk->readStream($path);
        abort_if($stream === false, 404);

        return response()->stream(
            static function () use ($stream): void {
                fpassthru($stream);

                if (is_resource($stream)) {
                    fclose($stream);
                }
            },
            200,
            [
                'Content-Type' => 'image/webp',
                'Cache-Control' => 'public, max-age=31536000, immutable',
            ],
        );
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

    private function avatarUrl(string $userId, string $fileName): string
    {
        return rtrim(config('app.url'), '/').sprintf('/api/public/media/avatars/%s/%s', $userId, $fileName);
    }

    private function logoUrl(string $businessId, string $fileName): string
    {
        return rtrim(config('app.url'), '/').sprintf('/api/public/media/logos/%s/%s', $businessId, $fileName);
    }

    private function sendCurrentEmailVerification(Request $request, User $user): void
    {
        $verificationCode = $this->generateVerificationCode();
        $verificationUrl = URL::temporarySignedRoute(
            'auth.email.verify',
            now()->addHours(24),
            [
                'id' => $user->id,
                'hash' => sha1($user->email),
                'redirect' => FrontendUrlResolver::settingsUrl($request, [
                    'emailVerified' => '1',
                ]),
            ],
        );

        Mail::to($user->email)->send(
            new SettingsEmailVerificationMail($user, $verificationUrl, $verificationCode, $user->email),
        );
    }

    private function sendPendingEmailVerification(Request $request, User $user, string $pendingEmail): void
    {
        $verificationCode = $this->generateVerificationCode();

        $user->forceFill([
            'pending_email' => $pendingEmail,
            'pending_email_verification_code_hash' => hash('sha256', $verificationCode),
            'pending_email_verification_sent_at' => now(),
            'pending_email_verification_expires_at' => now()->addMinutes(15),
            'updated_by_user_id' => $user->id,
        ])->save();

        $verificationUrl = URL::temporarySignedRoute(
            'auth.email.verify',
            now()->addHours(24),
            [
                'id' => $user->id,
                'hash' => sha1($pendingEmail),
                'redirect' => FrontendUrlResolver::settingsUrl($request, [
                    'emailVerified' => '1',
                ]),
            ],
        );

        Mail::to($pendingEmail)->send(
            new SettingsEmailVerificationMail($user, $verificationUrl, $verificationCode, $pendingEmail),
        );
    }

    private function generateVerificationCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * @return array{base_url: string, api_key: string, auto_sync_enabled: bool, last_tested_at: ?string, connection_status: string}
     */
    private function businessIacrmPayload(Business $business): array
    {
        $defaultBaseUrl = rtrim((string) config('services.iacrm.base_url', ''), '/');

        return [
            'base_url' => $business->iacrm_base_url ? rtrim((string) $business->iacrm_base_url, '/') : $defaultBaseUrl,
            'api_key' => $business->iacrm_api_key ?? '',
            'auto_sync_enabled' => (bool) $business->iacrm_auto_sync_enabled,
            'last_tested_at' => $business->iacrm_last_tested_at?->toISOString(),
            'connection_status' => $business->iacrm_connection_status ?: 'untested',
        ];
    }

    /**
     * @return array{base_url: string, api_key: string, auto_sync_enabled: bool}
     */
    private function validatedBusinessIacrmPayload(Request $request): array
    {
        /** @var array{base_url: string, api_key?: ?string, auto_sync_enabled?: bool} $payload */
        $payload = $request->validate([
            'base_url' => ['required', 'url', 'max:255'],
            'api_key' => ['nullable', 'string', 'max:255'],
            'auto_sync_enabled' => ['sometimes', 'boolean'],
        ]);

        return [
            'base_url' => trim((string) $payload['base_url']),
            'api_key' => trim((string) ($payload['api_key'] ?? '')),
            'auto_sync_enabled' => (bool) ($payload['auto_sync_enabled'] ?? false),
        ];
    }
}
