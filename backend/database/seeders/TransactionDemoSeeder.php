<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\Program;
use App\Models\Prospect;
use App\Models\Transaction;
use Illuminate\Database\Seeder;

class TransactionDemoSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $agents = Agent::query()->orderBy('agent_code')->get()->keyBy('agent_code');
        $programs = Program::query()->get()->keyBy('slug');
        $prospects = Prospect::query()->withTrashed()->get()->keyBy('contact_name');
        $currentMonth = now()->copy()->startOfMonth();
        $previousMonth = $currentMonth->copy()->subMonthNoOverflow()->startOfMonth();

        $seeds = [
            [
                'program_slug' => 'site-vitrine',
                'agent_code' => 'AGT-001',
                'prospect_name' => 'Hotel Rivage',
                'transaction_reference' => 'TX-SV-2026-101',
                'iacrm_transaction_id' => 'iacrm-txn-101',
                'product_name' => 'Refonte site hotelier',
                'amount' => 2600,
                'currency_code' => 'EUR',
                'status' => 'paid',
                'invoice_status' => 'paid',
                'occurred_at' => $previousMonth->copy()->addDays(18),
                'recognized_at' => $previousMonth->copy()->addDays(18),
                'validated_at' => $previousMonth->copy()->addDays(19),
                'paid_at' => $previousMonth->copy()->addDays(20),
                'last_synced_at' => $previousMonth->copy()->addDays(20),
            ],
            [
                'program_slug' => 'saas-automation',
                'agent_code' => 'AGT-001',
                'prospect_name' => 'Bistro Horizon',
                'transaction_reference' => 'TX-SA-2026-101',
                'iacrm_transaction_id' => 'iacrm-txn-102',
                'product_name' => 'Stack automatisation RevOps',
                'amount' => 4200,
                'currency_code' => 'EUR',
                'status' => 'validated',
                'invoice_status' => 'pending',
                'occurred_at' => $previousMonth->copy()->addDays(20),
                'recognized_at' => $previousMonth->copy()->addDays(20),
                'validated_at' => $previousMonth->copy()->addDays(21),
                'last_synced_at' => $previousMonth->copy()->addDays(21),
            ],
            [
                'program_slug' => 'print-branding',
                'agent_code' => 'AGT-002',
                'prospect_name' => 'Maison Velours',
                'transaction_reference' => 'TX-PB-2026-101',
                'iacrm_transaction_id' => 'iacrm-txn-103',
                'product_name' => 'Pack identite premium',
                'amount' => 1800,
                'currency_code' => 'EUR',
                'status' => 'validated',
                'invoice_status' => 'pending',
                'occurred_at' => $previousMonth->copy()->addDays(23),
                'recognized_at' => $previousMonth->copy()->addDays(23),
                'validated_at' => $previousMonth->copy()->addDays(24),
                'last_synced_at' => $previousMonth->copy()->addDays(24),
            ],
            [
                'program_slug' => 'saas-automation',
                'agent_code' => 'AGT-003',
                'prospect_name' => 'Clinique Azure',
                'transaction_reference' => 'TX-SA-2026-102',
                'iacrm_transaction_id' => 'iacrm-txn-104',
                'product_name' => 'Pack CRM clinique',
                'amount' => 3900,
                'currency_code' => 'EUR',
                'status' => 'paid',
                'invoice_status' => 'paid',
                'occurred_at' => $previousMonth->copy()->addDays(26),
                'recognized_at' => $previousMonth->copy()->addDays(26),
                'validated_at' => $previousMonth->copy()->addDays(27),
                'paid_at' => $previousMonth->copy()->addDays(27),
                'last_synced_at' => $previousMonth->copy()->addDays(27),
            ],
            [
                'program_slug' => 'site-vitrine',
                'agent_code' => 'AGT-005',
                'prospect_name' => 'Boulangerie Amande',
                'transaction_reference' => 'TX-SV-2026-001',
                'iacrm_transaction_id' => 'iacrm-txn-201',
                'product_name' => 'Site vitrine premium',
                'amount' => 3200,
                'currency_code' => 'EUR',
                'status' => 'paid',
                'invoice_status' => 'paid',
                'occurred_at' => $currentMonth->copy()->addHours(5),
                'recognized_at' => $currentMonth->copy()->addHours(5),
                'validated_at' => $currentMonth->copy()->addHours(5),
                'paid_at' => $currentMonth->copy()->addHours(6),
                'last_synced_at' => $currentMonth->copy()->addHours(6),
            ],
            [
                'program_slug' => 'print-branding',
                'agent_code' => 'AGT-006',
                'prospect_name' => 'Cabinet Altis',
                'transaction_reference' => 'TX-PB-2026-001',
                'iacrm_transaction_id' => 'iacrm-txn-202',
                'product_name' => 'Identite visuelle executive',
                'amount' => 2444.44,
                'currency_code' => 'EUR',
                'status' => 'validated',
                'invoice_status' => 'pending',
                'occurred_at' => $currentMonth->copy()->addHours(9),
                'recognized_at' => $currentMonth->copy()->addHours(9),
                'validated_at' => $currentMonth->copy()->addHours(10),
                'last_synced_at' => $currentMonth->copy()->addHours(10),
            ],
            [
                'program_slug' => 'saas-automation',
                'agent_code' => 'AGT-001',
                'prospect_name' => 'Nova Conseil',
                'transaction_reference' => 'TX-SA-2026-003',
                'iacrm_transaction_id' => 'iacrm-txn-203',
                'product_name' => 'Diagnostic automatisation CRM',
                'amount' => 1800,
                'currency_code' => 'EUR',
                'status' => 'pending',
                'invoice_status' => 'pending',
                'occurred_at' => $currentMonth->copy()->addHours(12),
                'recognized_at' => $currentMonth->copy()->addHours(12),
                'last_synced_at' => $currentMonth->copy()->addHours(12),
            ],
        ];

        foreach ($seeds as $seed) {
            $agent = $agents[$seed['agent_code']] ?? null;
            $program = $programs[$seed['program_slug']] ?? null;
            $prospect = $prospects[$seed['prospect_name']] ?? null;

            if ($agent === null || $program === null) {
                continue;
            }

            $pointsAwarded = $this->resolvePointsAwarded(
                amount: (float) $seed['amount'],
                status: $seed['status'],
                commissionType: (string) $program->commission_type,
                pointsPerTransaction: $program->points_per_transaction,
                pointsPerEuro: $program->points_per_euro,
            );

            Transaction::query()->updateOrCreate(
                ['transaction_reference' => $seed['transaction_reference']],
                [
                    'business_id' => $program->business_id,
                    'program_id' => $program->id,
                    'agent_id' => $agent->id,
                    'prospect_id' => $prospect?->id,
                    'iacrm_transaction_id' => $seed['iacrm_transaction_id'],
                    'product_name' => $seed['product_name'],
                    'amount' => $seed['amount'],
                    'currency_code' => $seed['currency_code'],
                    'status' => $seed['status'],
                    'invoice_status' => $seed['invoice_status'],
                    'points_awarded' => $pointsAwarded,
                    'occurred_at' => $seed['occurred_at'],
                    'recognized_at' => $seed['recognized_at'] ?? null,
                    'validated_at' => $seed['validated_at'] ?? null,
                    'rejected_at' => $seed['rejected_at'] ?? null,
                    'paid_at' => $seed['paid_at'] ?? null,
                    'last_synced_at' => $seed['last_synced_at'] ?? null,
                    'raw_iacrm_payload' => [
                        'transaction_reference' => $seed['transaction_reference'],
                        'source' => 'seed',
                    ],
                ],
            );

            if ($prospect === null) {
                continue;
            }

            if (in_array($seed['status'], ['validated', 'paid'], true)) {
                $prospect->forceFill([
                    'conversion_status' => 'converted',
                    'conversion_locked_at' => $seed['validated_at'] ?? $seed['paid_at'] ?? $seed['occurred_at'],
                    'converted_at' => $seed['validated_at'] ?? $seed['paid_at'] ?? $seed['occurred_at'],
                ])->save();
            } elseif ($seed['status'] === 'rejected') {
                $prospect->forceFill([
                    'conversion_status' => 'lost',
                    'lost_at' => $seed['rejected_at'] ?? $seed['occurred_at'],
                    'conversion_locked_at' => $seed['rejected_at'] ?? $seed['occurred_at'],
                ])->save();
            }
        }
    }

    private function resolvePointsAwarded(
        float $amount,
        string $status,
        string $commissionType,
        ?int $pointsPerTransaction,
        ?int $pointsPerEuro,
    ): ?int {
        if (! in_array($status, ['validated', 'paid'], true)) {
            return null;
        }

        return match ($commissionType) {
            'per_transaction' => $pointsPerTransaction,
            'revenue_tier' => $pointsPerEuro === null ? null : (int) round($amount * ($pointsPerEuro / 100)),
            default => null,
        };
    }
}
