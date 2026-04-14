<?php

namespace App\Console\Commands;

use App\Models\Business;
use App\Models\Prospect;
use App\Services\IacrmConfigResolver;
use App\Services\IacrmRequestLogger;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
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

            $result = $this->pullBusinessProspectStages($business, $config, $dryRun, $requestLogger);
            $updated += $result['updated'];
            $skipped += $result['skipped'];
            $failed += $result['failed'];
        }

        $mode = $dryRun ? ' [DRY RUN]' : '';
        $this->info("Done{$mode} - {$updated} updated, {$skipped} already in sync, {$failed} failed.");
        Log::info("[IacrmPull] Done{$mode}", compact('updated', 'skipped', 'failed'));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @param array{base_url: ?string, api_key: ?string, source: string} $config
     * @return array{updated: int, skipped: int, failed: int}
     */
    private function pullBusinessProspectStages(Business $business, array $config, bool $dryRun, IacrmRequestLogger $requestLogger): array
    {
        $startedAt = microtime(true);

        try {
            $response = Http::withHeaders([
                'X-IACRM-API-Key' => $config['api_key'],
                'Accept' => 'application/json',
            ])->timeout(15)->get("{$config['base_url']}/pipeline/prospects");

            $requestLogger->log([
                'business_id' => $business->id,
                'initiated_by_user_id' => null,
                'sync_job_id' => null,
                'actor_type' => 'server',
                'source' => 'iacrm.pull-stages',
                'direction' => 'pull',
                'method' => 'GET',
                'endpoint' => '/pipeline/prospects',
                'status' => $response->failed() ? 'failed' : 'success',
                'status_code' => $response->status(),
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
                'request_payload' => [],
                'response_payload' => $response->json() ?? ['body' => $response->body()],
                'requested_at' => now(),
                'meta' => ['dry_run' => $dryRun],
            ]);

            if ($response->failed()) {
                $this->error("{$business->display_name}: /pipeline/prospects returned {$response->status()}: {$response->body()}");

                return ['updated' => 0, 'skipped' => 0, 'failed' => 1];
            }
        } catch (Throwable $e) {
            $requestLogger->log([
                'business_id' => $business->id,
                'initiated_by_user_id' => null,
                'sync_job_id' => null,
                'actor_type' => 'server',
                'source' => 'iacrm.pull-stages',
                'direction' => 'pull',
                'method' => 'GET',
                'endpoint' => '/pipeline/prospects',
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

            return ['updated' => 0, 'skipped' => 0, 'failed' => 1];
        }

        /** @var array<int, array<string, mixed>> $iacrmProspects */
        $iacrmProspects = $response->json('data', []);

        if (empty($iacrmProspects)) {
            $this->line("{$business->display_name}: no prospects returned by IACRM.");

            return ['updated' => 0, 'skipped' => 0, 'failed' => 0];
        }

        $iacrmProspectMap = [];
        foreach ($iacrmProspects as $prospectPayload) {
            $id = $prospectPayload['iacrm_id'] ?? null;
            if ($id !== null) {
                $iacrmProspectMap[$id] = $prospectPayload;
            }
        }

        $localProspects = Prospect::query()
            ->where('business_id', $business->id)
            ->whereIn('iacrm_prospect_id', array_keys($iacrmProspectMap))
            ->whereNull('deleted_at')
            ->get();

        $updated = 0;
        $skipped = 0;

        $this->line("Reconciling {$business->display_name} prospect stages...");

        foreach ($localProspects as $prospect) {
            $iacrmPayload = $iacrmProspectMap[$prospect->iacrm_prospect_id] ?? null;

            if ($iacrmPayload === null) {
                $skipped++;
                continue;
            }

            $changed = $this->applyStageChange($prospect, $iacrmPayload, $dryRun);
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

        /** @var array<int, array<string, mixed>> $iacrmProspects */
        $iacrmProspects = $response->json('data', []);

        if (empty($iacrmProspects)) {
            $this->line('No prospects returned by IACRM.');

            return self::SUCCESS;
        }

        $iacrmProspectMap = [];
        foreach ($iacrmProspects as $prospectPayload) {
            $id = $prospectPayload['iacrm_id'] ?? null;
            if ($id !== null) {
                $iacrmProspectMap[$id] = $prospectPayload;
            }
        }

        $localProspects = Prospect::query()
            ->whereIn('iacrm_prospect_id', array_keys($iacrmProspectMap))
            ->whereNull('deleted_at')
            ->get();

        $updated = 0;
        $skipped = 0;

        foreach ($localProspects as $prospect) {
            $iacrmPayload = $iacrmProspectMap[$prospect->iacrm_prospect_id] ?? null;

            if ($iacrmPayload === null) {
                $skipped++;
                continue;
            }

            $changed = $this->applyStageChange($prospect, $iacrmPayload, $dryRun);
            $changed ? $updated++ : $skipped++;
        }

        $mode = $dryRun ? ' [DRY RUN]' : '';
        $this->info("Done{$mode} - {$updated} updated, {$skipped} already in sync.");
        Log::info("[IacrmPull] Done{$mode}", ['updated' => $updated, 'skipped' => $skipped, 'mode' => 'legacy']);

        return self::SUCCESS;
    }

    /**
     * @param array<string, mixed> $iacrmPayload
     */
    private function applyStageChange(Prospect $prospect, array $iacrmPayload, bool $dryRun): bool
    {
        $iacrmStage = trim((string) ($iacrmPayload['stage'] ?? ''));
        if ($iacrmStage === '') {
            return false;
        }

        $incomingProgressionStatus = $this->resolveIncomingProgressionStatus($iacrmPayload, $iacrmStage);
        $incomingStatusCode = $incomingProgressionStatus;
        $incomingStatusLabel = $iacrmStage;
        $currentStage = $prospect->pipeline_stage;
        $currentConversionStatus = $prospect->conversion_status;
        $syncedAt = now();
        $payloadAlreadySynced = $prospect->iacrm_status_code === $incomingStatusCode
            && $prospect->iacrm_status_label === $incomingStatusLabel
            && $prospect->progression_status === $incomingProgressionStatus;

        if (in_array($iacrmStage, self::ACTIVE_STAGES, true)) {
            if ($currentStage === $iacrmStage && $currentConversionStatus === 'open' && $payloadAlreadySynced) {
                if (! $dryRun) {
                    $this->refreshSyncTimestamp($prospect, $syncedAt, $iacrmPayload);
                }

                return false;
            }

            $this->line("  -> [{$prospect->contact_name}] {$currentStage}/{$currentConversionStatus} -> {$iacrmStage}/open");

            if (! $dryRun) {
                $prospect->update([
                    'pipeline_stage' => $iacrmStage,
                    'progression_status' => $incomingProgressionStatus,
                    'conversion_status' => 'open',
                    'iacrm_status_code' => $incomingStatusCode,
                    'iacrm_status_label' => $incomingStatusLabel,
                    'pipeline_stage_changed_at' => $syncedAt,
                    'converted_at' => null,
                    'lost_at' => null,
                    'last_synced_at' => $syncedAt,
                    'raw_iacrm_payload' => $iacrmPayload,
                ]);

                $prospect->statusHistory()->create([
                    'source_system' => 'iacrm',
                    'old_submission_status' => $prospect->submission_status,
                    'new_submission_status' => $prospect->submission_status,
                    'old_progression_status' => $currentStage,
                    'new_progression_status' => $incomingProgressionStatus,
                    'reason' => "Stage mis Ã  jour depuis IACRM : {$currentStage} â†’ {$iacrmStage}",
                    'payload_snapshot' => ['event' => 'iacrm_stage_pull', 'iacrm_payload' => $iacrmPayload],
                    'changed_by_user_id' => null,
                ]);
            }

            return true;
        }

        if ($iacrmStage === 'converted') {
            if ($currentConversionStatus === 'converted' && $payloadAlreadySynced) {
                if (! $dryRun) {
                    $this->refreshSyncTimestamp($prospect, $syncedAt, $iacrmPayload);
                }

                return false;
            }

            $this->line("  -> [{$prospect->contact_name}] converti (IACRM)");

            if (! $dryRun) {
                $prospect->update([
                    'conversion_status' => 'converted',
                    'converted_at' => $syncedAt,
                    'lost_at' => null,
                    'progression_status' => $incomingProgressionStatus,
                    'iacrm_status_code' => $incomingStatusCode,
                    'iacrm_status_label' => $incomingStatusLabel,
                    'last_synced_at' => $syncedAt,
                    'raw_iacrm_payload' => $iacrmPayload,
                ]);

                $prospect->statusHistory()->create([
                    'source_system' => 'iacrm',
                    'old_submission_status' => $prospect->submission_status,
                    'new_submission_status' => $prospect->submission_status,
                    'old_progression_status' => $currentStage,
                    'new_progression_status' => $incomingProgressionStatus,
                    'reason' => 'Prospect marquÃ© comme converti par IACRM.',
                    'payload_snapshot' => ['event' => 'iacrm_stage_pull', 'iacrm_payload' => $iacrmPayload],
                    'changed_by_user_id' => null,
                ]);
            }

            return true;
        }

        if ($iacrmStage === 'lost') {
            if ($currentConversionStatus === 'lost' && $payloadAlreadySynced) {
                if (! $dryRun) {
                    $this->refreshSyncTimestamp($prospect, $syncedAt, $iacrmPayload);
                }

                return false;
            }

            $this->line("  -> [{$prospect->contact_name}] perdu (IACRM)");

            if (! $dryRun) {
                $prospect->update([
                    'conversion_status' => 'lost',
                    'lost_at' => $syncedAt,
                    'converted_at' => null,
                    'progression_status' => $incomingProgressionStatus,
                    'iacrm_status_code' => $incomingStatusCode,
                    'iacrm_status_label' => $incomingStatusLabel,
                    'last_synced_at' => $syncedAt,
                    'raw_iacrm_payload' => $iacrmPayload,
                ]);

                $prospect->statusHistory()->create([
                    'source_system' => 'iacrm',
                    'old_submission_status' => $prospect->submission_status,
                    'new_submission_status' => $prospect->submission_status,
                    'old_progression_status' => $currentStage,
                    'new_progression_status' => $incomingProgressionStatus,
                    'reason' => 'Prospect marquÃ© comme perdu par IACRM.',
                    'payload_snapshot' => ['event' => 'iacrm_stage_pull', 'iacrm_payload' => $iacrmPayload],
                    'changed_by_user_id' => null,
                ]);
            }

            return true;
        }

        return false;
    }

    /**
     * @param array<string, mixed> $iacrmPayload
     */
    private function refreshSyncTimestamp(Prospect $prospect, Carbon $syncedAt, array $iacrmPayload): void
    {
        $updates = [
            'last_synced_at' => $syncedAt,
            'raw_iacrm_payload' => $iacrmPayload,
        ];

        if ($prospect->first_synced_at === null) {
            $updates['first_synced_at'] = $syncedAt;
        }

        $prospect->update($updates);
    }

    /**
     * @param array<string, mixed> $iacrmPayload
     */
    private function resolveIncomingProgressionStatus(array $iacrmPayload, string $iacrmStage): string
    {
        $progressionStatus = trim((string) ($iacrmPayload['progression_status'] ?? ''));

        return $progressionStatus !== '' ? $progressionStatus : $iacrmStage;
    }
}
