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
        abort_unless(hash_equals((string) $hash, sha1($user->email)), 403);

        if ($user->email_verified_at === null) {
            $user->forceFill([
                'email_verified_at' => now(),
                'last_activity_at' => now(),
            ])->save();
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
