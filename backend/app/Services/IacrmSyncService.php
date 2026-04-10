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
                'iacrm.prospect.pull'    => $this->pullProspect($job),
                'iacrm.transaction.pull' => $this->pullTransactions($job),
                default                  => throw new \RuntimeException("Unknown job type: {$job->job_type}"),
            };

            $body = $response->json() ?? [];
            $statusCode = $response->status();

            // Log the full response for debugging
            Log::info("[IacrmSync] {$job->job_type} response", [
                'job_id' => $job->id,
                'status_code' => $statusCode,
                'response_body' => $body,
            ]);

            // If prospect.create succeeded, store the IACRM prospect ID back on the prospect
            if ($job->job_type === 'iacrm.prospect.create' && $response->successful()) {
                $iacrmId = $body['data']['iacrm_id'] ?? $body['iacrm_id'] ?? null;
                
                if ($iacrmId) {
                    Prospect::withoutTimestamps(function () use ($job, $iacrmId, $body) {
                        $prospect = Prospect::query()
                            ->whereKey($job->payload['prospect_id'] ?? null)
                            ->first();
                            
                        if ($prospect) {
                            $updateData = [
                                'iacrm_prospect_id' => $iacrmId,
                                'submission_status' => 'synced',
                                'iacrm_status_code' => $body['data']['status'] ?? $body['status'] ?? null,
                                'iacrm_status_label' => $body['data']['stage'] ?? $body['stage'] ?? null,
                                'last_synced_at'    => now(),
                            ];
                            
                            // Only set first_synced_at if not already set
                            if ($prospect->first_synced_at === null) {
                                $updateData['first_synced_at'] = now();
                            }
                            
                            $prospect->update($updateData);
                            
                            Log::info("[IacrmSync] Prospect updated successfully", [
                                'prospect_id' => $prospect->id,
                                'iacrm_id' => $iacrmId,
                                'submission_status' => 'synced',
                            ]);
                        } else {
                            Log::warning("[IacrmSync] Prospect not found for update", [
                                'prospect_id' => $job->payload['prospect_id'] ?? null,
                            ]);
                        }
                    });
                } else {
                    Log::warning("[IacrmSync] No iacrm_id in response", [
                        'job_id' => $job->id,
                        'response_body' => $body,
                    ]);
                }
            }

            $job->update([
                'status'           => 'succeeded',
                'finished_at'      => now(),
                'response_payload' => $body,
                'failure_code'     => null,
                'failure_message'  => null,
            ]);

            Log::info("[IacrmSync] {$job->job_type} succeeded", [
                'job_id' => $job->id, 
                'iacrm_id' => $body['data']['iacrm_id'] ?? $body['iacrm_id'] ?? null
            ]);
            return true;

        } catch (Throwable $e) {
            $attempts = $job->attempt_count;
            $dead     = $attempts >= $job->max_attempts;
            $errorMessage = $e->getMessage();

            // Update prospect status to sync_failed
            if ($job->job_type === 'iacrm.prospect.create') {
                Prospect::withoutTimestamps(function () use ($job, $errorMessage) {
                    Prospect::query()
                        ->whereKey($job->payload['prospect_id'] ?? null)
                        ->update([
                            'submission_status' => 'sync_failed',
                            'sync_error_message' => $errorMessage,
                        ]);
                });
            }

            $this->fail($job, 'exception', $errorMessage, $dead);
            Log::error("[IacrmSync] {$job->job_type} failed (attempt {$attempts}): {$errorMessage}", [
                'job_id' => $job->id,
                'exception' => $e->getTraceAsString(),
            ]);
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

        $payload = [
            'contact_name'   => $prospect->contact_name,
            'company_name'   => $prospect->company_name,
            'stage'          => $prospect->pipeline_stage ?? 'suspect',
            'assigned_agent' => $prospect->agent_id,
            'source'         => 'hd_parrainage',
            'source_id'      => $prospect->id,
        ];

        Log::info("[IacrmSync] Pushing prospect to IACRM", [
            'job_id' => $job->id,
            'prospect_id' => $prospect->id,
            'payload' => $payload,
        ]);

        return $this->post('/pipeline/prospects', $payload, $job);
    }

    private function pushProspectArchive(SyncJob $job): Response
    {
        $prospect = Prospect::withTrashed()->find($job->payload['prospect_id'] ?? null);
        $iacrmId  = $prospect?->iacrm_prospect_id;

        if (! $iacrmId) {
            // Nothing to archive in IACRM — mark as succeeded silently
            Log::info("[IacrmSync] No IACRM ID for prospect, skipping archive", [
                'job_id' => $job->id,
                'prospect_id' => $job->payload['prospect_id'] ?? null,
            ]);
            
            // Return a fake successful response
            return new Response(new \GuzzleHttp\Psr7\Response(200, [], json_encode(['success' => true])));
        }

        return $this->patch("/pipeline/prospects/{$iacrmId}/stage", [
            'stage'  => 'lost',
            'reason' => 'Archived in HD Parrainage',
        ], $job);
    }

    private function pullProspect(SyncJob $job): Response
    {
        // Stub: prospect pull is handled via webhooks or manual sync
        Log::info("[IacrmSync] Prospect pull is handled via webhooks", ['job_id' => $job->id]);
        return new Response(new \GuzzleHttp\Psr7\Response(200, [], json_encode(['success' => true, 'message' => 'Use webhooks for prospect sync'])));
    }

    private function pullTransactions(SyncJob $job): Response
    {
        // Stub: transaction pull is handled via webhooks or manual sync
        Log::info("[IacrmSync] Transaction pull is handled via webhooks", ['job_id' => $job->id]);
        return new Response(new \GuzzleHttp\Psr7\Response(200, [], json_encode(['success' => true, 'message' => 'Use webhooks for transaction sync'])));
    }

    // ─── HTTP helpers ─────────────────────────────────────────────────────────

    private function post(string $path, array $data, ?SyncJob $job = null): Response
    {
        return $this->request('POST', $path, $data, $job);
    }

    private function patch(string $path, array $data, ?SyncJob $job = null): Response
    {
        return $this->request('PATCH', $path, $data, $job);
    }

    private function request(string $method, string $path, array $data, ?SyncJob $job = null): Response
    {
        $url = $this->baseUrl . $path;

        Log::debug("[IacrmSync] HTTP {$method}", [
            'url'  => $url,
            'data' => $data,
        ]);

        $response = null;
        try {
            $http = Http::withHeaders([
                'X-IACRM-API-Key' => $this->apiKey,
                'Accept'          => 'application/json',
            ])->timeout(10);

            $response = match ($method) {
                'PATCH' => $http->patch($url, $data),
                default => $http->post($url, $data),
            };

            if ($response->failed()) {
                Log::error("[IacrmSync] HTTP {$method} failed", [
                    'url'    => $url,
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

                throw new \RuntimeException(
                    "IACRM API {$path} returned {$response->status()}: " . $response->body()
                );
            }

            return $response;
        } catch (Throwable $e) {
            throw $e;
        }
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
