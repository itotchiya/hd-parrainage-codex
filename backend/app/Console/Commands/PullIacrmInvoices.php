<?php

namespace App\Console\Commands;

use App\Models\Business;
use App\Models\PointsLedger;
use App\Models\Prospect;
use App\Models\Transaction;
use App\Services\IacrmConfigResolver;
use App\Services\IacrmRequestLogger;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Poll IACRM for invoices linked to prospects and sync them as Transactions.
 *
 * Flow:
 *   1. GET /invoices from IACRM
 *   2. For each invoice with a prospect_iacrm_id, find the local prospect
 *   3. Create or update the matching Transaction record
 *   4. Keep awarded points aligned with the current simulator invoice status
 */
class PullIacrmInvoices extends Command
{
    protected $signature = 'iacrm:pull-invoices {--dry-run : Log changes without persisting them}';

    protected $description = 'Poll IACRM for invoices linked to prospects and sync them as Transactions';

    /** Map IACRM invoice status -> Transaction status */
    private const STATUS_MAP = [
        'pending' => 'pending',
        'unpaid' => 'pending',
        'overdue' => 'pending',
        'paid' => 'paid',
        'cancelled' => 'rejected',
    ];

    public function handle(IacrmConfigResolver $configResolver, IacrmRequestLogger $requestLogger): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $configuredBusinesses = $configResolver->businessesWithStoredCredentials();

        if ($configuredBusinesses->isEmpty()) {
            if (! $configResolver->hasDefaultConfig()) {
                $this->warn('No business-scoped IACRM credentials are configured. Skipping.');

                return self::SUCCESS;
            }

            return $this->runLegacyPull($configResolver->defaultConfig(), $dryRun);
        }

        $created = 0;
        $updated = 0;
        $pointed = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($configuredBusinesses as $business) {
            $config = $configResolver->forBusiness($business->id, false);

            if ($config['base_url'] === null || $config['api_key'] === null) {
                $failed++;
                $this->warn("Skipping {$business->display_name}: missing business-scoped IACRM credentials.");
                continue;
            }

            $result = $this->pullBusinessInvoices($business, $config, $dryRun, $requestLogger);
            $created += $result['created'];
            $updated += $result['updated'];
            $pointed += $result['pointed'];
            $skipped += $result['skipped'];
            $failed += $result['failed'];
        }

        $mode = $dryRun ? ' [DRY RUN]' : '';
        $this->info("Done{$mode} - {$created} created, {$updated} updated, {$pointed} points synced, {$skipped} skipped, {$failed} failed.");
        Log::info("[IacrmInvoicePull] Done{$mode}", compact('created', 'updated', 'pointed', 'skipped', 'failed'));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @param array{base_url: ?string, api_key: ?string, source: string} $config
     * @return array{created: int, updated: int, pointed: int, skipped: int, failed: int}
     */
    private function pullBusinessInvoices(Business $business, array $config, bool $dryRun, IacrmRequestLogger $requestLogger): array
    {
        $startedAt = microtime(true);

        try {
            $response = Http::withHeaders([
                'X-IACRM-API-Key' => $config['api_key'],
                'Accept' => 'application/json',
            ])->timeout(15)->get("{$config['base_url']}/invoices");

            $requestLogger->log([
                'business_id' => $business->id,
                'initiated_by_user_id' => null,
                'sync_job_id' => null,
                'actor_type' => 'server',
                'source' => 'iacrm.pull-invoices',
                'direction' => 'pull',
                'method' => 'GET',
                'endpoint' => '/invoices',
                'status' => $response->failed() ? 'failed' : 'success',
                'status_code' => $response->status(),
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
                'request_payload' => [],
                'response_payload' => $response->json() ?? ['body' => $response->body()],
                'requested_at' => now(),
                'meta' => ['dry_run' => $dryRun],
            ]);

            if ($response->failed()) {
                $this->error("{$business->display_name}: /invoices returned {$response->status()}: {$response->body()}");

                return ['created' => 0, 'updated' => 0, 'pointed' => 0, 'skipped' => 0, 'failed' => 1];
            }
        } catch (Throwable $e) {
            $requestLogger->log([
                'business_id' => $business->id,
                'initiated_by_user_id' => null,
                'sync_job_id' => null,
                'actor_type' => 'server',
                'source' => 'iacrm.pull-invoices',
                'direction' => 'pull',
                'method' => 'GET',
                'endpoint' => '/invoices',
                'status' => 'failed',
                'status_code' => null,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
                'request_payload' => [],
                'response_payload' => [],
                'error_message' => $e->getMessage(),
                'requested_at' => now(),
                'meta' => ['dry_run' => $dryRun],
            ]);
            $this->error("{$business->display_name}: failed to reach IACRM: {$e->getMessage()}");

            return ['created' => 0, 'updated' => 0, 'pointed' => 0, 'skipped' => 0, 'failed' => 1];
        }

        /** @var array<array<string, mixed>> $invoices */
        $invoices = $response->json('data', []);
        $linkedInvoices = array_filter($invoices, static fn (array $invoice): bool => ! empty($invoice['prospect_iacrm_id']));

        if (empty($linkedInvoices)) {
            $this->line("{$business->display_name}: no prospect-linked invoices returned by IACRM.");

            return ['created' => 0, 'updated' => 0, 'pointed' => 0, 'skipped' => 0, 'failed' => 0];
        }

        $prospectIds = array_unique(array_column(array_values($linkedInvoices), 'prospect_iacrm_id'));

        $localProspects = Prospect::query()
            ->where('business_id', $business->id)
            ->whereIn('iacrm_prospect_id', $prospectIds)
            ->whereNull('deleted_at')
            ->with('program')
            ->get()
            ->keyBy('iacrm_prospect_id');

        $created = 0;
        $updated = 0;
        $pointed = 0;
        $skipped = 0;
        $failed = 0;

        $this->line("Reconciling {$business->display_name} invoices...");

        foreach ($linkedInvoices as $invoice) {
            try {
                $result = $this->syncInvoice($invoice, $localProspects, $dryRun);
                $created += $result['created'];
                $updated += $result['updated'];
                $pointed += $result['pointed'];
                $skipped += $result['skipped'];
            } catch (Throwable $exception) {
                $failed++;
                $invoiceReference = (string) ($invoice['invoice_reference'] ?? $invoice['iacrm_id'] ?? 'unknown');
                $this->error("  ! Failed to sync invoice {$invoiceReference}: {$exception->getMessage()}");
                Log::warning('[IacrmInvoicePull] Invoice sync failed', [
                    'business_id' => $business->id,
                    'invoice_reference' => $invoiceReference,
                    'iacrm_invoice_id' => $invoice['iacrm_id'] ?? null,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        return ['created' => $created, 'updated' => $updated, 'pointed' => $pointed, 'skipped' => $skipped, 'failed' => $failed];
    }

    /**
     * @param array{base_url: ?string, api_key: ?string, source: string} $config
     */
    private function runLegacyPull(array $config, bool $dryRun): int
    {
        try {
            $response = Http::withHeaders([
                'X-IACRM-API-Key' => $config['api_key'],
                'Accept' => 'application/json',
            ])->timeout(15)->get("{$config['base_url']}/invoices");

            if ($response->failed()) {
                $this->error("IACRM /invoices returned {$response->status()}: {$response->body()}");

                return self::FAILURE;
            }
        } catch (Throwable $e) {
            $this->error("Failed to reach IACRM: {$e->getMessage()}");

            return self::FAILURE;
        }

        /** @var array<array<string, mixed>> $invoices */
        $invoices = $response->json('data', []);
        $linkedInvoices = array_filter($invoices, static fn (array $invoice): bool => ! empty($invoice['prospect_iacrm_id']));

        if (empty($linkedInvoices)) {
            $this->line('No prospect-linked invoices returned by IACRM.');

            return self::SUCCESS;
        }

        $prospectIds = array_unique(array_column(array_values($linkedInvoices), 'prospect_iacrm_id'));

        $localProspects = Prospect::query()
            ->whereIn('iacrm_prospect_id', $prospectIds)
            ->whereNull('deleted_at')
            ->with('program')
            ->get()
            ->keyBy('iacrm_prospect_id');

        $created = 0;
        $updated = 0;
        $pointed = 0;
        $skipped = 0;

        foreach ($linkedInvoices as $invoice) {
            $result = $this->syncInvoice($invoice, $localProspects, $dryRun);
            $created += $result['created'];
            $updated += $result['updated'];
            $pointed += $result['pointed'];
            $skipped += $result['skipped'];
        }

        $mode = $dryRun ? ' [DRY RUN]' : '';
        $this->info("Done{$mode} - {$created} created, {$updated} updated, {$pointed} points synced, {$skipped} skipped.");
        Log::info("[IacrmInvoicePull] Done{$mode}", compact('created', 'updated', 'pointed', 'skipped'));

        return self::SUCCESS;
    }

    /**
     * @param array<string, mixed> $invoice
     * @param \Illuminate\Support\Collection<string, Prospect> $localProspects
     * @return array{created: int, updated: int, pointed: int, skipped: int}
     */
    private function syncInvoice(array $invoice, $localProspects, bool $dryRun): array
    {
        $iacrmInvoiceId = $invoice['iacrm_id'] ?? null;
        $prospectIacrmId = $invoice['prospect_iacrm_id'] ?? null;
        $iacrmStatus = $invoice['status'] ?? 'pending';

        if (! $iacrmInvoiceId || ! $prospectIacrmId) {
            return ['created' => 0, 'updated' => 0, 'pointed' => 0, 'skipped' => 1];
        }

        /** @var Prospect|null $prospect */
        $prospect = $localProspects[$prospectIacrmId] ?? null;
        if ($prospect === null) {
            $this->line("  ! Prospect IACRM ID {$prospectIacrmId} not found locally - skipping invoice {$iacrmInvoiceId}");

            return ['created' => 0, 'updated' => 0, 'pointed' => 0, 'skipped' => 1];
        }

        $transactionStatus = self::STATUS_MAP[$iacrmStatus] ?? 'pending';
        $amount = (float) ($invoice['amount'] ?? 0);
        $currency = (string) ($invoice['currency'] ?? 'EUR');
        $productName = (string) ($invoice['product_name'] ?? 'Service IACRM');
        $invoiceReference = (string) ($invoice['invoice_reference'] ?? $iacrmInvoiceId);
        $issuedAt = $invoice['issued_at'] ?? null;
        $paidAt = ($iacrmStatus === 'paid' && ! empty($invoice['paid_at'])) ? $invoice['paid_at'] : null;
        $syncedAt = now();

        $existing = Transaction::query()
            ->where('iacrm_transaction_id', $iacrmInvoiceId)
            ->first();

        $expectedPaidAt = $paidAt ? now()->parse((string) $paidAt) : null;
        $expectedRejectedAt = $transactionStatus === 'rejected'
            ? ($existing?->rejected_at ?? $syncedAt)
            : null;

        $created = 0;
        $updated = 0;
        $pointed = 0;
        $skipped = 0;

        if ($existing === null) {
            $this->line("  + [{$prospect->contact_name}] New invoice {$invoiceReference} ({$amount} {$currency}) -> {$transactionStatus}");

            if (! $dryRun) {
                $existing = Transaction::query()->create([
                    'business_id' => $prospect->business_id,
                    'program_id' => $prospect->program_id,
                    'agent_id' => $prospect->agent_id,
                    'prospect_id' => $prospect->id,
                    'iacrm_transaction_id' => $iacrmInvoiceId,
                    'transaction_reference' => $invoiceReference,
                    'product_name' => $productName,
                    'amount' => $amount,
                    'currency_code' => $currency,
                    'status' => $transactionStatus,
                    'invoice_status' => $this->mapInvoiceStatus($iacrmStatus),
                    'occurred_at' => $issuedAt ? now()->parse((string) $issuedAt) : now(),
                    'rejected_at' => $expectedRejectedAt,
                    'paid_at' => $expectedPaidAt,
                    'last_synced_at' => $syncedAt,
                    'raw_iacrm_payload' => $invoice,
                ]);
            }

            $created++;
        } else {
            $expectedInvoiceStatus = $this->mapInvoiceStatus($iacrmStatus);

            $timestampsAlreadySynced = $this->sameTimestamp($existing->paid_at, $expectedPaidAt)
                && $this->sameTimestamp($existing->rejected_at, $expectedRejectedAt);

            if ($existing->status === $transactionStatus
                && $existing->invoice_status === $expectedInvoiceStatus
                && $timestampsAlreadySynced) {
                if (! $dryRun) {
                    $existing->update([
                        'last_synced_at' => $syncedAt,
                        'raw_iacrm_payload' => $invoice,
                    ]);
                }

                $pointed += $this->syncPointsState($existing, $prospect, $transactionStatus, $dryRun);
                $skipped++;

                return compact('created', 'updated', 'pointed', 'skipped');
            }

            $this->line("  ~ [{$prospect->contact_name}] {$invoiceReference} {$existing->status} -> {$transactionStatus}");

            if (! $dryRun) {
                $existing->update([
                    'status' => $transactionStatus,
                    'invoice_status' => $expectedInvoiceStatus,
                    'rejected_at' => $expectedRejectedAt,
                    'paid_at' => $expectedPaidAt,
                    'last_synced_at' => $syncedAt,
                    'raw_iacrm_payload' => $invoice,
                ]);
            }

            $updated++;
        }

        if ($existing !== null) {
            $pointed += $this->syncPointsState($existing, $prospect, $transactionStatus, $dryRun);
        }

        return compact('created', 'updated', 'pointed', 'skipped');
    }

    private function syncPointsState(Transaction $transaction, Prospect $prospect, string $transactionStatus, bool $dryRun): int
    {
        $idempotencyKey = "transaction-{$transaction->id}-points";
        $ledgerEntry = PointsLedger::query()
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        $computedPoints = $this->computePoints($prospect, (float) $transaction->amount);
        $currentPoints = (int) ($transaction->points_awarded ?? 0);

        if ($transactionStatus === 'paid' && $computedPoints > 0) {
            $needsSync = $currentPoints !== $computedPoints
                || $ledgerEntry === null
                || $ledgerEntry->entry_type !== 'accrual'
                || $ledgerEntry->entry_status !== 'available'
                || (int) $ledgerEntry->points_delta !== $computedPoints;

            if (! $needsSync) {
                return 0;
            }

            $this->line("  * [{$prospect->contact_name}] {$computedPoints} pts -> agent {$prospect->agent_id}");

            if (! $dryRun) {
                DB::transaction(function () use ($transaction, $prospect, $computedPoints, $idempotencyKey): void {
                    PointsLedger::query()->updateOrCreate(
                        ['idempotency_key' => $idempotencyKey],
                        [
                            'business_id' => $prospect->business_id,
                            'program_id' => $prospect->program_id,
                            'agent_id' => $prospect->agent_id,
                            'prospect_id' => $prospect->id,
                            'transaction_id' => $transaction->id,
                            'entry_type' => 'accrual',
                            'entry_status' => 'available',
                            'points_delta' => $computedPoints,
                            'source' => "iacrm-invoice-{$transaction->iacrm_transaction_id}",
                            'description' => "Facture IACRM payee : {$transaction->transaction_reference} ({$transaction->amount} {$transaction->currency_code})",
                            'effective_at' => $transaction->paid_at ?? now(),
                            'created_by_user_id' => null,
                        ],
                    );

                    $transaction->update(['points_awarded' => $computedPoints]);
                });
            }

            return 1;
        }

        $pointsToReverse = max($currentPoints, abs((int) ($ledgerEntry?->points_delta ?? 0)));
        if ($pointsToReverse <= 0) {
            return 0;
        }

        $needsSync = $transaction->points_awarded !== null
            || $ledgerEntry === null
            || $ledgerEntry->entry_type !== 'reversal'
            || $ledgerEntry->entry_status !== 'reversed'
            || (int) $ledgerEntry->points_delta !== -1 * $pointsToReverse;

        if (! $needsSync) {
            return 0;
        }

        $this->line("  * [{$prospect->contact_name}] reverse {$pointsToReverse} pts -> agent {$prospect->agent_id}");

        if (! $dryRun) {
            DB::transaction(function () use ($transaction, $prospect, $pointsToReverse, $idempotencyKey): void {
                PointsLedger::query()->updateOrCreate(
                    ['idempotency_key' => $idempotencyKey],
                    [
                        'business_id' => $prospect->business_id,
                        'program_id' => $prospect->program_id,
                        'agent_id' => $prospect->agent_id,
                        'prospect_id' => $prospect->id,
                        'transaction_id' => $transaction->id,
                        'entry_type' => 'reversal',
                        'entry_status' => 'reversed',
                        'points_delta' => -1 * $pointsToReverse,
                        'source' => "iacrm-invoice-{$transaction->iacrm_transaction_id}",
                        'description' => "Facture IACRM non payee : {$transaction->transaction_reference} ({$transaction->amount} {$transaction->currency_code})",
                        'effective_at' => $transaction->rejected_at ?? $transaction->last_synced_at ?? now(),
                        'created_by_user_id' => null,
                    ],
                );

                $transaction->update(['points_awarded' => null]);
            });
        }

        return 1;
    }

    private function computePoints(Prospect $prospect, float $amount): int
    {
        $program = $prospect->program;
        if (! $program) {
            return 0;
        }

        if ($program->points_per_transaction !== null && $program->points_per_transaction > 0) {
            return (int) $program->points_per_transaction;
        }

        if ($program->points_per_euro !== null && $program->points_per_euro > 0) {
            return (int) round($amount * $program->points_per_euro);
        }

        return 0;
    }

    private function sameTimestamp(mixed $left, mixed $right): bool
    {
        if ($left === null || $right === null) {
            return $left === $right;
        }

        return now()->parse((string) $left)->equalTo(now()->parse((string) $right));
    }

    private function mapInvoiceStatus(string $iacrmStatus): string
    {
        return match ($iacrmStatus) {
            'paid' => 'paid',
            'overdue' => 'overdue',
            'unpaid' => 'unpaid',
            'cancelled' => 'cancelled',
            default => 'pending',
        };
    }
}
