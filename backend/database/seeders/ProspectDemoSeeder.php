<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\Program;
use App\Models\Prospect;
use App\Models\ProspectStatusHistory;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProspectDemoSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $owner = User::query()->where('email', 'owner@havetdigital.test')->firstOrFail();
        $agents = Agent::query()
            ->with('user')
            ->orderBy('agent_code')
            ->get()
            ->keyBy('agent_code');
        $programs = Program::query()
            ->with('business')
            ->get()
            ->keyBy('slug');
        $currentMonth = now()->copy()->startOfMonth();
        $previousMonth = $currentMonth->copy()->subMonthNoOverflow()->startOfMonth();

        $seeds = [
            [
                'agent_code' => 'AGT-001',
                'program_slug' => 'site-vitrine',
                'contact_name' => 'Hotel Rivage',
                'contact_email' => 'contact@hotel-rivage.test',
                'contact_phone_raw' => '06 31 22 11 00',
                'company_name' => 'Hotel Rivage',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_froid',
                'progression_status' => 'prospect_froid',
                'submitted_at' => $previousMonth->copy()->addDays(5),
                'first_synced_at' => $previousMonth->copy()->addDays(6),
                'last_synced_at' => $previousMonth->copy()->addDays(18),
                'pipeline_stage_changed_at' => $previousMonth->copy()->addDays(14),
                'iacrm_prospect_id' => 'iacrm-pro-101',
                'iacrm_status_code' => 'cold',
                'iacrm_status_label' => 'Prospect Froid',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(5)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $previousMonth->copy()->addDays(6)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_froid', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $previousMonth->copy()->addDays(14)],
                ],
            ],
            [
                'agent_code' => 'AGT-001',
                'program_slug' => 'saas-automation',
                'contact_name' => 'Bistro Horizon',
                'contact_email' => 'direction@bistro-horizon.test',
                'contact_phone_raw' => '06 41 52 63 74',
                'company_name' => 'Bistro Horizon',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_tiede',
                'progression_status' => 'prospect_tiede',
                'submitted_at' => $previousMonth->copy()->addDays(8),
                'first_synced_at' => $previousMonth->copy()->addDays(9),
                'last_synced_at' => $previousMonth->copy()->addDays(20),
                'pipeline_stage_changed_at' => $previousMonth->copy()->addDays(17),
                'iacrm_prospect_id' => 'iacrm-pro-102',
                'iacrm_status_code' => 'warm',
                'iacrm_status_label' => 'Prospect Tiede',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(8)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $previousMonth->copy()->addDays(9)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_tiede', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $previousMonth->copy()->addDays(17)],
                ],
            ],
            [
                'agent_code' => 'AGT-002',
                'program_slug' => 'print-branding',
                'contact_name' => 'Maison Velours',
                'contact_email' => 'hello@maison-velours.test',
                'contact_phone_raw' => '06 71 82 93 04',
                'company_name' => 'Maison Velours',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_froid',
                'progression_status' => 'prospect_froid',
                'submitted_at' => $previousMonth->copy()->addDays(10),
                'first_synced_at' => $previousMonth->copy()->addDays(11),
                'last_synced_at' => $previousMonth->copy()->addDays(22),
                'pipeline_stage_changed_at' => $previousMonth->copy()->addDays(18),
                'iacrm_prospect_id' => 'iacrm-pro-103',
                'iacrm_status_code' => 'cold',
                'iacrm_status_label' => 'Prospect Froid',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(10)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $previousMonth->copy()->addDays(11)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_froid', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $previousMonth->copy()->addDays(18)],
                ],
            ],
            [
                'agent_code' => 'AGT-003',
                'program_slug' => 'saas-automation',
                'contact_name' => 'Clinique Azure',
                'contact_email' => 'direction@clinique-azure.test',
                'contact_phone_raw' => '06 60 50 40 30',
                'company_name' => 'Clinique Azure',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_chaud',
                'progression_status' => 'prospect_chaud',
                'submitted_at' => $previousMonth->copy()->addDays(12),
                'first_synced_at' => $previousMonth->copy()->addDays(13),
                'last_synced_at' => $previousMonth->copy()->addDays(25),
                'pipeline_stage_changed_at' => $previousMonth->copy()->addDays(19),
                'iacrm_prospect_id' => 'iacrm-pro-104',
                'iacrm_status_code' => 'hot',
                'iacrm_status_label' => 'Prospect Chaud',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(12)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $previousMonth->copy()->addDays(13)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_tiede', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $previousMonth->copy()->addDays(17)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'prospect_tiede', 'new_progression_status' => 'prospect_chaud', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $previousMonth->copy()->addDays(19)],
                ],
            ],
            [
                'agent_code' => 'AGT-004',
                'program_slug' => 'site-vitrine',
                'contact_name' => 'Cabinet Solis',
                'contact_email' => 'contact@cabinet-solis.test',
                'contact_phone_raw' => '06 91 80 70 60',
                'company_name' => 'Cabinet Solis',
                'submission_status' => 'synced',
                'pipeline_stage' => 'suspect',
                'progression_status' => 'suspect',
                'submitted_at' => $previousMonth->copy()->addDays(14),
                'first_synced_at' => $previousMonth->copy()->addDays(15),
                'last_synced_at' => $previousMonth->copy()->addDays(24),
                'iacrm_prospect_id' => 'iacrm-pro-105',
                'iacrm_status_code' => 'suspect',
                'iacrm_status_label' => 'Suspect',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(14)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $previousMonth->copy()->addDays(15)],
                ],
            ],
            [
                'agent_code' => 'AGT-002',
                'program_slug' => 'site-vitrine',
                'contact_name' => 'Atelier Miro',
                'contact_email' => 'bonjour@atelier-miro.test',
                'contact_phone_raw' => '06 10 20 30 40',
                'company_name' => 'Atelier Miro',
                'submission_status' => 'synced',
                'pipeline_stage' => 'suspect',
                'progression_status' => 'suspect',
                'submitted_at' => $previousMonth->copy()->addDays(16),
                'first_synced_at' => $previousMonth->copy()->addDays(17),
                'last_synced_at' => $previousMonth->copy()->addDays(24),
                'iacrm_prospect_id' => 'iacrm-pro-106',
                'iacrm_status_code' => 'suspect',
                'iacrm_status_label' => 'Suspect',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(16)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $previousMonth->copy()->addDays(17)],
                ],
            ],
            [
                'agent_code' => 'AGT-003',
                'program_slug' => 'saas-automation',
                'contact_name' => 'Groupe Atlas',
                'contact_email' => 'contact@groupe-atlas.test',
                'contact_phone_raw' => '06 58 69 70 81',
                'company_name' => 'Groupe Atlas',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_froid',
                'progression_status' => 'prospect_froid',
                'submitted_at' => $previousMonth->copy()->addDays(18),
                'first_synced_at' => $previousMonth->copy()->addDays(19),
                'last_synced_at' => $previousMonth->copy()->addDays(25),
                'pipeline_stage_changed_at' => $previousMonth->copy()->addDays(22),
                'iacrm_prospect_id' => 'iacrm-pro-107',
                'iacrm_status_code' => 'cold',
                'iacrm_status_label' => 'Prospect Froid',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(18)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $previousMonth->copy()->addDays(19)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_froid', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $previousMonth->copy()->addDays(22)],
                ],
            ],
            [
                'agent_code' => 'AGT-004',
                'program_slug' => 'print-branding',
                'contact_name' => 'Studio Verre',
                'contact_email' => 'hello@studio-verre.test',
                'contact_phone_raw' => '06 55 66 77 88',
                'company_name' => 'Studio Verre',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_tiede',
                'progression_status' => 'prospect_tiede',
                'submitted_at' => $previousMonth->copy()->addDays(20),
                'first_synced_at' => $previousMonth->copy()->addDays(21),
                'last_synced_at' => $previousMonth->copy()->addDays(26),
                'pipeline_stage_changed_at' => $previousMonth->copy()->addDays(24),
                'iacrm_prospect_id' => 'iacrm-pro-108',
                'iacrm_status_code' => 'warm',
                'iacrm_status_label' => 'Prospect Tiede',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(20)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $previousMonth->copy()->addDays(21)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_tiede', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $previousMonth->copy()->addDays(24)],
                ],
            ],
            [
                'agent_code' => 'AGT-001',
                'program_slug' => 'site-vitrine',
                'contact_name' => 'Nova Habitat',
                'contact_email' => 'contact@nova-habitat.test',
                'contact_phone_raw' => '06 12 13 14 15',
                'company_name' => 'Nova Habitat',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_froid',
                'progression_status' => 'prospect_froid',
                'submitted_at' => $previousMonth->copy()->addDays(22),
                'first_synced_at' => $previousMonth->copy()->addDays(23),
                'last_synced_at' => $previousMonth->copy()->addDays(27),
                'pipeline_stage_changed_at' => $previousMonth->copy()->addDays(26),
                'iacrm_prospect_id' => 'iacrm-pro-109',
                'iacrm_status_code' => 'cold',
                'iacrm_status_label' => 'Prospect Froid',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(22)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $previousMonth->copy()->addDays(23)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_froid', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $previousMonth->copy()->addDays(26)],
                ],
            ],
            [
                'agent_code' => 'AGT-002',
                'program_slug' => 'site-vitrine',
                'contact_name' => 'Maison Corail',
                'contact_email' => 'bonjour@maison-corail.test',
                'contact_phone_raw' => '06 44 55 66 77',
                'company_name' => 'Maison Corail',
                'submission_status' => 'pending_sync',
                'pipeline_stage' => 'suspect',
                'progression_status' => 'suspect',
                'submitted_at' => $previousMonth->copy()->addDays(25),
                'iacrm_prospect_id' => 'iacrm-pro-110',
                'iacrm_status_code' => 'suspect',
                'iacrm_status_label' => 'Suspect',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $previousMonth->copy()->addDays(25)],
                ],
            ],
            [
                'agent_code' => 'AGT-005',
                'program_slug' => 'site-vitrine',
                'contact_name' => 'Boulangerie Amande',
                'contact_email' => 'gerance@boulangerie-amande.test',
                'contact_phone_raw' => '07 11 22 33 44',
                'company_name' => 'Boulangerie Amande',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_chaud',
                'progression_status' => 'prospect_chaud',
                'submitted_at' => $currentMonth->copy()->addHour(),
                'first_synced_at' => $currentMonth->copy()->addHour(),
                'last_synced_at' => $currentMonth->copy()->addHours(3),
                'pipeline_stage_changed_at' => $currentMonth->copy()->addHours(4),
                'iacrm_prospect_id' => 'iacrm-pro-201',
                'iacrm_status_code' => 'hot',
                'iacrm_status_label' => 'Prospect Chaud',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $currentMonth->copy()->addHour()],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $currentMonth->copy()->addHour()],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_tiede', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $currentMonth->copy()->addHours(3)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'prospect_tiede', 'new_progression_status' => 'prospect_chaud', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $currentMonth->copy()->addHours(4)],
                ],
            ],
            [
                'agent_code' => 'AGT-006',
                'program_slug' => 'print-branding',
                'contact_name' => 'Cabinet Altis',
                'contact_email' => 'direction@cabinet-altis.test',
                'contact_phone_raw' => '06 88 77 66 55',
                'company_name' => 'Cabinet Altis',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_tiede',
                'progression_status' => 'prospect_tiede',
                'submitted_at' => $currentMonth->copy()->addHours(2),
                'first_synced_at' => $currentMonth->copy()->addHours(2),
                'last_synced_at' => $currentMonth->copy()->addHours(4),
                'pipeline_stage_changed_at' => $currentMonth->copy()->addHours(5),
                'iacrm_prospect_id' => 'iacrm-pro-202',
                'iacrm_status_code' => 'warm',
                'iacrm_status_label' => 'Prospect Tiede',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $currentMonth->copy()->addHours(2)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_tiede', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $currentMonth->copy()->addHours(2)],
                ],
            ],
            [
                'agent_code' => 'AGT-001',
                'program_slug' => 'saas-automation',
                'contact_name' => 'Nova Conseil',
                'contact_email' => 'contact@nova-conseil.test',
                'contact_phone_raw' => '06 98 76 54 32',
                'company_name' => 'Nova Conseil',
                'submission_status' => 'synced',
                'pipeline_stage' => 'prospect_froid',
                'progression_status' => 'prospect_froid',
                'submitted_at' => $currentMonth->copy()->addHours(6),
                'first_synced_at' => $currentMonth->copy()->addHours(6),
                'last_synced_at' => $currentMonth->copy()->addHours(8),
                'pipeline_stage_changed_at' => $currentMonth->copy()->addHours(10),
                'iacrm_prospect_id' => 'iacrm-pro-203',
                'iacrm_status_code' => 'cold',
                'iacrm_status_label' => 'Prospect Froid',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $currentMonth->copy()->addHours(6)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'suspect', 'reason' => 'Prospect synchronized to IACRM.', 'created_at' => $currentMonth->copy()->addHours(6)],
                    ['source' => 'iacrm', 'old_submission_status' => 'synced', 'new_submission_status' => 'synced', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_froid', 'reason' => 'Pipeline stage synchronized from IACRM.', 'created_at' => $currentMonth->copy()->addHours(10)],
                ],
            ],
            [
                'agent_code' => 'AGT-002',
                'program_slug' => 'site-vitrine',
                'contact_name' => 'Restaurant Nacre',
                'contact_email' => 'bonjour@restaurant-nacre.test',
                'contact_phone_raw' => '07 22 44 66 88',
                'company_name' => 'Restaurant Nacre',
                'submission_status' => 'pending_sync',
                'pipeline_stage' => 'suspect',
                'progression_status' => 'suspect',
                'submitted_at' => $currentMonth->copy()->addHours(8),
                'iacrm_prospect_id' => 'iacrm-pro-204',
                'iacrm_status_code' => 'suspect',
                'iacrm_status_label' => 'Suspect',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $currentMonth->copy()->addHours(8)],
                ],
            ],
            [
                'agent_code' => 'AGT-003',
                'program_slug' => 'saas-automation',
                'contact_name' => 'Maison Orme',
                'contact_email' => 'contact@maison-orme.test',
                'contact_phone_raw' => '06 31 41 51 61',
                'company_name' => 'Maison Orme',
                'submission_status' => 'sync_failed',
                'pipeline_stage' => 'prospect_tiede',
                'progression_status' => 'prospect_tiede',
                'submitted_at' => $currentMonth->copy()->addHours(9),
                'sync_error_message' => 'IACRM credentials placeholder rejected the latest retry.',
                'pipeline_stage_changed_at' => $currentMonth->copy()->addHours(11),
                'iacrm_prospect_id' => 'iacrm-pro-205',
                'iacrm_status_code' => 'warm',
                'iacrm_status_label' => 'Prospect Tiede',
                'history' => [
                    ['source' => 'hd_parrainage', 'new_submission_status' => 'pending_sync', 'new_progression_status' => 'suspect', 'reason' => 'Prospect submitted locally by agent.', 'created_at' => $currentMonth->copy()->addHours(9)],
                    ['source' => 'iacrm', 'old_submission_status' => 'pending_sync', 'new_submission_status' => 'sync_failed', 'old_progression_status' => 'suspect', 'new_progression_status' => 'prospect_tiede', 'reason' => 'Prospect sync failed after the upstream push attempt.', 'created_at' => $currentMonth->copy()->addHours(11)],
                ],
            ],
        ];

        foreach ($seeds as $seed) {
            $agent = $agents[$seed['agent_code']];
            $program = $programs[$seed['program_slug']];
            $submittedByUser = $agent->user;

            $prospect = Prospect::query()->withTrashed()->updateOrCreate(
                [
                    'program_id' => $program->id,
                    'contact_email' => $seed['contact_email'],
                ],
                [
                    'business_id' => $program->business_id,
                    'agent_id' => $agent->id,
                    'submitted_by_user_id' => $submittedByUser->id,
                    'contact_name' => $seed['contact_name'],
                    'contact_phone_raw' => $seed['contact_phone_raw'],
                    'contact_phone_e164' => $this->normalizePhone($seed['contact_phone_raw']),
                    'company_name' => $seed['company_name'],
                    'submission_status' => $seed['submission_status'],
                    'pipeline_stage' => $seed['pipeline_stage'],
                    'progression_status' => $seed['progression_status'],
                    'conversion_status' => 'open',
                    'iacrm_prospect_id' => $seed['iacrm_prospect_id'] ?? null,
                    'iacrm_status_code' => $seed['iacrm_status_code'] ?? null,
                    'iacrm_status_label' => $seed['iacrm_status_label'] ?? null,
                    'last_synced_at' => $seed['last_synced_at'] ?? null,
                    'sync_error_message' => $seed['sync_error_message'] ?? null,
                    'source' => 'hd_parrainage',
                    'submitted_at' => $seed['submitted_at'],
                    'first_synced_at' => $seed['first_synced_at'] ?? null,
                    'pipeline_stage_changed_at' => $seed['pipeline_stage_changed_at'] ?? $seed['submitted_at'],
                    'soft_deleted_by_user_id' => ($seed['submission_status'] ?? null) === 'deleted' ? $submittedByUser->id : null,
                    'soft_delete_reason' => $seed['soft_delete_reason'] ?? null,
                    'raw_iacrm_payload' => [],
                    'deleted_at' => $seed['deleted_at'] ?? null,
                ],
            );

            ProspectStatusHistory::query()->where('prospect_id', $prospect->id)->delete();

            foreach ($seed['history'] as $historySeed) {
                ProspectStatusHistory::query()->create([
                    'prospect_id' => $prospect->id,
                    'source_system' => $historySeed['source'],
                    'old_submission_status' => $historySeed['old_submission_status'] ?? null,
                    'new_submission_status' => $historySeed['new_submission_status'] ?? null,
                    'old_progression_status' => $historySeed['old_progression_status'] ?? null,
                    'new_progression_status' => $historySeed['new_progression_status'] ?? null,
                    'reason' => $historySeed['reason'],
                    'payload_snapshot' => [],
                    'changed_by_user_id' => $historySeed['source'] === 'user' ? $submittedByUser->id : ($historySeed['source'] === 'hd_parrainage' ? $submittedByUser->id : $owner->id),
                    'created_at' => $historySeed['created_at'],
                    'updated_at' => $historySeed['created_at'],
                ]);
            }
        }
    }

    private function normalizePhone(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '0')) {
            return '+33'.ltrim($digits, '0');
        }

        return "+{$digits}";
    }
}
