<?php

namespace App\Services;

use App\Models\Prospect;
use App\Models\SyncJob;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class IacrmSyncService
{
    private ?string $baseUrl;
    private ?string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.iacrm.base_url', ''), '/') ?: null;
        $this->apiKey  = (string) config('services.iacrm.api_key', '') ?: null;
    }

    public function isConfigured(): bool
    {
        return $this->baseUrl !== null && $this->apiKey !== null;
    }

    /**
     * Process a single queued SyncJob. Returns true on success, false on failure.
     */
    public function process(SyncJob $job): bool
    {
        if (! $this->isConfigured()) {
            $this->fail($job, 'not_configured', 'IACRM_BASE_URL or IACRM_API_KEY is not set in backend config.');
            return false;
        }

        $job->update([
            'status'        => 'processing',
            'started_at'    => now(),
            'attempt_count' => $job->attempt_count + 1,
        ]);

        try {
            $response = match ($job->job_type) {
                'iacrm.prospect.create'  => $this->pushProspectCreate($job),
                'iacrm.prospect.archive' => $this->pushProspectArchive($job),
                default                  => throw new \RuntimeException("Unknown job type: {$job->job_type}"),
            };

            $body = $response->json() ?? [];

            // If prospect.create succeeded, store the IACRM prospect ID back on the prospect
            if ($job->job_type === 'iacrm.prospect.create' && $response->successful()) {
                $iacrmId = $body['data']['iacrm_id'] ?? null;
                if ($iacrmId) {
                    Prospect::withoutTimestamps(function () use ($job, $iacrmId) {
                        Prospect::query()
                            ->whereKey($job->payload['prospect_id'] ?? null)
                            ->update([
                                'iacrm_prospect_id' => $iacrmId,
                                'submission_status' => 'synced',
                                'first_synced_at'   => now(),
                                'last_synced_at'    => now(),
                            ]);
                    });
                }
            }

            $job->update([
                'status'           => 'succeeded',
                'finished_at'      => now(),
                'response_payload' => $body,
                'failure_code'     => null,
                'failure_message'  => null,
            ]);

            Log::info("[IacrmSync] {$job->job_type} succeeded", ['job_id' => $job->id, 'iacrm_id' => $body['data']['iacrm_id'] ?? null]);
            return true;

        } catch (Throwable $e) {
            $attempts = $job->attempt_count;
            $dead     = $attempts >= $job->max_attempts;

            $this->fail($job, 'exception', $e->getMessage(), $dead);
            Log::error("[IacrmSync] {$job->job_type} failed (attempt {$attempts}): {$e->getMessage()}", ['job_id' => $job->id]);
            return false;
        }
    }

    // ─── Handlers ────────────────────────────────────────────────────────────

    private function pushProspectCreate(SyncJob $job): Response
    {
        $prospect = Prospect::withTrashed()->find($job->payload['prospect_id'] ?? null);

        if (! $prospect) {
            throw new \RuntimeException('Prospect not found: ' . ($job->payload['prospect_id'] ?? 'null'));
        }

        return $this->post('/pipeline/prospects', [
            'contact_name'   => $prospect->contact_name,
            'company_name'   => $prospect->company_name,
            'stage'          => $prospect->pipeline_stage ?? 'suspect',
            'assigned_agent' => $prospect->agent_id,
        ]);
    }

    private function pushProspectArchive(SyncJob $job): Response
    {
        $prospect = Prospect::withTrashed()->find($job->payload['prospect_id'] ?? null);
        $iacrmId  = $prospect?->iacrm_prospect_id;

        if (! $iacrmId) {
            // Nothing to archive in IACRM — mark as succeeded silently
            return $this->post('/pipeline/prospects/' . ($job->payload['prospect_id'] ?? 'unknown') . '/stage', [
                'stage'  => 'lost',
                'reason' => 'Archived in HD Parrainage',
            ]);
        }

        return $this->post("/pipeline/prospects/{$iacrmId}/stage", [
            'stage'  => 'lost',
            'reason' => 'Archived in HD Parrainage',
        ]);
    }

    // ─── HTTP helpers ─────────────────────────────────────────────────────────

    private function post(string $path, array $data): Response
    {
        $response = Http::withHeaders([
            'X-IACRM-API-Key' => $this->apiKey,
            'Accept'          => 'application/json',
        ])->timeout(10)->post($this->baseUrl . $path, $data);

        if ($response->failed()) {
            throw new \RuntimeException(
                "IACRM API {$path} returned {$response->status()}: " . $response->body()
            );
        }

        return $response;
    }

    private function fail(SyncJob $job, string $code, string $message, bool $dead = false): void
    {
        $job->update([
            'status'          => $dead ? 'dead_lettered' : 'failed',
            'failure_code'    => $code,
            'failure_message' => $message,
            'failed_at'       => now(),
            'finished_at'     => now(),
            'next_retry_at'   => $dead ? null : now()->addSeconds(30 * (2 ** $job->attempt_count)),
        ]);
    }
}
