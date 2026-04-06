<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->redirectGuestsTo(static function ($request): ?string {
            return $request->is('api/*') ? null : '/login';
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            static fn ($request, $exception): bool => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(
            static function (AuthenticationException $exception, $request) {
                if ($request->is('api/*')) {
                    return response()->json([
                        'message' => 'Unauthenticated.',
                    ], 401);
                }
            },
        );

        $exceptions->render(
            static function (TokenMismatchException $exception, $request) {
                if ($request->is('api/*')) {
                    return response()->json([
                        'code' => 'CSRF_TOKEN_MISMATCH',
                        'message' => 'The CSRF token is invalid or expired.',
                    ], 419);
                }
            },
        );
    })->create();
