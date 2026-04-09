<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\FrontendUrlResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    public function verify(Request $request, string $id, string $hash): RedirectResponse
    {
        abort_unless($request->hasValidSignature(), 403);

        $user = User::query()->findOrFail($id);
        $pendingEmail = $user->pending_email;

        if ($pendingEmail !== null && $pendingEmail !== '' && hash_equals((string) $hash, sha1($pendingEmail))) {
            $user->forceFill([
                'email' => $pendingEmail,
                'pending_email' => null,
                'pending_email_verification_code_hash' => null,
                'pending_email_verification_sent_at' => null,
                'pending_email_verification_expires_at' => null,
                'email_verified_at' => now(),
                'last_activity_at' => now(),
            ])->save();
        } else {
            abort_unless(hash_equals((string) $hash, sha1($user->email)), 403);

            if ($user->email_verified_at === null) {
                $user->forceFill([
                    'email_verified_at' => now(),
                    'last_activity_at' => now(),
                ])->save();
            }
        }

        $redirectUrl = (string) $request->query('redirect', '');

        if (! FrontendUrlResolver::isTrustedFrontendUrl($redirectUrl)) {
            $redirectUrl = FrontendUrlResolver::settingsUrl($request, [
                'emailVerified' => '1',
            ]);
        }

        return redirect()->away($redirectUrl);
    }
}
