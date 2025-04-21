<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

// Rate limiter imports might still be needed if used elsewhere,
// but the definition code is in AppServiceProvider now.

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    );

// Rate limiter definitions are in AppServiceProvider->boot()

$app->withMiddleware(function (Middleware $middleware) {
        $middleware->group('api', [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class, // <-- MUST BE PRESENT
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ]);
        // ... other middleware configurations ...
    });

$app->withExceptions(function (Exceptions $exceptions) {
        // ... Exception handling configuration ...
    });

// --- FIX: Call ->create() before returning ---
return $app->create();
// --- End FIX ---