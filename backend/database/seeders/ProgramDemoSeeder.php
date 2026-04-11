<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\Business;
use App\Models\BusinessUserAssignment;
use App\Models\ExchangePack;
use App\Models\ExchangePackItem;
use App\Models\Program;
use App\Models\ProgramAgentAssignment;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;

class ProgramDemoSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $business = Business::query()->where('slug', 'havetdigital')->firstOrFail();
        $owner = User::query()->where('email', 'owner@havetdigital.test')->firstOrFail();
        $defaultAgentUser = User::query()->where('email', 'agent@havetdigital.test')->firstOrFail();
        $agentRole = Role::query()->where('slug', 'agent')->firstOrFail();
        $currentMonth = now()->copy()->startOfMonth();
        $previousMonth = $currentMonth->copy()->subMonthNoOverflow()->startOfMonth();

        $additionalAgents = [
            [
                'email' => 'agent2@havetdigital.test',
                'display_name' => 'HAVET Digital Agent 2',
                'agent_code' => 'AGT-DEMO-002',
                'invited_at' => $previousMonth->copy()->addDays(1),
                'activated_at' => $previousMonth->copy()->addDays(1),
            ],
            [
                'email' => 'pierre.bernard@havetdigital.test',
                'display_name' => 'Pierre Bernard',
                'agent_code' => 'AGT-002',
                'invited_at' => $previousMonth->copy()->addDays(2),
                'activated_at' => $previousMonth->copy()->addDays(2),
            ],
            [
                'email' => 'nadia.elamrani@havetdigital.test',
                'display_name' => 'Nadia El Amrani',
                'agent_code' => 'AGT-003',
                'invited_at' => $previousMonth->copy()->addDays(5),
                'activated_at' => $previousMonth->copy()->addDays(5),
            ],
            [
                'email' => 'karim.louati@havetdigital.test',
                'display_name' => 'Karim Louati',
                'agent_code' => 'AGT-004',
                'invited_at' => $previousMonth->copy()->addDays(9),
                'activated_at' => $previousMonth->copy()->addDays(9),
            ],
            [
                'email' => 'lea.martin@havetdigital.test',
                'display_name' => 'Lea Martin',
                'agent_code' => 'AGT-005',
                'invited_at' => $currentMonth->copy()->addHours(2),
                'activated_at' => $currentMonth->copy()->addHours(2),
            ],
            [
                'email' => 'sami.benali@havetdigital.test',
                'display_name' => 'Sami Benali',
                'agent_code' => 'AGT-006',
                'invited_at' => $currentMonth->copy()->addHours(5),
                'activated_at' => $currentMonth->copy()->addHours(5),
            ],
        ];

        $agentProfiles = collect();

        $defaultAgentUser->forceFill([
            'display_name' => 'HAVET Digital Agent',
            'password_hash' => 'Password123!',
            'status' => 'active',
            'invited_at' => $previousMonth->copy()->addDay(),
            'activated_at' => $previousMonth->copy()->addDay(),
            'email_verified_at' => $previousMonth->copy()->addDay(),
            'last_activity_at' => $currentMonth->copy()->addDays(3),
            'created_by_user_id' => $owner->id,
        ])->save();

        BusinessUserAssignment::query()->updateOrCreate(
            [
                'business_id' => $business->id,
                'user_id' => $defaultAgentUser->id,
                'assignment_type' => 'agent',
            ],
            [
                'status' => 'active',
                'is_primary' => true,
                'assigned_by_user_id' => $owner->id,
                'invited_at' => $previousMonth->copy()->addDay(),
                'activated_at' => $previousMonth->copy()->addDay(),
                'starts_at' => $previousMonth->copy()->addDay(),
            ],
        );

        UserRole::query()->updateOrCreate(
            [
                'user_id' => $defaultAgentUser->id,
                'role_id' => $agentRole->id,
                'scope_type' => 'business',
                'business_id' => $business->id,
            ],
            [
                'assigned_by_user_id' => $owner->id,
                'assigned_at' => $previousMonth->copy()->addDay(),
                'status' => 'active',
            ],
        );

        $agentProfiles->push(
            Agent::query()->updateOrCreate(
                [
                    'business_id' => $business->id,
                    'user_id' => $defaultAgentUser->id,
                ],
                [
                    'agent_code' => 'AGT-001',
                    'status' => 'active',
                    'invited_by_user_id' => $owner->id,
                    'invited_at' => $previousMonth->copy()->addDay(),
                    'activated_at' => $previousMonth->copy()->addDay(),
                    'last_activity_at' => $currentMonth->copy()->addDays(3),
                    'notes' => 'Seeded March baseline agent profile.',
                ],
            ),
        );

        foreach ($additionalAgents as $seed) {
            $user = User::query()->updateOrCreate(
                ['email' => $seed['email']],
                [
                    'display_name' => $seed['display_name'],
                    'password_hash' => 'Password123!',
                    'status' => 'active',
                    'invited_at' => $seed['invited_at'],
                    'activated_at' => $seed['activated_at'],
                    'email_verified_at' => $seed['activated_at'],
                    'last_activity_at' => $seed['activated_at'],
                    'created_by_user_id' => $owner->id,
                ],
            );

            BusinessUserAssignment::query()->updateOrCreate(
                [
                    'business_id' => $business->id,
                    'user_id' => $user->id,
                    'assignment_type' => 'agent',
                ],
                [
                    'status' => 'active',
                    'is_primary' => true,
                    'assigned_by_user_id' => $owner->id,
                    'invited_at' => $seed['invited_at'],
                    'activated_at' => $seed['activated_at'],
                    'starts_at' => $seed['activated_at'],
                ],
            );

            UserRole::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'role_id' => $agentRole->id,
                    'scope_type' => 'business',
                    'business_id' => $business->id,
                ],
                [
                    'assigned_by_user_id' => $owner->id,
                    'assigned_at' => $seed['activated_at'],
                    'status' => 'active',
                ],
            );

            $agentProfiles->push(
                Agent::query()->updateOrCreate(
                    [
                        'business_id' => $business->id,
                        'user_id' => $user->id,
                    ],
                    [
                        'agent_code' => $seed['agent_code'],
                        'status' => 'active',
                        'invited_by_user_id' => $owner->id,
                        'invited_at' => $seed['invited_at'],
                        'activated_at' => $seed['activated_at'],
                        'last_activity_at' => $seed['activated_at'],
                        'notes' => 'Seeded dashboard baseline agent profile.',
                    ],
                ),
            );
        }

        $packs = collect([
            [
                'name' => 'Starter',
                'description' => 'Introductory rewards for first conversions.',
                'items' => [
                    ['title' => 'Audit SEO express', 'points_cost' => 1000, 'display_order' => 1, 'item_type' => 'service'],
                    ['title' => 'Landing page offerte', 'points_cost' => 2500, 'display_order' => 2, 'item_type' => 'bonus'],
                ],
            ],
            [
                'name' => 'Digital',
                'description' => 'Automation and SaaS implementation rewards.',
                'items' => [
                    ['title' => 'Pack automatisation starter', 'points_cost' => 1500, 'display_order' => 1, 'item_type' => 'service'],
                    ['title' => 'Credit accompagnement SaaS', 'points_cost' => 2250, 'display_order' => 2, 'item_type' => 'credit'],
                ],
            ],
            [
                'name' => 'Premium',
                'description' => 'Branding and strategic premium rewards.',
                'items' => [
                    ['title' => 'Pack cartes de visite premium', 'points_cost' => 500, 'display_order' => 1, 'item_type' => 'print'],
                    ['title' => 'Refonte mini charte visuelle', 'points_cost' => 780, 'display_order' => 2, 'item_type' => 'design'],
                ],
            ],
        ])->mapWithKeys(function (array $seed) use ($business, $owner): array {
            $pack = ExchangePack::query()->updateOrCreate(
                [
                    'business_id' => $business->id,
                    'name' => $seed['name'],
                ],
                [
                    'description' => $seed['description'],
                    'status' => 'active',
                    'created_by_user_id' => $owner->id,
                    'updated_by_user_id' => $owner->id,
                ],
            );

            foreach ($seed['items'] as $itemSeed) {
                ExchangePackItem::query()->updateOrCreate(
                    [
                        'exchange_pack_id' => $pack->id,
                        'title' => $itemSeed['title'],
                    ],
                    [
                        'description' => null,
                        'item_type' => $itemSeed['item_type'],
                        'points_cost' => $itemSeed['points_cost'],
                        'display_order' => $itemSeed['display_order'],
                        'status' => 'active',
                    ],
                );
            }

            return [strtolower($seed['name']) => $pack];
        });

        $programs = collect([
            [
                'slug' => 'site-vitrine',
                'name' => 'Creation de Sites Vitrines',
                'description' => 'Aidez les entreprises a lancer leur presence en ligne avec des sites vitrines modernes, responsives et optimises SEO.',
                'commission_type' => 'per_transaction',
                'exchange_mode' => 'both',
                'points_per_transaction' => 1000,
                'points_per_euro' => 100,
                'exchange_pack_key' => 'starter',
                'eligibility_criteria' => 'Reseau B2B (artisans, TPE, commercants).',
                'status' => 'active',
            ],
            [
                'slug' => 'saas-automation',
                'name' => 'SaaS & Automatisation sur mesure',
                'description' => 'Recommandez notre expertise en outils SaaS et automatisation des processus metiers pour les PME en croissance.',
                'commission_type' => 'per_transaction',
                'exchange_mode' => 'both',
                'points_per_transaction' => 2250,
                'points_per_euro' => 120,
                'exchange_pack_key' => 'digital',
                'eligibility_criteria' => 'Decideurs PME, operations, growth, RevOps ou transformation digitale.',
                'status' => 'active',
            ],
            [
                'slug' => 'print-branding',
                'name' => 'Solutions Print & Identite Visuelle',
                'description' => 'Cartes de visite, plaquettes commerciales, flyers et supports de communication premium.',
                'commission_type' => 'revenue_tier',
                'exchange_mode' => 'both',
                'points_per_transaction' => null,
                'points_per_euro' => 90,
                'exchange_pack_key' => 'premium',
                'eligibility_criteria' => 'Entreprises cherchant a renforcer leur image de marque avec des supports print et design.',
                'status' => 'paused',
            ],
        ])->mapWithKeys(function (array $seed) use ($business, $owner, $packs): array {
            $program = Program::query()->updateOrCreate(
                [
                    'business_id' => $business->id,
                    'slug' => $seed['slug'],
                ],
                [
                    'name' => $seed['name'],
                    'description' => $seed['description'],
                    'commission_type' => $seed['commission_type'],
                    'exchange_mode' => $seed['exchange_mode'],
                    'points_per_transaction' => $seed['points_per_transaction'],
                    'points_per_euro' => $seed['points_per_euro'],
                    'exchange_pack_id' => $packs[$seed['exchange_pack_key']]->id,
                    'eligibility_criteria' => $seed['eligibility_criteria'],
                    'rule_version' => 1,
                    'status' => $seed['status'],
                    'activated_at' => $seed['status'] === 'active' ? now()->subDays(20) : null,
                    'paused_at' => $seed['status'] === 'paused' ? now()->subDays(5) : null,
                    'created_by_user_id' => $owner->id,
                    'updated_by_user_id' => $owner->id,
                ],
            );

            return [$seed['slug'] => $program];
        });

        $assignmentMap = [
            ['program' => 'site-vitrine', 'agent_index' => 0],
            ['program' => 'site-vitrine', 'agent_index' => 1],
            ['program' => 'site-vitrine', 'agent_index' => 2],
            ['program' => 'site-vitrine', 'agent_index' => 5],
            ['program' => 'saas-automation', 'agent_index' => 0],
            ['program' => 'saas-automation', 'agent_index' => 1],
            ['program' => 'saas-automation', 'agent_index' => 3],
            ['program' => 'saas-automation', 'agent_index' => 6],
            ['program' => 'print-branding', 'agent_index' => 2],
            ['program' => 'print-branding', 'agent_index' => 4],
        ];

        foreach ($assignmentMap as $assignmentSeed) {
            ProgramAgentAssignment::query()->updateOrCreate(
                [
                    'program_id' => $programs[$assignmentSeed['program']]->id,
                    'agent_id' => $agentProfiles[$assignmentSeed['agent_index']]->id,
                ],
                [
                    'status' => 'active',
                    'assigned_by_user_id' => $owner->id,
                    'assigned_at' => now()->subDays(10 - $assignmentSeed['agent_index']),
                ],
            );
        }
    }
}
