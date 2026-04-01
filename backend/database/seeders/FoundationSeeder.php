<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\AppNotification;
use App\Models\Business;
use App\Models\BusinessUserAssignment;
use App\Models\InvitationActivationToken;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SyncJob;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FoundationSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $permissionModels = collect(config('rbac.permissions'))
                ->mapWithKeys(function (string $description, string $permissionId): array {
                    $permission = Permission::query()->updateOrCreate(
                        ['permission_id' => $permissionId],
                        [
                            'resource' => Str::before($permissionId, '.'),
                            'action' => Str::after($permissionId, '.'),
                            'description' => $description,
                            'is_system' => true,
                        ],
                    );

                    return [$permissionId => $permission];
                });

            $roleModels = collect(config('rbac.roles'))
                ->mapWithKeys(function (array $roleDefinition, string $slug): array {
                    $role = Role::query()->updateOrCreate(
                        ['slug' => $slug],
                        [
                            'name' => $roleDefinition['name'],
                            'description' => $roleDefinition['description'],
                            'is_system' => true,
                            'status' => 'active',
                        ],
                    );

                    return [$slug => $role];
                });

            foreach (config('rbac.role_permissions') as $roleSlug => $permissionIds) {
                $role = $roleModels->get($roleSlug);

                if (! $role instanceof Role) {
                    continue;
                }

                $role->permissions()->sync(
                    collect($permissionIds)
                        ->map(fn (string $permissionId) => $permissionModels->get($permissionId)?->id)
                        ->filter()
                        ->values()
                        ->all(),
                );
            }

            $superAdmin = User::query()->updateOrCreate(
                ['email' => 'superadmin@hd-parrainage.test'],
                [
                    'display_name' => 'HD Parrainage Super Admin',
                    'password_hash' => 'Password123!',
                    'status' => 'active',
                    'invited_at' => now(),
                    'activated_at' => now(),
                    'email_verified_at' => now(),
                    'last_activity_at' => now(),
                    'last_login_at' => now(),
                ],
            );

            $businessOwner = User::query()->updateOrCreate(
                ['email' => 'owner@havetdigital.test'],
                [
                    'display_name' => 'HAVET Digital Owner',
                    'password_hash' => 'Password123!',
                    'status' => 'active',
                    'invited_at' => now(),
                    'activated_at' => now(),
                    'email_verified_at' => now(),
                    'last_activity_at' => now(),
                    'created_by_user_id' => $superAdmin->id,
                ],
            );

            $pendingOwner = User::query()->updateOrCreate(
                ['email' => 'owner@digitalagencypro.test'],
                [
                    'display_name' => 'Digital Agency Pro Owner',
                    'password_hash' => 'Password123!',
                    'status' => 'active',
                    'invited_at' => now()->subDays(7),
                    'activated_at' => now()->subDays(7),
                    'email_verified_at' => now()->subDays(7),
                    'last_activity_at' => now()->subDays(2),
                    'created_by_user_id' => $superAdmin->id,
                ],
            );

            $rejectedOwner = User::query()->updateOrCreate(
                ['email' => 'owner@consulting-expert.test'],
                [
                    'display_name' => 'Consulting Expert Owner',
                    'password_hash' => 'Password123!',
                    'status' => 'active',
                    'invited_at' => now()->subDays(14),
                    'activated_at' => now()->subDays(13),
                    'email_verified_at' => now()->subDays(13),
                    'last_activity_at' => now()->subDays(9),
                    'created_by_user_id' => $superAdmin->id,
                ],
            );

            $agentUser = User::query()->updateOrCreate(
                ['email' => 'agent@havetdigital.test'],
                [
                    'display_name' => 'HAVET Digital Agent',
                    'password_hash' => 'Password123!',
                    'status' => 'active',
                    'invited_at' => now(),
                    'activated_at' => now(),
                    'email_verified_at' => now(),
                    'last_activity_at' => now(),
                    'created_by_user_id' => $businessOwner->id,
                ],
            );

            $invitedAgentUser = User::query()->updateOrCreate(
                ['email' => 'invitee.agent@havetdigital.test'],
                [
                    'display_name' => 'Invited HAVET Agent',
                    'password_hash' => 'TempPass123!',
                    'status' => 'invited',
                    'invited_at' => now(),
                    'activated_at' => null,
                    'email_verified_at' => null,
                    'last_activity_at' => null,
                    'created_by_user_id' => $businessOwner->id,
                ],
            );

            $business = Business::query()->updateOrCreate(
                ['slug' => 'havetdigital'],
                [
                    'legal_name' => 'HAVET Digital SARL',
                    'display_name' => 'HAVET Digital',
                    'industry' => 'Digital services',
                    'website_url' => 'https://havetdigital.com',
                    'contact_email' => 'contact@havetdigital.test',
                    'contact_phone' => '+33 1 00 00 00 00',
                    'country_code' => 'FR',
                    'currency_code' => 'EUR',
                    'timezone' => 'Europe/Paris',
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approved_by_user_id' => $superAdmin->id,
                ],
            );

            $pendingBusiness = Business::query()->updateOrCreate(
                ['slug' => 'digitalagencypro'],
                [
                    'legal_name' => 'Digital Agency Pro SAS',
                    'display_name' => 'Digital Agency Pro',
                    'industry' => 'Marketing Digital',
                    'website_url' => 'https://digitalagencypro.fr',
                    'contact_email' => 'contact@digitalagencypro.test',
                    'contact_phone' => '+33 1 22 33 44 55',
                    'country_code' => 'FR',
                    'currency_code' => 'EUR',
                    'timezone' => 'Europe/Paris',
                    'status' => 'pending',
                    'approved_at' => null,
                    'approved_by_user_id' => null,
                    'rejected_at' => null,
                    'rejected_by_user_id' => null,
                ],
            );

            $rejectedBusiness = Business::query()->updateOrCreate(
                ['slug' => 'consultingexpert'],
                [
                    'legal_name' => 'Consulting Expert SARL',
                    'display_name' => 'Consulting Expert',
                    'industry' => 'Conseil',
                    'website_url' => 'https://consulting-expert.fr',
                    'contact_email' => 'contact@consulting-expert.test',
                    'contact_phone' => '+33 1 55 44 33 22',
                    'country_code' => 'FR',
                    'currency_code' => 'EUR',
                    'timezone' => 'Europe/Paris',
                    'status' => 'rejected',
                    'approved_at' => null,
                    'approved_by_user_id' => null,
                    'rejected_at' => now()->subDays(6),
                    'rejected_by_user_id' => $superAdmin->id,
                ],
            );

            BusinessUserAssignment::query()->updateOrCreate(
                [
                    'business_id' => $business->id,
                    'user_id' => $businessOwner->id,
                    'assignment_type' => 'owner',
                ],
                [
                    'status' => 'active',
                    'is_primary' => true,
                    'assigned_by_user_id' => $superAdmin->id,
                    'invited_at' => now(),
                    'activated_at' => now(),
                    'starts_at' => now(),
                ],
            );

            BusinessUserAssignment::query()->updateOrCreate(
                [
                    'business_id' => $pendingBusiness->id,
                    'user_id' => $pendingOwner->id,
                    'assignment_type' => 'owner',
                ],
                [
                    'status' => 'active',
                    'is_primary' => true,
                    'assigned_by_user_id' => $superAdmin->id,
                    'invited_at' => now()->subDays(7),
                    'activated_at' => now()->subDays(7),
                    'starts_at' => now()->subDays(7),
                ],
            );

            BusinessUserAssignment::query()->updateOrCreate(
                [
                    'business_id' => $rejectedBusiness->id,
                    'user_id' => $rejectedOwner->id,
                    'assignment_type' => 'owner',
                ],
                [
                    'status' => 'active',
                    'is_primary' => true,
                    'assigned_by_user_id' => $superAdmin->id,
                    'invited_at' => now()->subDays(14),
                    'activated_at' => now()->subDays(13),
                    'starts_at' => now()->subDays(13),
                ],
            );

            Agent::query()->updateOrCreate(
                [
                    'business_id' => $business->id,
                    'user_id' => $agentUser->id,
                ],
                [
                    'agent_code' => 'AGT-001',
                    'status' => 'active',
                    'invited_by_user_id' => $businessOwner->id,
                    'invited_at' => now(),
                    'activated_at' => now(),
                    'last_activity_at' => now(),
                    'notes' => 'Seeded local-development agent profile.',
                ],
            );

            Agent::query()->updateOrCreate(
                [
                    'business_id' => $business->id,
                    'user_id' => $invitedAgentUser->id,
                ],
                [
                    'agent_code' => 'AGT-INV-001',
                    'status' => 'invited',
                    'invited_by_user_id' => $businessOwner->id,
                    'invited_at' => now(),
                    'activated_at' => null,
                    'last_activity_at' => null,
                    'notes' => 'Seeded invited agent profile for activation-flow testing.',
                ],
            );

            UserRole::query()->updateOrCreate(
                [
                    'user_id' => $superAdmin->id,
                    'role_id' => $roleModels['super-admin']->id,
                    'scope_type' => 'global',
                    'business_id' => null,
                ],
                [
                    'assigned_by_user_id' => $superAdmin->id,
                    'assigned_at' => now(),
                    'status' => 'active',
                ],
            );

            UserRole::query()->updateOrCreate(
                [
                    'user_id' => $businessOwner->id,
                    'role_id' => $roleModels['business-owner']->id,
                    'scope_type' => 'business',
                    'business_id' => $business->id,
                ],
                [
                    'assigned_by_user_id' => $superAdmin->id,
                    'assigned_at' => now(),
                    'status' => 'active',
                ],
            );

            UserRole::query()->updateOrCreate(
                [
                    'user_id' => $agentUser->id,
                    'role_id' => $roleModels['agent']->id,
                    'scope_type' => 'business',
                    'business_id' => $business->id,
                ],
                [
                    'assigned_by_user_id' => $businessOwner->id,
                    'assigned_at' => now(),
                    'status' => 'active',
                ],
            );

            UserRole::query()->updateOrCreate(
                [
                    'user_id' => $invitedAgentUser->id,
                    'role_id' => $roleModels['agent']->id,
                    'scope_type' => 'business',
                    'business_id' => $business->id,
                ],
                [
                    'assigned_by_user_id' => $businessOwner->id,
                    'assigned_at' => now(),
                    'status' => 'active',
                ],
            );

            InvitationActivationToken::query()
                ->where('user_id', $invitedAgentUser->id)
                ->delete();

            InvitationActivationToken::query()->create([
                'user_id' => $invitedAgentUser->id,
                'email' => $invitedAgentUser->email,
                'token_digest' => hash('sha256', 'INVITE-AGENT-2026'),
                'expires_at' => now()->addDays(14),
                'used_at' => null,
                'created_by_user_id' => $businessOwner->id,
            ]);

            AppNotification::query()->whereIn('recipient_user_id', [
                $superAdmin->id,
                $businessOwner->id,
                $agentUser->id,
            ])->delete();

            AppNotification::query()->create([
                'recipient_user_id' => $superAdmin->id,
                'business_id' => null,
                'notification_type' => 'platform',
                'title' => 'Foundation ready',
                'message' => 'Core platform roles and business baseline have been seeded successfully.',
                'severity' => 'info',
                'metadata' => ['source' => 'foundation-seeder'],
                'read_at' => null,
            ]);

            AppNotification::query()->create([
                'recipient_user_id' => $businessOwner->id,
                'business_id' => $business->id,
                'notification_type' => 'business',
                'title' => 'Business workspace active',
                'message' => 'Your business workspace is active and ready for operations.',
                'severity' => 'success',
                'metadata' => ['business_slug' => $business->slug],
                'read_at' => null,
            ]);

            AppNotification::query()->create([
                'recipient_user_id' => $agentUser->id,
                'business_id' => $business->id,
                'notification_type' => 'agent',
                'title' => 'Agent profile linked',
                'message' => 'Your agent profile is active and assigned to your business scope.',
                'severity' => 'info',
                'metadata' => ['agent_code' => 'AGT-001'],
                'read_at' => null,
            ]);

            SyncJob::query()->whereIn('business_id', [
                $business->id,
                $pendingBusiness->id,
            ])->delete();

            SyncJob::query()->create([
                'business_id' => $business->id,
                'initiated_by_user_id' => $businessOwner->id,
                'job_type' => 'iacrm.prospect.create',
                'entity_type' => 'prospect',
                'entity_id' => null,
                'queue_name' => 'sync-high',
                'status' => 'queued',
                'attempt_count' => 0,
                'max_attempts' => 5,
                'idempotency_key' => 'seed:iacrm.prospect.create:queued',
                'payload' => [
                    'business_slug' => $business->slug,
                    'notes' => 'Represents a locally submitted prospect waiting for the first outbound sync.',
                ],
                'response_payload' => [],
                'queued_at' => now()->subMinutes(18),
            ]);

            SyncJob::query()->create([
                'business_id' => $business->id,
                'initiated_by_user_id' => $businessOwner->id,
                'job_type' => 'iacrm.transaction.pull',
                'entity_type' => 'transaction',
                'entity_id' => null,
                'queue_name' => 'sync-normal',
                'status' => 'succeeded',
                'attempt_count' => 1,
                'max_attempts' => 4,
                'idempotency_key' => 'seed:iacrm.transaction.pull:succeeded',
                'payload' => [
                    'business_slug' => $business->slug,
                    'window' => 'recent',
                ],
                'response_payload' => [
                    'imported_transactions' => 2,
                    'source' => 'seeded-demo',
                ],
                'queued_at' => now()->subHours(6),
                'started_at' => now()->subHours(6)->addMinute(),
                'finished_at' => now()->subHours(6)->addMinutes(3),
            ]);

            SyncJob::query()->create([
                'business_id' => $business->id,
                'initiated_by_user_id' => $businessOwner->id,
                'job_type' => 'iacrm.prospect.pull',
                'entity_type' => 'prospect',
                'entity_id' => null,
                'queue_name' => 'sync-normal',
                'status' => 'failed',
                'attempt_count' => 3,
                'max_attempts' => 4,
                'idempotency_key' => 'seed:iacrm.prospect.pull:failed',
                'failure_code' => 'upstream_timeout',
                'failure_message' => 'The upstream CRM timed out during the latest incremental prospect pull.',
                'payload' => [
                    'business_slug' => $business->slug,
                    'window' => 'incremental',
                ],
                'response_payload' => [
                    'http_status' => 504,
                ],
                'queued_at' => now()->subMinutes(50),
                'started_at' => now()->subMinutes(49),
                'failed_at' => now()->subMinutes(47),
                'next_retry_at' => now()->addMinutes(15),
            ]);

            SyncJob::query()->create([
                'business_id' => $pendingBusiness->id,
                'initiated_by_user_id' => $superAdmin->id,
                'job_type' => 'iacrm.reconcile.business',
                'entity_type' => 'business',
                'entity_id' => $pendingBusiness->id,
                'queue_name' => 'reconciliation',
                'status' => 'dead_lettered',
                'attempt_count' => 3,
                'max_attempts' => 3,
                'idempotency_key' => 'seed:iacrm.reconcile.business:dead-lettered',
                'failure_code' => 'provider_validation_error',
                'failure_message' => 'The pending business cannot be reconciled until the upstream contract exposes a valid company reference.',
                'payload' => [
                    'business_slug' => $pendingBusiness->slug,
                    'reason' => 'seeded dead-letter example',
                ],
                'response_payload' => [
                    'provider_message' => 'Unknown external business identifier.',
                ],
                'queued_at' => now()->subDays(1),
                'started_at' => now()->subDays(1)->addMinutes(5),
                'failed_at' => now()->subDays(1)->addMinutes(8),
                'dead_lettered_at' => now()->subDays(1)->addMinutes(8),
            ]);
        });
    }
}
