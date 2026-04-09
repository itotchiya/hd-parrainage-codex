<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_reset_completes_with_a_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'reset.agent@example.test',
            'password_hash' => Hash::make('OldPassword123!'),
        ]);

        $token = Password::broker()->createToken($user);
        $csrfToken = 'test-csrf-token';

        $response = $this
            ->withSession(['_token' => $csrfToken])
            ->withHeader('X-CSRF-TOKEN', $csrfToken)
            ->postJson('/api/auth/password/reset', [
                'email' => $user->email,
                'token' => $token,
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.message', 'Password reset completed successfully.');

        $user->refresh();

        $this->assertTrue(Hash::check('NewPassword123!', $user->password_hash));
    }
}
