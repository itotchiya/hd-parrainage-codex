<?php

// Frontend2-only routes. Keep this file isolated from the older frontend contracts.

use App\Http\Controllers\Api\Frontend2\Agents\Frontend2AgentController;
use App\Http\Controllers\Api\Frontend2\Dashboard\Frontend2DashboardController;
use App\Http\Controllers\Api\Frontend2\Exchanges\Frontend2ExchangeRequestController;
use App\Http\Controllers\Api\Frontend2\Points\Frontend2PointsController;
use App\Http\Controllers\Api\Frontend2\Programs\Frontend2ExchangePackController;
use App\Http\Controllers\Api\Frontend2\Programs\Frontend2ProgramController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/frontend2')->middleware('auth:sanctum')->group(function (): void {
    Route::get('/dashboard/summary', [Frontend2DashboardController::class, 'summary']);
    Route::get('/points/summary', [Frontend2PointsController::class, 'summary']);
    Route::get('/points/by-program', [Frontend2PointsController::class, 'byProgram']);

    Route::post('/agents/invite-with-program', [Frontend2AgentController::class, 'inviteWithProgram']);

    Route::post('/programs', [Frontend2ProgramController::class, 'store']);
    Route::patch('/programs/{programId}', [Frontend2ProgramController::class, 'update']);
    Route::post('/programs/{programId}/suspend', [Frontend2ProgramController::class, 'suspend']);
    Route::post('/programs/{programId}/reactivate', [Frontend2ProgramController::class, 'reactivate']);

    Route::post('/exchange-packs', [Frontend2ExchangePackController::class, 'store']);
    Route::put('/exchange-packs/{exchangePackId}', [Frontend2ExchangePackController::class, 'update']);
    Route::delete('/exchange-packs/{exchangePackId}', [Frontend2ExchangePackController::class, 'destroy']);

    Route::post('/exchange-requests/reward', [Frontend2ExchangeRequestController::class, 'storeReward']);
    Route::post('/exchange-requests/cash', [Frontend2ExchangeRequestController::class, 'storeCash']);
    Route::post('/exchange-requests/{exchangeRequestId}/approve', [Frontend2ExchangeRequestController::class, 'approve']);
    Route::post('/exchange-requests/{exchangeRequestId}/reject', [Frontend2ExchangeRequestController::class, 'reject']);
    Route::post('/exchange-requests/{exchangeRequestId}/processing', [Frontend2ExchangeRequestController::class, 'markProcessing']);
    Route::post('/exchange-requests/{exchangeRequestId}/complete', [Frontend2ExchangeRequestController::class, 'complete']);
    Route::post('/exchange-requests/{exchangeRequestId}/cancel', [Frontend2ExchangeRequestController::class, 'cancel']);
});
