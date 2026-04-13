<?php

namespace App\Http\Middleware;

use App\Services\IacrmHttpSyncHeartbeat;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TriggerIacrmHttpSync
{
    public function terminate(Request $request, Response $response): void
    {
        app(IacrmHttpSyncHeartbeat::class)->runForRequest($request);
    }
}
