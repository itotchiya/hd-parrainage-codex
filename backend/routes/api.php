<?php

use App\Http\Controllers\Api\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Api\Auth\CurrentUserController;
use App\Http\Controllers\Api\Auth\InvitationActivationController;
use App\Http\Controllers\Api\Auth\PasswordRecoveryController;
use App\Http\Controllers\Api\Agents\AgentController;
use App\Http\Controllers\Api\Businesses\BusinessController;
use App\Http\Controllers\Api\Dashboard\BusinessDashboardController;
use App\Http\Controllers\Api\Exchanges\ExchangeRequestController;
use App\Http\Controllers\Api\Notifications\NotificationController;
use App\Http\Controllers\Api\Points\PointsController;
use App\Http\Controllers\Api\Programs\ExchangePackController;
use App\Http\Controllers\Api\Programs\ProgramAgentAssignmentController;
use App\Http\Controllers\Api\Programs\ProgramController;
use App\Http\Controllers\Api\Prospects\ProspectController;
use App\Http\Controllers\Api\Prospects\PublicProspectController;
use App\Http\Controllers\Api\Settings\SettingsController;
use App\Http\Controllers\Api\Sync\SyncJobController;
use App\Http\Controllers\Api\Transactions\TransactionController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->middleware('web')->group(function (): void {
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->middleware('guest');
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->middleware('auth:sanctum');
    Route::get('/me', CurrentUserController::class)->middleware('auth:sanctum');
    Route::post('/invitation/validate', [InvitationActivationController::class, 'validateToken'])->middleware('guest');
    Route::post('/invitation/activate', [InvitationActivationController::class, 'activate'])->middleware('guest');
    Route::post('/password/forgot', [PasswordRecoveryController::class, 'sendResetToken'])->middleware('guest');
    Route::post('/password/reset', [PasswordRecoveryController::class, 'reset'])->middleware('guest');
});

Route::get('/health', function (): array {
    return [
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
    ];
});

Route::prefix('v1')->middleware('auth:sanctum')->group(function (): void {
    Route::get('/businesses', [BusinessController::class, 'index']);
    Route::get('/businesses/{businessId}', [BusinessController::class, 'show']);
    Route::post('/businesses/{businessId}/approve', [BusinessController::class, 'approve']);
    Route::post('/businesses/{businessId}/reject', [BusinessController::class, 'reject']);
    Route::get('/dashboard/business-summary', [BusinessDashboardController::class, 'summary']);
    Route::get('/agents', [AgentController::class, 'index']);
    Route::get('/agents/{agentId}', [AgentController::class, 'show']);
    Route::post('/agents', [AgentController::class, 'store']);
    Route::post('/agents/{agentId}/suspend', [AgentController::class, 'suspend']);
    Route::post('/agents/{agentId}/reactivate', [AgentController::class, 'reactivate']);
    Route::get('/programs', [ProgramController::class, 'index']);
    Route::post('/programs', [ProgramController::class, 'store']);
    Route::get('/programs/{programId}', [ProgramController::class, 'show']);
    Route::patch('/programs/{programId}', [ProgramController::class, 'update']);
    Route::post('/programs/{programId}/activate', [ProgramController::class, 'activate']);
    Route::post('/programs/{programId}/pause', [ProgramController::class, 'pause']);
    Route::post('/programs/{programId}/reactivate', [ProgramController::class, 'reactivate']);
    Route::post('/programs/{programId}/suspend', [ProgramController::class, 'suspend']);
    Route::post('/programs/{programId}/archive', [ProgramController::class, 'archive']);
    Route::post('/programs/{programId}/delete', [ProgramController::class, 'deleteFromArchive']);
    Route::get('/programs/{programId}/agents', [ProgramAgentAssignmentController::class, 'index']);
    Route::put('/programs/{programId}/agents', [ProgramAgentAssignmentController::class, 'sync']);
    Route::get('/exchange-packs', [ExchangePackController::class, 'index']);
    Route::post('/exchange-packs', [ExchangePackController::class, 'store']);
    Route::get('/exchange-packs/{exchangePackId}', [ExchangePackController::class, 'show']);
    Route::patch('/exchange-packs/{exchangePackId}', [ExchangePackController::class, 'update']);
    Route::patch('/exchange-packs/{exchangePackId}/status', [ExchangePackController::class, 'updateStatus']);
    Route::delete('/exchange-packs/{exchangePackId}', [ExchangePackController::class, 'destroy']);
    Route::post('/exchange-packs/{exchangePackId}/notify-agents', [ExchangePackController::class, 'notifyAgents']);
    Route::post('/exchange-packs/{exchangePackId}/items', [ExchangePackController::class, 'storeItem']);
    Route::patch('/exchange-packs/{exchangePackId}/items/order', [ExchangePackController::class, 'reorderItems']);
    Route::patch('/exchange-packs/{exchangePackId}/items/{itemId}', [ExchangePackController::class, 'updateItem']);
    Route::delete('/exchange-packs/{exchangePackId}/items/{itemId}', [ExchangePackController::class, 'destroyItem']);
    Route::get('/prospects', [ProspectController::class, 'index']);
    Route::post('/prospects', [ProspectController::class, 'store']);
    Route::get('/prospects/deleted', [ProspectController::class, 'deleted']);
    Route::get('/prospects/{prospectId}', [ProspectController::class, 'show']);
    Route::delete('/prospects/{prospectId}', [ProspectController::class, 'destroy']);
    Route::get('/prospects/{prospectId}/history', [ProspectController::class, 'history']);
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::get('/transactions/summary', [TransactionController::class, 'summary']);
    Route::get('/transactions/{transactionId}', [TransactionController::class, 'show']);
    Route::get('/points/summary', [PointsController::class, 'summary']);
    Route::get('/points/ledger', [PointsController::class, 'ledger']);
    Route::get('/points/by-program', [PointsController::class, 'byProgram']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{notificationId}/read', [NotificationController::class, 'markRead']);
    Route::get('/sync/overview', [SyncJobController::class, 'overview']);
    Route::get('/sync/jobs', [SyncJobController::class, 'index']);
    Route::get('/sync/jobs/{jobId}', [SyncJobController::class, 'show']);
    Route::post('/sync/jobs/{jobId}/retry', [SyncJobController::class, 'retry']);
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::patch('/settings/own', [SettingsController::class, 'updateOwn']);
    Route::patch('/settings/business', [SettingsController::class, 'updateBusiness']);
    Route::get('/exchange-requests', [ExchangeRequestController::class, 'index']);
    Route::post('/exchange-requests/reward', [ExchangeRequestController::class, 'storeReward']);
    Route::post('/exchange-requests/cash', [ExchangeRequestController::class, 'storeCash']);
    Route::get('/exchange-requests/{exchangeRequestId}', [ExchangeRequestController::class, 'show']);
    Route::post('/exchange-requests/{exchangeRequestId}/approve', [ExchangeRequestController::class, 'approve']);
    Route::post('/exchange-requests/{exchangeRequestId}/reject', [ExchangeRequestController::class, 'reject']);
    Route::post('/exchange-requests/{exchangeRequestId}/processing', [ExchangeRequestController::class, 'markProcessing']);
    Route::post('/exchange-requests/{exchangeRequestId}/complete', [ExchangeRequestController::class, 'complete']);
    Route::post('/exchange-requests/{exchangeRequestId}/cancel', [ExchangeRequestController::class, 'cancel']);
});

Route::prefix('public')->group(function (): void {
    Route::get('/programs/{programId}/portal-info', [PublicProspectController::class, 'portalInfo']);
    Route::post('/prospects', [PublicProspectController::class, 'store']);
});

require __DIR__.'/api_frontend2.php';
