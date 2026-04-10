<?php

namespace App\Console\Commands;

use App\Models\Prospect;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixProspectSyncStatus extends Command
{
    protected $signature = 'prospect:fix-sync-status {--dry-run : Show what would be changed without making changes}';
    protected $description = 'Fix prospect sync status for prospects that exist in IACRM but show as pending in Parrainage';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        // Find prospects that:
        // 1. Have iacrm_prospect_id (meaning they were synced)
        // 2. But still have submission_status as 'pending_sync'
        $prospectsToFix = Prospect::query()
            ->whereNotNull('iacrm_prospect_id')
            ->where('submission_status', 'pending_sync')
            ->get();

        if ($prospectsToFix->isEmpty()) {
            $this->info('No prospects found with mismatched sync status.');
            return self::SUCCESS;
        }

        $this->info("Found {$prospectsToFix->count()} prospects with sync status mismatch:");
        $this->newLine();

        foreach ($prospectsToFix as $prospect) {
            $this->line("  - {$prospect->contact_name} ({$prospect->id})");
            $this->line("    Current status: {$prospect->submission_status}");
            $this->line("    IACRM ID: {$prospect->iacrm_prospect_id}");

            if (!$dryRun) {
                $prospect->update([
                    'submission_status' => 'synced',
                    'first_synced_at' => $prospect->first_synced_at ?? now(),
                    'last_synced_at' => now(),
                ]);
                $this->info("    Status updated to: synced");
            } else {
                $this->info("    [DRY RUN] Would update to: synced");
            }
            $this->newLine();
        }

        if ($dryRun) {
            $this->warn('This was a dry run. No changes were made.');
            $this->info('Run without --dry-run to apply fixes.');
        } else {
            $this->info("Fixed {$prospectsToFix->count()} prospects.");
        }

        return self::SUCCESS;
    }
}
