<?php

namespace App\Console\Commands;

use App\Models\SyncJob;
use App\Services\IacrmSyncService;
use Illuminate\Console\Command;

class ProcessIacrmSyncJobs extends Command
{
    protected $signature   = 'iacrm:sync {--limit=50 : Max jobs to process per run}';
    protected $description = 'Process queued IACRM sync jobs and push data to the external CRM';

    public function handle(IacrmSyncService $service): int
    {
        if (! $service->isConfigured()) {
            $this->warn('IACRM is not configured (IACRM_BASE_URL / IACRM_API_KEY missing). Skipping.');
            return self::SUCCESS;
        }

        $limit = (int) $this->option('limit');

        $jobs = SyncJob::query()
            ->whereIn('status', ['queued', 'failed'])
            ->where(function ($q) {
                $q->whereNull('next_retry_at')
                  ->orWhere('next_retry_at', '<=', now());
            })
            ->where('attempt_count', '<', \DB::raw('max_attempts'))
            ->orderBy('queued_at')
            ->limit($limit)
            ->get();

        if ($jobs->isEmpty()) {
            $this->line('No pending sync jobs.');
            return self::SUCCESS;
        }

        $succeeded = 0;
        $failed    = 0;

        foreach ($jobs as $job) {
            $this->line("Processing [{$job->job_type}] job {$job->id}...");

            if ($service->process($job)) {
                $this->info("  ✓ Succeeded");
                $succeeded++;
            } else {
                $this->error("  ✗ Failed: {$job->failure_message}");
                $failed++;
            }
        }

        $this->line('');
        $this->info("Done — {$succeeded} succeeded, {$failed} failed.");
        return self::SUCCESS;
    }
}
