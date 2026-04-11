<?php

namespace App\Console\Commands;

use App\Models\Business;
use App\Models\Prospect;
use App\Services\IacrmConfigResolver;
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
    protected $signature = 'iacrm:pull-stages {--dry-run : Log changes without persisting them}';
    protected $description = 'Poll IACRM for prospect stage changes and sync them into HD Parrainage';

    /** IACRM stages that map to an active pipeline_stage column value */
    private const ACTIVE_STAGES = ['suspect', 'prospect_froid', 'prospect_tiede', 'prospect_chaud'];

    public function handle(IacrmConfigResolver $configResolver): int
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

        $updated = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($configuredBusinesses as $business) {
            $config = $configResolver->forBusiness($business->id, false);

            if ($config['base_url'] === null || $config['api_key'] === null) {
                $failed++;
                $this->warn("Skipping {$business->display_name}: missing business-scoped IACRM credentials.");
                continue;
            }

            $result = $this->pullBusinessProspectStages($business, $config, $dryRun);
            $updated += $result['updated'];
            $skipped += $result['skipped'];
            $failed += $result['failed'];
        }

        $mode = $dryRun ? ' [DRY RUN]' : '';
        $this->info("Done{$mode} — {$updated} updated, {$skipped} already in sync, {$failed} failed.");
        Log::info("[IacrmPull] Done{$mode}", compact('updated', 'skipped', 'failed'));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @param array{base_url: ?string, api_key: ?string, source: string} $config
     * @return array{updated: int, skipped: int, failed: int}
     */
    private function pullBusinessProspectStages(Business $business, array $config, bool $dryRun): array
    {
        try {
            $response = Http::withHeaders([
                'X-IACRM-API-Key' => $config['api_key'],
                'Accept' => 'application/json',
            ])->timeout(15)->get("{$config['base_url']}/pipeline/prospects");

            if ($response->failed()) {
                $this->error("{$business->display_name}: /pipeline/prospects returned {$response->status()}: {$response->body()}");
                return ['updated' => 0, 'skipped' => 0, 'failed' => 1];
            }
        } catch (Throwable $e) {
            $this->error("{$business->display_name}: failed to reach IACRM: {$e->getMessage()}");
            return ['updated' => 0, 'skipped' => 0, 'failed' => 1];
        }

        /** @var array<array{iacrm_id: string, stage: string}> $iacrmProspects */
        $iacrmProspects = $response->json('data', []);

        if (empty($iacrmProspects)) {
            $this->line("{$business->display_name}: no prospects returned by IACRM.");
            return ['updated' => 0, 'skipped' => 0, 'failed' => 0];
        }

        $iacrmStageMap = [];
        foreach ($iacrmProspects as $prospect) {
            $id = $prospect['iacrm_id'] ?? null;
            if ($id !== null) {
                $iacrmStageMap[$id] = $prospect['stage'] ?? null;
            }
        }

        $localProspects = Prospect::query()
            ->where('business_id', $business->id)
            ->whereIn('iacrm_prospect_id', array_keys($iacrmStageMap))
            ->whereNull('deleted_at')
            ->get();

        $updated = 0;
        $skipped = 0;

        $this->line("Reconciling {$business->display_name} prospect stages...");

        foreach ($localProspects as $prospect) {
            $iacrmStage = $iacrmStageMap[$prospect->iacrm_prospect_id] ?? null;

            if ($iacrmStage === null) {
                $skipped++;
                continue;
            }

            $changed = $this->applyStageChange($prospect, $iacrmStage, $dryRun);
            $changed ? $updated++ : $skipped++;
        }

        return ['updated' => $updated, 'skipped' => $skipped, 'failed' => 0];
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
            ])->timeout(15)->get("{$config['base_url']}/pipeline/prospects");

            if ($response->failed()) {
                $this->error("IACRM /pipeline/prospects returned {$response->status()}: {$response->body()}");
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

        $iacrmStageMap = [];
        foreach ($iacrmProspects as $prospect) {
            $id = $prospect['iacrm_id'] ?? null;
            if ($id !== null) {
                $iacrmStageMap[$id] = $prospect['stage'] ?? null;
            }
        }

        $localProspects = Prospect::query()
            ->whereIn('iacrm_prospect_id', array_keys($iacrmStageMap))
            ->whereNull('deleted_at')
            ->get();

        $updated = 0;
        $skipped = 0;

        foreach ($localProspects as $prospect) {
            $iacrmStage = $iacrmStageMap[$prospect->iacrm_prospect_id] ?? null;

            if ($iacrmStage === null) {
                $skipped++;
                continue;
            }

            $changed = $this->applyStageChange($prospect, $iacrmStage, $dryRun);
            $changed ? $updated++ : $skipped++;
        }

        $mode = $dryRun ? ' [DRY RUN]' : '';
        $this->info("Done{$mode} — {$updated} updated, {$skipped} already in sync.");
        Log::info("[IacrmPull] Done{$mode}", ['updated' => $updated, 'skipped' => $skipped, 'mode' => 'legacy']);

        return self::SUCCESS;
    }

    private function applyStageChange(Prospect $prospect, string $iacrmStage, bool $dryRun): bool
    {
        $currentStage = $prospect->pipeline_stage;
        $currentConversionStatus = $prospect->conversion_status;

        if (in_array($iacrmStage, self::ACTIVE_STAGES, true)) {
            if ($currentStage === $iacrmStage && $currentConversionStatus === 'open') {
                return false;
            }

            $this->line("  → [{$prospect->contact_name}] {$currentStage}/{$currentConversionStatus} → {$iacrmStage}/open");

            if (! $dryRun) {
                $prospect->update([
                    'pipeline_stage' => $iacrmStage,
                    'progression_status' => $iacrmStage,
                    'conversion_status' => 'open',
                    'pipeline_stage_changed_at' => now(),
                ]);

                $prospect->statusHistory()->create([
                    'source_system' => 'iacrm',
                    'old_submission_status' => $prospect->submission_status,
                    'new_submission_status' => $prospect->submission_status,
                    'old_progression_status' => $currentStage,
                    'new_progression_status' => $iacrmStage,
                    'reason' => "Stage mis à jour depuis IACRM : {$currentStage} → {$iacrmStage}",
                    'payload_snapshot' => ['event' => 'iacrm_stage_pull', 'iacrm_stage' => $iacrmStage],
                    'changed_by_user_id' => null,
                ]);
            }

            return true;
        }

        if ($iacrmStage === 'converted') {
            if ($currentConversionStatus === 'converted') {
                return false;
            }

            $this->line("  → [{$prospect->contact_name}] converti (IACRM)");

            if (! $dryRun) {
                $prospect->update([
                    'conversion_status' => 'converted',
                    'converted_at' => now(),
                    'progression_status' => 'converted',
                ]);

                $prospect->statusHistory()->create([
                    'source_system' => 'iacrm',
                    'old_submission_status' => $prospect->submission_status,
                    'new_submission_status' => $prospect->submission_status,
                    'old_progression_status' => $currentStage,
                    'new_progression_status' => 'converted',
                    'reason' => 'Prospect marqué comme converti par IACRM.',
                    'payload_snapshot' => ['event' => 'iacrm_stage_pull', 'iacrm_stage' => 'converted'],
                    'changed_by_user_id' => null,
                ]);
            }

            return true;
        }

        if ($iacrmStage === 'lost') {
            if ($currentConversionStatus === 'lost') {
                return false;
            }

            $this->line("  → [{$prospect->contact_name}] perdu (IACRM)");

            if (! $dryRun) {
                $prospect->update([
                    'conversion_status' => 'lost',
                    'lost_at' => now(),
                    'progression_status' => 'lost',
                ]);

                $prospect->statusHistory()->create([
                    'source_system' => 'iacrm',
                    'old_submission_status' => $prospect->submission_status,
                    'new_submission_status' => $prospect->submission_status,
                    'old_progression_status' => $currentStage,
                    'new_progression_status' => 'lost',
                    'reason' => 'Prospect marqué comme perdu par IACRM.',
                    'payload_snapshot' => ['event' => 'iacrm_stage_pull', 'iacrm_stage' => 'lost'],
                    'changed_by_user_id' => null,
                ]);
            }

            return true;
        }

        return false;
    }
}
