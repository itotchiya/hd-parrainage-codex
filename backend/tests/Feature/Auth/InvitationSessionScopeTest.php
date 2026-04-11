<?php

namespace Tests\Feature\Auth;

use App\Models\Agent;
use App\Models\Business;
use App\Models\BusinessUserAssignment;
use App\Models\InvitationActivationToken;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class InvitationSessionScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_newly_activated_business_owner_gets_owner_scope_after_login(): void
    {
        Mail::fake();
        $this->seed(FoundationSeeder::class);

        $business = $this->createBusiness('owner-scope-business', 'Owner Scope Business');
        $ownerRole = Role::query()->where('slug', 'business-owner')->firstOrFail();
        $inviter = User::query()->where('email', 'superadmin@hd-parrainage.test')->firstOrFail();

        $user = User::factory()->create([
            'email' => 'new.owner.scope@example.test',
            'status' => 'invited',
            'email_verified_at' => null,
            'activated_at' => null,
            'created_by_user_id' => $inviter->id,
        ]);

        BusinessUserAssignment::query()->create([
            'business_id' => $business->id,
            'user_id' => $user->id,
            'assignment_type' => 'owner',
            'status' => 'invited',
            'is_primary' => true,
            'assigned_by_user_id' => $inviter->id,
            'invited_at' => now(),
        ]);

        UserRole::query()->create([
            'user_id' => $user->id,
            'role_id' => $ownerRole->id,
            'scope_type' => 'business',
            'business_id' => $business->id,
            'assigned_by_user_id' => $inviter->id,
            'assigned_at' => now(),
            'status' => 'active',
        ]);

        $plainToken = 'OWNER-SCOPE-TEST';

        InvitationActivationToken::query()->create([
            'user_id' => $user->id,
            'email' => $user->email,
            'token_digest' => hash('sha256', $plainToken),
            'expires_at' => now()->addDays(7),
            'created_by_user_id' => $inviter->id,
        ]);

        $this->postWithCsrf('/api/auth/invitation/activate', [
            'email' => $user->email,
            'token' => $plainToken,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertOk();

        $user->refresh();
        $user->forceFill(['email_verified_at' => now()])->save();

        $loginResponse = $this->postWithCsrf('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
            'remember' => false,
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonPath('data.current_business_id', $business->id)
            ->assertJsonPath('data.primary_business.id', $business->id)
            ->assertJsonMissingPath('data.agent_profile.id');

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.current_business_id', $business->id)
            ->assertJsonFragment(['slug' => 'business-owner'])
            ->assertJsonMissing(['slug' => 'agent']);

        $this->getJson('/api/v1/dashboard/business-summary')->assertOk();
        $this->getJson('/api/v1/agents')->assertOk();
    }

    public function test_existing_agent_invited_as_owner_switches_session_to_owner_business(): void
    {
        Mail::fake();
        $this->seed(FoundationSeeder::class);

        $agentRole = Role::query()->where('slug', 'agent')->firstOrFail();
        $ownerRole = Role::query()->where('slug', 'business-owner')->firstOrFail();
        $inviter = User::query()->where('email', 'superadmin@hd-parrainage.test')->firstOrFail();

        $agentBusiness = $this->createBusiness('legacy-agent-business', 'Legacy Agent Business');
        $ownerBusiness = $this->createBusiness('new-owner-business', 'New Owner Business');

        $user = User::factory()->create([
            'email' => 'mixed.scope@example.test',
            'status' => 'active',
            'email_verified_at' => now(),
            'created_by_user_id' => $inviter->id,
        ]);

        BusinessUserAssignment::query()->create([
            'business_id' => $agentBusiness->id,
            'user_id' => $user->id,
            'assignment_type' => 'agent',
            'status' => 'active',
            'is_primary' => false,
            'assigned_by_user_id' => $inviter->id,
            'invited_at' => now()->subDays(5),
            'activated_at' => now()->subDays(4),
        ]);

        UserRole::query()->create([
            'user_id' => $user->id,
            'role_id' => $agentRole->id,
            'scope_type' => 'business',
            'business_id' => $agentBusiness->id,
            'assigned_by_user_id' => $inviter->id,
            'assigned_at' => now()->subDays(5),
            'status' => 'active',
        ]);

        Agent::query()->create([
            'business_id' => $agentBusiness->id,
            'user_id' => $user->id,
            'agent_code' => 'AGT-SCOPE-001',
            'status' => 'active',
            'invited_by_user_id' => $inviter->id,
            'invited_at' => now()->subDays(5),
            'activated_at' => now()->subDays(4),
        ]);

        BusinessUserAssignment::query()->create([
            'business_id' => $ownerBusiness->id,
            'user_id' => $user->id,
            'assignment_type' => 'owner',
            'status' => 'invited',
            'is_primary' => true,
            'assigned_by_user_id' => $inviter->id,
            'invited_at' => now(),
        ]);

        UserRole::query()->create([
            'user_id' => $user->id,
            'role_id' => $ownerRole->id,
            'scope_type' => 'business',
            'business_id' => $ownerBusiness->id,
            'assigned_by_user_id' => $inviter->id,
            'assigned_at' => now(),
            'status' => 'active',
        ]);

        $plainToken = 'MIXED-OWNER-SCOPE';

        InvitationActivationToken::query()->create([
            'user_id' => $user->id,
            'email' => $user->email,
            'token_digest' => hash('sha256', $plainToken),
            'expires_at' => now()->addDays(7),
            'created_by_user_id' => $inviter->id,
        ]);

        $this->postWithCsrf('/api/auth/invitation/activate', [
            'email' => $user->email,
            'token' => $plainToken,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertOk();

        $user->refresh();
        $user->forceFill(['email_verified_at' => now()])->save();

        $loginResponse = $this->postWithCsrf('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
            'remember' => false,
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonPath('data.current_business_id', $ownerBusiness->id)
            ->assertJsonPath('data.primary_business.id', $ownerBusiness->id)
            ->assertJsonMissingPath('data.agent_profile.id');

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.current_business_id', $ownerBusiness->id)
            ->assertJsonFragment(['slug' => 'business-owner'])
            ->assertJsonMissing(['slug' => 'agent']);

        $this->getJson('/api/v1/dashboard/business-summary')->assertOk();
    }

    private function createBusiness(string $slug, string $displayName): Business
    {
        return Business::query()->create([
            'slug' => $slug,
            'legal_name' => $displayName.' SARL',
            'display_name' => $displayName,
            'currency_code' => 'EUR',
            'timezone' => 'Europe/Paris',
            'status' => 'approved',
        ]);
    }

    private function postWithCsrf(string $uri, array $payload)
    {
        $csrfToken = 'test-csrf-token';

        return $this
            ->withSession(['_token' => $csrfToken])
            ->withHeader('X-CSRF-TOKEN', $csrfToken)
            ->postJson($uri, $payload);
    }
}
