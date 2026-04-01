<?php

namespace App\Http\Controllers\Api\Notifications;

use App\Http\Controllers\Controller;
use App\Http\Resources\Notifications\AppNotificationResource;
use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);
        $this->assertPermission($user, 'notification.view', $businessId);

        $query = AppNotification::query()
            ->where('recipient_user_id', $user->id);

        if ($request->filled('read')) {
            $readFilter = (string) $request->string('read');
            if ($readFilter === 'true') {
                $query->whereNotNull('read_at');
            } elseif ($readFilter === 'false') {
                $query->whereNull('read_at');
            }
        }

        $records = $query
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $records->map(fn (AppNotification $record) => AppNotificationResource::make($record)->resolve($request)),
            'meta' => [
                'unread_count' => $records->whereNull('read_at')->count(),
            ],
        ]);
    }

    public function markRead(Request $request, string $notificationId): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);
        $this->assertPermission($user, 'notification.mark-read', $businessId);

        $record = AppNotification::query()
            ->where('recipient_user_id', $user->id)
            ->findOrFail($notificationId);

        $record->forceFill([
            'read_at' => now(),
        ])->save();

        return response()->json([
            'data' => AppNotificationResource::make($record)->resolve($request),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $this->resolveApiUser($request);
        $businessId = $this->currentBusinessId($user);
        $this->assertPermission($user, 'notification.mark-read', $businessId);

        AppNotification::query()
            ->where('recipient_user_id', $user->id)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'data' => [
                'message' => 'All notifications marked as read.',
            ],
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

    private function currentBusinessId(User $user): ?string
    {
        return $user->primaryBusinessAssignment?->business_id ?? $user->agentProfile?->business_id;
    }
}
