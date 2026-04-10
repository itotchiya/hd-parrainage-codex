<?php

namespace App\Console\Commands;

use App\Models\PointsLedger;
use App\Models\Prospect;
use App\Models\Transaction;
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
 *   4. If status = 'paid' and not yet paid locally → award points to the agent
 */
class PullIacrmInvoices extends Command
{
    protected $signature   = 'iacrm:pull-invoices {--dry-run : Log changes without persisting them}';
    protected $description = 'Poll IACRM for invoices linked to prospects and sync them as Transactions';

    /** Map IACRM invoice status → Transaction status */
    private const STATUS_MAP = [
        'pending'   => 'pending',
        'unpaid'    => 'pending',
        'overdue'   => 'pending',
        'paid'      => 'paid',
        'cancelled' => 'rejected',
    ];

    public function handle(): int
    {
        $baseUrl = rtrim((string) config('services.iacrm.base_url', ''), '/') ?: null;
        $apiKey  = (string) config('services.iacrm.api_key', '') ?: null;

        if (! $baseUrl || ! $apiKey) {
            $this->warn('IACRM_BASE_URL or IACRM_API_KEY is not set. Skipping.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');

        // ── 1. Fetch all invoices from IACRM ────────────────────────────────
        try {
            $response = Http::withHeaders([
                'X-IACRM-API-Key' => $apiKey,
                'Accept'          => 'application/json',
            ])->timeout(15)->get("{$baseUrl}/invoices");

            if ($response->failed()) {
                $this->error("IACRM /invoices returned {$response->status()}: " . $response->body());
                return self::FAILURE;
            }
        } catch (Throwable $e) {
            $this->error("Failed to reach IACRM: {$e->getMessage()}");
            return self::FAILURE;
        }

        /** @var array<array<string, mixed>> $invoices */
        $invoices = $response->json('data', []);

        // Only process invoices that are linked to a prospect
        $linked = array_filter($invoices, fn ($i) => ! empty($i['prospect_iacrm_id']));

        if (empty($linked)) {
            $this->line('No prospect-linked invoices returned by IACRM.');
            return self::SUCCESS;
        }

        // ── 2. Build lookup: iacrm_prospect_id → local Prospect ─────────────
        $prospectIds = array_unique(array_column(array_values($linked), 'prospect_iacrm_id'));

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

        foreach ($linked as $inv) {
            $iacrmInvId      = $inv['iacrm_id']          ?? null;
            $prospectIacrmId = $inv['prospect_iacrm_id'] ?? null;
            $iacrmStatus     = $inv['status']             ?? 'pending';

            if (! $iacrmInvId || ! $prospectIacrmId) {
                $skipped++;
                continue;
            }

            $prospect = $localProspects[$prospectIacrmId] ?? null;
            if (! $prospect) {
                $this->line("  ⚠ Prospect IACRM ID {$prospectIacrmId} not found locally — skipping invoice {$iacrmInvId}");
                $skipped++;
                continue;
            }

            $txStatus      = self::STATUS_MAP[$iacrmStatus] ?? 'pending';
            $amount        = (float) ($inv['amount']    ?? 0);
            $currency      = (string) ($inv['currency'] ?? 'EUR');
            $productName   = (string) ($inv['product_name']      ?? 'Service IACRM');
            $invoiceRef    = (string) ($inv['invoice_reference']  ?? $iacrmInvId);
            $issuedAt      = $inv['issued_at'] ?? null;
            $paidAt        = ($iacrmStatus === 'paid' && ! empty($inv['paid_at'])) ? $inv['paid_at'] : null;

            // ── 3. Find or create the local Transaction ──────────────────────
            $existing = Transaction::query()
                ->where('iacrm_transaction_id', $iacrmInvId)
                ->first();

            if ($existing === null) {
                // New invoice → create transaction
                $this->line("  + [{$prospect->contact_name}] Nouvelle facture {$invoiceRef} ({$amount} {$currency}) → {$txStatus}");

                if (! $dryRun) {
                    $existing = Transaction::query()->create([
                        'business_id'           => $prospect->business_id,
                        'program_id'            => $prospect->program_id,
                        'agent_id'              => $prospect->agent_id,
                        'prospect_id'           => $prospect->id,
                        'iacrm_transaction_id'  => $iacrmInvId,
                        'transaction_reference' => $invoiceRef,
                        'product_name'          => $productName,
                        'amount'                => $amount,
                        'currency_code'         => $currency,
                        'status'                => $txStatus,
                        'invoice_status'        => $this->mapInvoiceStatus($iacrmStatus),
                        'occurred_at'           => $issuedAt ? now()->parse($issuedAt) : now(),
                        'paid_at'               => $paidAt ? now()->parse($paidAt) : null,
                        'last_synced_at'        => now(),
                        'raw_iacrm_payload'     => $inv,
                    ]);
                }
                $created++;
            } else {
                // Existing invoice — check if status changed
                $prevStatus = $existing->status;
                if ($prevStatus === $txStatus && $existing->invoice_status === $this->mapInvoiceStatus($iacrmStatus)) {
                    $skipped++;
                    continue;
                }

                $this->line("  ↺ [{$prospect->contact_name}] {$invoiceRef} {$prevStatus} → {$txStatus}");

                if (! $dryRun) {
                    $existing->update([
                        'status'            => $txStatus,
                        'invoice_status'    => $this->mapInvoiceStatus($iacrmStatus),
                        'paid_at'           => $paidAt ? now()->parse($paidAt) : $existing->paid_at,
                        'last_synced_at'    => now(),
                        'raw_iacrm_payload' => $inv,
                    ]);
                }
                $updated++;
            }

            // ── 4. Award points when invoice is paid ─────────────────────────
            if ($txStatus === 'paid' && $existing !== null && $existing->points_awarded === null) {
                $pointsAwarded = $this->computePoints($prospect, $amount);

                if ($pointsAwarded > 0) {
                    $this->line("  ★ [{$prospect->contact_name}] {$pointsAwarded} pts → agent {$prospect->agent_id}");

                    if (! $dryRun) {
                        $idempotencyKey = "transaction-{$existing->id}-points";

                        $alreadyExists = PointsLedger::query()
                            ->where('idempotency_key', $idempotencyKey)
                            ->exists();

                        if (! $alreadyExists) {
                            DB::transaction(function () use ($existing, $prospect, $pointsAwarded, $idempotencyKey): void {
                                PointsLedger::query()->create([
                                    'business_id'       => $prospect->business_id,
                                    'program_id'        => $prospect->program_id,
                                    'agent_id'          => $prospect->agent_id,
                                    'prospect_id'       => $prospect->id,
                                    'transaction_id'    => $existing->id,
                                    'entry_type'        => 'accrual',
                                    'entry_status'      => 'available',
                                    'points_delta'      => $pointsAwarded,
                                    'source'            => "iacrm-invoice-{$existing->iacrm_transaction_id}",
                                    'description'       => "Facture IACRM payée : {$existing->transaction_reference} ({$existing->amount} {$existing->currency_code})",
                                    'idempotency_key'   => $idempotencyKey,
                                    'effective_at'      => $existing->paid_at ?? now(),
                                    'created_by_user_id' => null,
                                ]);

                                $existing->update(['points_awarded' => $pointsAwarded]);
                            });
                            $pointed++;
                        }
                    }
                }
            }
        }

        $mode = $dryRun ? ' [DRY RUN]' : '';
        $this->info("Done{$mode} — {$created} créées, {$updated} mises à jour, {$pointed} points attribués, {$skipped} ignorées.");
        Log::info("[IacrmInvoicePull] Done{$mode}", compact('created', 'updated', 'pointed', 'skipped'));

        return self::SUCCESS;
    }

    private function computePoints(Prospect $prospect, float $amount): int
    {
        $program = $prospect->program;
        if (! $program) {
            return 0;
        }

        // Fixed points per transaction takes priority
        if ($program->points_per_transaction !== null && $program->points_per_transaction > 0) {
            return (int) $program->points_per_transaction;
        }

        // Points per euro (integer result)
        if ($program->points_per_euro !== null && $program->points_per_euro > 0) {
            return (int) round($amount * $program->points_per_euro);
        }

        return 0;
    }

    private function mapInvoiceStatus(string $iacrmStatus): string
    {
        return match ($iacrmStatus) {
            'paid'      => 'paid',
            'overdue'   => 'overdue',
            'unpaid'    => 'unpaid',
            'cancelled' => 'cancelled',
            default     => 'pending',
        };
    }
}
