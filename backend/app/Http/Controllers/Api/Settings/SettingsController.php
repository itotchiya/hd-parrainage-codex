<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SettingsController extends Controller
{
    private const AVATAR_DISK = 'r2';

    public function show(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);

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
                    'status' => $user->status,
                ],
                'business' => $business === null ? null : [
                    'id' => $business->id,
                    'slug' => $business->slug,
                    'display_name' => $business->display_name,
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
        $businessId = $this->currentBusinessId($user);
        abort_unless($user->hasPermissionId('settings.update-own', $businessId), 403, 'Forbidden.');

        $payload = $request->validate([
            'display_name' => ['required', 'string', 'max:160'],
            'avatar_url' => ['nullable', 'url', 'max:2048'],
        ]);

        $user->forceFill([
            'display_name' => trim((string) $payload['display_name']),
            'avatar_url' => isset($payload['avatar_url']) && $payload['avatar_url'] !== null
                ? trim((string) $payload['avatar_url'])
                : null,
            'updated_by_user_id' => $user->id,
        ])->save();

        return $this->show($request);
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

    public function uploadOwnAvatar(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);
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

    private function avatarUrl(string $userId, string $fileName): string
    {
        return rtrim(config('app.url'), '/').sprintf('/api/public/media/avatars/%s/%s', $userId, $fileName);
    }
}
