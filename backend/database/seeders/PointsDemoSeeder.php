<?php

namespace Database\Seeders;

use App\Models\ExchangePackItem;
use App\Models\ExchangeRequest;
use App\Models\PointsLedger;
use App\Models\Program;
use App\Models\Prospect;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;

class PointsDemoSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $owner = User::query()->where('email', 'owner@havetdigital.test')->firstOrFail();
        $transactions = Transaction::query()
            ->with(['program', 'agent', 'prospect'])
            ->orderBy('transaction_reference')
            ->get()
            ->keyBy('transaction_reference');
        $programs = Program::query()->with('exchangePack.items')->get()->keyBy('slug');
        $prospects = Prospect::query()->get()->keyBy('contact_name');

        PointsLedger::query()->delete();
        ExchangeRequest::query()->delete();

        foreach ($transactions as $transaction) {
            $program = $transaction->program;

            if ($program === null) {
                continue;
            }

            $points = $this->resolvePointsValue($transaction, $program);

            if ($points === null || $points === 0) {
                continue;
            }

            if ($transaction->status === 'pending') {
                $this->createLedgerEntry(
                    transaction: $transaction,
                    entryType: 'accrual',
                    entryStatus: 'pending',
                    pointsDelta: $points,
                    source: 'transaction_pending',
                    description: 'Pending transaction accrual awaiting validation.',
                );

                continue;
            }

            if (in_array($transaction->status, ['validated', 'paid'], true)) {
                $this->createLedgerEntry(
                    transaction: $transaction,
                    entryType: 'accrual',
                    entryStatus: 'available',
                    pointsDelta: $points,
                    source: 'transaction_validated',
                    description: 'Transaction converted into available points.',
                );

                continue;
            }

            if ($transaction->status === 'rejected') {
                $this->createLedgerEntry(
                    transaction: $transaction,
                    entryType: 'reversal',
                    entryStatus: 'reversed',
                    pointsDelta: -1 * $points,
                    source: 'transaction_rejected',
                    description: 'Rejected transaction reversed the expected commission points.',
                );
            }
        }

        $siteProgram = $programs['site-vitrine'] ?? null;
        $saasProgram = $programs['saas-automation'] ?? null;

        if ($siteProgram !== null) {
            $starterItem = $this->findPackItem($siteProgram, 'Audit SEO express');
            $transaction = $transactions['TX-SV-2026-001'] ?? null;
            $prospect = $prospects['Boulangerie Amande'] ?? null;

            if ($starterItem !== null && $transaction !== null) {
                $completedRewardRequest = ExchangeRequest::query()->create([
                    'business_id' => $transaction->business_id,
                    'program_id' => $siteProgram->id,
                    'agent_id' => $transaction->agent_id,
                    'requested_by_user_id' => $transaction->agent?->user_id,
                    'approved_by_user_id' => $owner->id,
                    'exchange_pack_item_id' => $starterItem->id,
                    'request_type' => 'reward',
                    'status' => 'completed',
                    'points_amount' => $starterItem->points_cost,
                    'cash_amount' => null,
                    'currency_code' => 'EUR',
                    'requested_reward_title' => $starterItem->title,
                    'notes' => 'Seeded completed reward redemption.',
                    'requested_at' => now()->subDay(),
                    'approved_at' => now()->subHours(22),
                    'processed_at' => now()->subHours(20),
                    'completed_at' => now()->subHours(18),
                ]);

                PointsLedger::query()->create([
                    'business_id' => $transaction->business_id,
                    'program_id' => $siteProgram->id,
                    'agent_id' => $transaction->agent_id,
                    'prospect_id' => $prospect?->id,
                    'transaction_id' => $transaction->id,
                    'exchange_request_id' => $completedRewardRequest->id,
                    'created_by_user_id' => $owner->id,
                    'entry_type' => 'spend',
                    'entry_status' => 'consumed',
                    'points_delta' => -1 * $starterItem->points_cost,
                    'source' => 'exchange_reward_completed',
                    'description' => 'Completed reward redemption consumed available points.',
                    'idempotency_key' => "exchange-{$completedRewardRequest->id}-consumed",
                    'effective_at' => $completedRewardRequest->completed_at ?? now(),
                ]);
            }
        }

        if ($saasProgram !== null) {
            $transaction = $transactions['TX-SA-2026-101'] ?? null;
            $prospect = $prospects['Bistro Horizon'] ?? null;
            $rewardPreviewItem = $this->findPackItem($saasProgram, 'Pack automatisation starter');

            if ($transaction !== null) {
                $cashRequest = ExchangeRequest::query()->create([
                    'business_id' => $transaction->business_id,
                    'program_id' => $saasProgram->id,
                    'agent_id' => $transaction->agent_id,
                    'requested_by_user_id' => $transaction->agent?->user_id,
                    'approved_by_user_id' => $owner->id,
                    'exchange_pack_item_id' => null,
                    'request_type' => 'cash',
                    'status' => 'approved',
                    'points_amount' => 400,
                    'cash_amount' => 40,
                    'currency_code' => 'EUR',
                    'requested_reward_title' => null,
                    'notes' => 'Seeded approved cash request awaiting payout.',
                    'requested_at' => now()->subHours(30),
                    'approved_at' => now()->subHours(24),
                ]);

                PointsLedger::query()->create([
                    'business_id' => $transaction->business_id,
                    'program_id' => $saasProgram->id,
                    'agent_id' => $transaction->agent_id,
                    'prospect_id' => $prospect?->id,
                    'transaction_id' => $transaction->id,
                    'exchange_request_id' => $cashRequest->id,
                    'created_by_user_id' => $owner->id,
                    'entry_type' => 'hold',
                    'entry_status' => 'locked',
                    'points_delta' => -400,
                    'source' => 'exchange_cash_approved',
                    'description' => 'Approved cash exchange request locked points pending payout.',
                    'idempotency_key' => "exchange-{$cashRequest->id}-locked",
                    'effective_at' => $cashRequest->approved_at ?? now(),
                ]);
            }

            if ($rewardPreviewItem !== null) {
                ExchangeRequest::query()->create([
                    'business_id' => $saasProgram->business_id,
                    'program_id' => $saasProgram->id,
                    'agent_id' => $saasProgram->agentAssignments()->value('agent_id'),
                    'requested_by_user_id' => $saasProgram->agentAssignments()->with('agent.user')->first()?->agent?->user_id,
                    'approved_by_user_id' => null,
                    'exchange_pack_item_id' => $rewardPreviewItem->id,
                    'request_type' => 'reward',
                    'status' => 'requested',
                    'points_amount' => $rewardPreviewItem->points_cost,
                    'cash_amount' => null,
                    'currency_code' => 'EUR',
                    'requested_reward_title' => $rewardPreviewItem->title,
                    'notes' => 'Seeded pending reward request for owner review queue.',
                    'requested_at' => now()->subHours(6),
                ]);
            }
        }
    }

    private function createLedgerEntry(
        Transaction $transaction,
        string $entryType,
        string $entryStatus,
        int $pointsDelta,
        string $source,
        string $description,
    ): void {
        PointsLedger::query()->create([
            'business_id' => $transaction->business_id,
            'program_id' => $transaction->program_id,
            'agent_id' => $transaction->agent_id,
            'prospect_id' => $transaction->prospect_id,
            'transaction_id' => $transaction->id,
            'exchange_request_id' => null,
            'created_by_user_id' => $transaction->agent?->user_id,
            'entry_type' => $entryType,
            'entry_status' => $entryStatus,
            'points_delta' => $pointsDelta,
            'source' => $source,
            'description' => $description,
            'idempotency_key' => "{$transaction->transaction_reference}-{$entryStatus}",
            'effective_at' => $transaction->paid_at
                ?? $transaction->validated_at
                ?? $transaction->rejected_at
                ?? $transaction->recognized_at
                ?? $transaction->occurred_at
                ?? now(),
        ]);
    }

    private function resolvePointsValue(Transaction $transaction, Program $program): ?int
    {
        if ($transaction->points_awarded !== null) {
            return (int) $transaction->points_awarded;
        }

        return match ($program->commission_type) {
            'per_transaction' => $program->points_per_transaction,
            'revenue_tier' => $program->points_per_euro === null ? null : (int) round(((float) $transaction->amount) * ($program->points_per_euro / 100)),
            default => null,
        };
    }

    private function findPackItem(Program $program, string $title): ?ExchangePackItem
    {
        $pack = $program->exchangePack;

        if ($pack === null || ! $pack->relationLoaded('items')) {
            return null;
        }

        /** @var ExchangePackItem|null $item */
        $item = $pack->items->firstWhere('title', $title);

        return $item;
    }
}
