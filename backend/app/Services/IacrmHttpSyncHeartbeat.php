<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class IacrmHttpSyncHeartbeat
{
    public function runForRequest(Request $request): void
    {
        if (! config('iacrm.http_sync.enabled', true)) {
            return;
        }

        $tasks = $this->dueTasks($request);

        if ($tasks === []) {
            return;
        }

        $lock = Cache::lock(
            'iacrm:http-sync:lock',
            max(5, (int) config('iacrm.http_sync.lock_seconds', 20)),
        );

        if (! $lock->get()) {
            return;
        }

        try {
            foreach ($tasks as $task) {
                $this->markTaskRun($task['key']);

                try {
                    Artisan::call($task['command'], $task['parameters']);
                } catch (Throwable $exception) {
                    Log::warning('[IacrmHttpSyncHeartbeat] Task failed', [
                        'task' => $task['key'],
                        'command' => $task['command'],
                        'message' => $exception->getMessage(),
                    ]);
                }
            }
        } finally {
            $lock->release();
        }
    }

    /**
     * @return array<int, array{key: string, command: string, parameters: array<string, int|string>}>
     */
    private function dueTasks(Request $request): array
    {
        $tasks = [];

        if ($this->shouldRunPushSync($request)) {
            $tasks[] = [
                'key' => 'push',
                'command' => 'iacrm:sync',
                'parameters' => [
                    '--limit' => (int) config('iacrm.http_sync.job_limit', 10),
                ],
            ];
        }

        if ($this->isDue('pull_stages', (int) config('iacrm.http_sync.pull_interval_seconds', 60))) {
            $tasks[] = [
                'key' => 'pull_stages',
                'command' => 'iacrm:pull-stages',
                'parameters' => [],
            ];
        }

        if ($this->isDue('pull_invoices', (int) config('iacrm.http_sync.pull_interval_seconds', 60))) {
            $tasks[] = [
                'key' => 'pull_invoices',
                'command' => 'iacrm:pull-invoices',
                'parameters' => [],
            ];
        }

        return $tasks;
    }

    private function shouldRunPushSync(Request $request): bool
    {
        if ($this->isForcedPushRoute($request)) {
            return true;
        }

        return $this->isDue('push', (int) config('iacrm.http_sync.push_interval_seconds', 5));
    }

    private function isForcedPushRoute(Request $request): bool
    {
        return ($request->isMethod('post') && $request->is('api/v1/prospects'))
            || ($request->isMethod('delete') && $request->is('api/v1/prospects/*'))
            || ($request->isMethod('post') && $request->is('api/v1/sync/jobs/*/retry'))
            || ($request->isMethod('post') && $request->is('api/public/prospects'));
    }

    private function isDue(string $key, int $intervalSeconds): bool
    {
        $intervalSeconds = max(1, $intervalSeconds);
        $lastRun = Cache::get($this->cacheKey($key));

        if (! is_numeric($lastRun)) {
            return true;
        }

        return ((int) $lastRun + $intervalSeconds) <= now()->timestamp;
    }

    private function markTaskRun(string $key): void
    {
        Cache::put($this->cacheKey($key), now()->timestamp, now()->addDay());
    }

    private function cacheKey(string $key): string
    {
        return "iacrm:http-sync:last-run:{$key}";
    }
}
