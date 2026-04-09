<?php

namespace App\Console\Commands;

use App\Models\Prospect;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Pull prospect stage updates from IACRM and apply them locally.
 *
 * The IACRM simulator has no webhook capability, so we poll its pipeline
 * endpoint and reconcile any stage changes back into HD Parrainage.
 */
class PullIacrmProspectStages extends Command
{
    protected $signature   = 'iacrm:pull-stages {--dry-run : Log changes without persisting them}';
    protected $description = 'Poll IACRM for prospect stage changes and sync them into HD Parrainage';

    /** IACRM stages that map to an active pipeline_stage column value */
    private const ACTIVE_STAGES = ['suspect', 'prospect_froid', 'prospect_tiede', 'prospect_chaud'];

    public function handle(): int
    {
        $baseUrl = rtrim((string) config('services.iacrm.base_url', ''), '/') ?: null;
        $apiKey  = (string) config('services.iacrm.api_key', '') ?: null;

        if (! $baseUrl || ! $apiKey) {
            $this->warn('IACRM_BASE_URL or IACRM_API_KEY is not set. Skipping.');
            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');

        // ── 1. Fetch all prospects currently tracked in IACRM ────────────────
        try {
            $response = Http::withHeaders([
                'X-IACRM-API-Key' => $apiKey,
                'Accept'          => 'application/json',
            ])->timeout(15)->get("{$baseUrl}/pipeline/prospects");

            if ($response->failed()) {
                $this->error("IACRM /pipeline/prospects returned {$response->status()}: " . $response->body());
                return self::FAILURE;
            }
        } catch (Throwable $e) {
            $this->error("Failed to reach IACRM: {$e->getMessage()}");
            return self::FAILURE;
        }

        /** @var array<array{iacrm_id: string, stage: string}> $iacrmProspects */
        $iacrmProspects = $response->json('data', []);

        if (empty($iacrmProspects)) {
            $this->line('No prospects returned by IACRM.');
            return self::SUCCESS;
        }

        // Build a lookup map: iacrm_id => stage
        $iacrmStageMap = [];
        foreach ($iacrmProspects as $p) {
            $id = $p['iacrm_id'] ?? null;
            if ($id) {
                $iacrmStageMap[$id] = $p['stage'] ?? null;
            }
        }

        // ── 2. Load our local prospects that have an IACRM ID ────────────────
        $localProspects = Prospect::query()
            ->whereIn('iacrm_prospect_id', array_keys($iacrmStageMap))
            ->whereNull('deleted_at')
            ->get();

        $updated = 0;
        $skipped = 0;

        foreach ($localProspects as $prospect) {
            $iacrmStage = $iacrmStageMap[$prospect->iacrm_prospect_id] ?? null;

            if (! $iacrmStage) {
                $skipped++;
                continue;
            }

            $changed = $this->applyStageChange($prospect, $iacrmStage, $dryRun);
            $changed ? $updated++ : $skipped++;
        }

        $mode = $dryRun ? ' [DRY RUN]' : '';
        $this->info("Done{$mode} — {$updated} updated, {$skipped} already in sync.");
        Log::info("[IacrmPull] Done{$mode}", ['updated' => $updated, 'skipped' => $skipped]);

        return self::SUCCESS;
    }

    private function applyStageChange(Prospect $prospect, string $iacrmStage, bool $dryRun): bool
    {
        $currentStage          = $prospect->pipeline_stage;
        $currentConversionStatus = $prospect->conversion_status;

        // ── Active pipeline stage ─────────────────────────────────────────────
        if (in_array($iacrmStage, self::ACTIVE_STAGES, true)) {
            // No change if already at this stage and still open
            if ($currentStage === $iacrmStage && $currentConversionStatus === 'open') {
                return false;
            }

            $this->line("  → [{$prospect->contact_name}] {$currentStage}/{$currentConversionStatus} → {$iacrmStage}/open");

            if (! $dryRun) {
                $prospect->update([
                    'pipeline_stage'          => $iacrmStage,
                    'progression_status'      => $iacrmStage,
                    'conversion_status'       => 'open',
                    'pipeline_stage_changed_at' => now(),
                ]);

                $prospect->statusHistory()->create([
                    'source_system'           => 'iacrm',
                    'old_submission_status'   => $prospect->submission_status,
                    'new_submission_status'   => $prospect->submission_status,
                    'old_progression_status'  => $currentStage,
                    'new_progression_status'  => $iacrmStage,
                    'reason'                  => "Stage mis à jour depuis IACRM : {$currentStage} → {$iacrmStage}",
                    'payload_snapshot'        => ['event' => 'iacrm_stage_pull', 'iacrm_stage' => $iacrmStage],
                    'changed_by_user_id'      => null,
                ]);
            }

            return true;
        }

        // ── Converted ─────────────────────────────────────────────────────────
        if ($iacrmStage === 'converted') {
            if ($currentConversionStatus === 'converted') {
                return false;
            }

            $this->line("  → [{$prospect->contact_name}] converti (IACRM)");

            if (! $dryRun) {
                $prospect->update([
                    'conversion_status'  => 'converted',
                    'converted_at'       => now(),
                    'progression_status' => 'converted',
                ]);

                $prospect->statusHistory()->create([
                    'source_system'          => 'iacrm',
                    'old_submission_status'  => $prospect->submission_status,
                    'new_submission_status'  => $prospect->submission_status,
                    'old_progression_status' => $currentStage,
                    'new_progression_status' => 'converted',
                    'reason'                 => 'Prospect marqué comme converti par IACRM.',
                    'payload_snapshot'       => ['event' => 'iacrm_stage_pull', 'iacrm_stage' => 'converted'],
                    'changed_by_user_id'     => null,
                ]);
            }

            return true;
        }

        // ── Lost ──────────────────────────────────────────────────────────────
        if ($iacrmStage === 'lost') {
            if ($currentConversionStatus === 'lost') {
                return false;
            }

            $this->line("  → [{$prospect->contact_name}] perdu (IACRM)");

            if (! $dryRun) {
                $prospect->update([
                    'conversion_status'  => 'lost',
                    'lost_at'            => now(),
                    'progression_status' => 'lost',
                ]);

                $prospect->statusHistory()->create([
                    'source_system'          => 'iacrm',
                    'old_submission_status'  => $prospect->submission_status,
                    'new_submission_status'  => $prospect->submission_status,
                    'old_progression_status' => $currentStage,
                    'new_progression_status' => 'lost',
                    'reason'                 => 'Prospect marqué comme perdu par IACRM.',
                    'payload_snapshot'       => ['event' => 'iacrm_stage_pull', 'iacrm_stage' => 'lost'],
                    'changed_by_user_id'     => null,
                ]);
            }

            return true;
        }

        return false;
    }
}
