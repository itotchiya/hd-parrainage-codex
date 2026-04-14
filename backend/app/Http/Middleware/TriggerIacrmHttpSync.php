<?php

namespace App\Http\Middleware;

use App\Services\IacrmHttpSyncHeartbeat;
use Illuminate\Http\Request;
use Closure;
use Symfony\Component\HttpFoundation\Response;

class TriggerIacrmHttpSync
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        return $response;
    }

    public function terminate(Request $request, Response $response): void
    {
        app(IacrmHttpSyncHeartbeat::class)->runForRequest($request);
    }
}
