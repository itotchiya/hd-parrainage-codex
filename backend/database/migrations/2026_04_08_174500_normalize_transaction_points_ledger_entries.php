<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $transactionGroups = collect(
            DB::table('points_ledger')
                ->select([
                    'id',
                    'transaction_id',
                    'entry_type',
                    'entry_status',
                    'effective_at',
                    'created_at',
                    'source',
                ])
                ->whereNotNull('transaction_id')
                ->where('source', 'like', 'transaction_%')
                ->orderBy('transaction_id')
                ->get()
        )->groupBy('transaction_id');

        $transactionGroups->each(function (Collection $entries, string $transactionId): void {
            $sortedEntries = $entries
                ->sort(function (object $left, object $right): int {
                    $statusComparison = $this->statusPriority($right->entry_status) <=> $this->statusPriority($left->entry_status);

                    if ($statusComparison !== 0) {
                        return $statusComparison;
                    }

                    $effectiveComparison = strcmp((string) ($left->effective_at ?? ''), (string) ($right->effective_at ?? ''));

                    if ($effectiveComparison !== 0) {
                        return $effectiveComparison;
                    }

                    return strcmp((string) ($left->created_at ?? ''), (string) ($right->created_at ?? ''));
                })
                ->values();

            /** @var object|null $canonicalEntry */
            $canonicalEntry = $sortedEntries->first();

            if ($canonicalEntry === null) {
                return;
            }

            $duplicateIds = $sortedEntries
                ->slice(1)
                ->pluck('id')
                ->all();

            if ($duplicateIds !== []) {
                DB::table('points_ledger')
                    ->whereIn('id', $duplicateIds)
                    ->delete();
            }

            DB::table('points_ledger')
                ->where('id', $canonicalEntry->id)
                ->update([
                    'idempotency_key' => "transaction-{$transactionId}-points",
                ]);
        });
    }

    public function down(): void
    {
        // Data normalization is intentionally irreversible.
    }

    private function statusPriority(?string $status): int
    {
        return match ($status) {
            'reversed' => 3,
            'available' => 2,
            'pending' => 1,
            default => 0,
        };
    }
};
