<?php

namespace App\Http\Controllers\Api\Auth;

use App\Mail\PasswordResetLinkMail;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Throwable;
use Illuminate\Validation\ValidationException;

class PasswordRecoveryController extends Controller
{
    public function sendResetToken(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = mb_strtolower(trim((string) $payload['email']));
        $responseData = [
            'message' => 'If this email exists, a reset token is now available for the reset flow.',
        ];

        /** @var User|null $user */
        $user = User::query()->where('email', $email)->first();

        if ($user !== null) {
            $token = Password::broker()->createToken($user);
            $resetUrl = $this->buildResetUrl($email, $token);

            try {
                Mail::to($user->email)->send(new PasswordResetLinkMail($user, $resetUrl));
            } catch (Throwable $exception) {
                Log::error('Password reset email delivery failed.', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $exception->getMessage(),
                ]);
            }

            if (app()->environment(['local', 'testing'])) {
                $responseData['reset_token'] = $token;
                $responseData['reset_url'] = $resetUrl;
            }
        }

        return response()->json([
            'data' => $responseData,
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = mb_strtolower(trim((string) $payload['email']));

        $status = Password::broker()->reset(
            [
                'email' => $email,
                'token' => (string) $payload['token'],
                'password' => (string) $payload['password'],
                'password_confirmation' => (string) $payload['password_confirmation'],
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password_hash' => Hash::make($password),
                    'status' => $user->status === 'invited' ? 'active' : $user->status,
                    'activated_at' => $user->activated_at ?? now(),
                    'last_activity_at' => now(),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'token' => __($status),
            ]);
        }

        return response()->json([
            'data' => [
                'message' => 'Password reset completed successfully.',
            ],
        ]);
    }

    private function buildResetUrl(string $email, string $token): string
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5175'), '/');

        return $frontendUrl.'/password/reset?email='.urlencode($email).'&token='.urlencode($token);
    }
}
