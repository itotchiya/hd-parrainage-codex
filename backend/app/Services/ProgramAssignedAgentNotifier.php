<?php

namespace App\Services;

use App\Mail\ProgramAssignmentMail;
use App\Mail\ProgramPausedMail;
use App\Mail\ProgramResumedMail;
use App\Mail\ProgramRewardsUpdatedMail;
use App\Mail\ProgramSuspendedMail;
use App\Models\AppNotification;
use App\Models\Program;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends one in-app notification per assigned agent on each controller action (no deduplication).
 *
 * **Email delivery:** Program-agent mail is always sent **synchronously** in the same HTTP request
 * (`Mail::send`), with an optional sleep between recipients (`MAIL_PROGRAM_AGENT_STAGGER_SECONDS`) to
 * smooth bursts for ESPs (e.g. Resend). We do **not** use `Mail::later()` here: queued mail only sends
 * when `queue:work` runs; in-app notifications are written to the DB immediately, so relying on the
 * queue made it look like “notifications work but emails stop after the first” when no worker was
 * processing later jobs (or jobs failed and sat in `failed_jobs`).
 *
 * Optional: set `MAIL_PROGRAM_AGENT_USE_QUEUE=true` to defer sends to the queue (advanced; requires
 * a healthy worker and monitoring of `jobs` / `failed_jobs`).
 *
 * Assignment email/notification while status is draft is skipped in ProgramAgentAssignmentController;
 * when the program goes active, use notifyAssignmentForAllActiveAgents() so agents get one assignment notice.
 */
class ProgramAssignedAgentNotifier
{
    /**
     * @param  array<string, mixed>  $logContext
     */
    public static function deliverProgramAgentMail(
        string $email,
        int $recipientIndex,
        Mailable $mailable,
        string $logMessage,
        array $logContext = [],
    ): void {
        $staggerSec = max(0, (int) config('mail.program_agent_bulk_stagger_seconds', 3));
        $useQueue = filter_var(config('mail.program_agent_use_queue', false), FILTER_VALIDATE_BOOLEAN);

        try {
            if ($useQueue) {
                Mail::to($email)->later(now()->addSeconds($recipientIndex * $staggerSec), $mailable);

                return;
            }

            if ($recipientIndex > 0 && $staggerSec > 0) {
                usleep($staggerSec * 1_000_000);
            }

            Mail::to($email)->send($mailable);
        } catch (Throwable $exception) {
            Log::error($logMessage, array_merge($logContext, ['error' => $exception->getMessage()]));
        }
    }

    /**
     * After draft → active: same notification + mail as a fresh assignment (agents were not notified while draft).
     */
    public static function notifyAssignmentForAllActiveAgents(Program $program): void
    {
        $mailStaggerIndex = 0;
        self::eachAssignedAgent($program, function (
            Program $loaded,
            string $businessName,
            string $programUrl,
            string $userId,
            ?string $email,
            string $agentId,
        ) use (&$mailStaggerIndex): void {
            AppNotification::query()->create([
                'recipient_user_id' => $userId,
                'business_id' => $loaded->business_id,
                'notification_type' => 'program',
                'title' => 'Program assigned',
                'message' => sprintf('You were assigned to program "%s".', $loaded->name),
                'severity' => 'info',
                'metadata' => [
                    'event' => 'program_assigned',
                    'program_id' => $loaded->id,
                    'agent_id' => $agentId,
                ],
                'read_at' => null,
            ]);

            if ($email === null || $email === '') {
                return;
            }

            self::deliverProgramAgentMail(
                $email,
                $mailStaggerIndex,
                new ProgramAssignmentMail($loaded, $businessName, $programUrl),
                'Program assignment email delivery failed.',
                ['program_id' => $loaded->id, 'agent_id' => $agentId, 'email' => $email],
            );
            $mailStaggerIndex++;
        });
    }

    /** Paused or suspended → active (POST …/reactivate). */
    public static function notifyResumed(Program $program): void
    {
        $mailStaggerIndex = 0;
        self::eachAssignedAgent($program, function (
            Program $loaded,
            string $businessName,
            string $programUrl,
            string $userId,
            ?string $email,
            string $agentId,
        ) use (&$mailStaggerIndex): void {
            AppNotification::query()->create([
                'recipient_user_id' => $userId,
                'business_id' => $loaded->business_id,
                'notification_type' => 'program',
                'title' => 'Program resumed',
                'message' => sprintf('Program "%s" has been resumed by the business.', $loaded->name),
                'severity' => 'info',
                'metadata' => [
                    'event' => 'program_resumed',
                    'program_id' => $loaded->id,
                ],
                'read_at' => null,
            ]);

            if ($email === null || $email === '') {
                return;
            }

            self::deliverProgramAgentMail(
                $email,
                $mailStaggerIndex,
                new ProgramResumedMail($loaded, $businessName, $programUrl),
                'Program resumed email delivery failed.',
                ['program_id' => $loaded->id, 'email' => $email],
            );
            $mailStaggerIndex++;
        });
    }

    public static function notifyPaused(Program $program): void
    {
        $mailStaggerIndex = 0;
        self::eachAssignedAgent($program, function (
            Program $loaded,
            string $businessName,
            string $programUrl,
            string $userId,
            ?string $email,
            string $agentId,
        ) use (&$mailStaggerIndex): void {
            AppNotification::query()->create([
                'recipient_user_id' => $userId,
                'business_id' => $loaded->business_id,
                'notification_type' => 'program',
                'title' => 'Program paused',
                'message' => sprintf('Program "%s" has been paused by the business.', $loaded->name),
                'severity' => 'info',
                'metadata' => [
                    'event' => 'program_paused',
                    'program_id' => $loaded->id,
                ],
                'read_at' => null,
            ]);

            if ($email === null || $email === '') {
                return;
            }

            self::deliverProgramAgentMail(
                $email,
                $mailStaggerIndex,
                new ProgramPausedMail($loaded, $businessName, $programUrl),
                'Program paused email delivery failed.',
                ['program_id' => $loaded->id, 'email' => $email],
            );
            $mailStaggerIndex++;
        });
    }

    public static function notifySuspended(Program $program): void
    {
        $mailStaggerIndex = 0;
        self::eachAssignedAgent($program, function (
            Program $loaded,
            string $businessName,
            string $programUrl,
            string $userId,
            ?string $email,
            string $agentId,
        ) use (&$mailStaggerIndex): void {
            $deadline = $loaded->suspension_deadline_at;
            $deadlineText = $deadline !== null
                ? $deadline->timezone(config('app.timezone'))->toIso8601String()
                : null;

            AppNotification::query()->create([
                'recipient_user_id' => $userId,
                'business_id' => $loaded->business_id,
                'notification_type' => 'program',
                'title' => 'Program suspended',
                'message' => sprintf(
                    'Program "%s" has been suspended by the business.%s',
                    $loaded->name,
                    $deadline !== null
                        ? ' Review the suspension period in your workspace.'
                        : ''
                ),
                'severity' => 'warning',
                'metadata' => [
                    'event' => 'program_suspended',
                    'program_id' => $loaded->id,
                    'suspension_deadline_at' => $deadlineText,
                ],
                'read_at' => null,
            ]);

            if ($email === null || $email === '') {
                return;
            }

            self::deliverProgramAgentMail(
                $email,
                $mailStaggerIndex,
                new ProgramSuspendedMail($loaded, $businessName, $programUrl),
                'Program suspended email delivery failed.',
                ['program_id' => $loaded->id, 'email' => $email],
            );
            $mailStaggerIndex++;
        });
    }

    public static function notifyRewardsUpdated(Program $program): void
    {
        $mailStaggerIndex = 0;
        self::eachAssignedAgent($program, function (
            Program $loaded,
            string $businessName,
            string $programUrl,
            string $userId,
            ?string $email,
            string $agentId,
        ) use (&$mailStaggerIndex): void {
            $packName = $loaded->exchangePack?->name;

            AppNotification::query()->create([
                'recipient_user_id' => $userId,
                'business_id' => $loaded->business_id,
                'notification_type' => 'program',
                'title' => 'Program rewards updated',
                'message' => $packName !== null
                    ? sprintf('Rewards for program "%s" were updated (pack: %s).', $loaded->name, $packName)
                    : sprintf('Rewards for program "%s" were updated.', $loaded->name),
                'severity' => 'info',
                'metadata' => [
                    'event' => 'program_rewards_updated',
                    'program_id' => $loaded->id,
                    'exchange_pack_id' => $loaded->exchange_pack_id,
                ],
                'read_at' => null,
            ]);

            if ($email === null || $email === '') {
                return;
            }

            self::deliverProgramAgentMail(
                $email,
                $mailStaggerIndex,
                new ProgramRewardsUpdatedMail($loaded, $businessName, $programUrl),
                'Program rewards updated email delivery failed.',
                ['program_id' => $loaded->id, 'email' => $email],
            );
            $mailStaggerIndex++;
        });
    }

    /**
     * @param  callable(Program, string, string, string, ?string, string): void  $callback  Agent id is last argument.
     */
    private static function eachAssignedAgent(Program $program, callable $callback): void
    {
        $loaded = Program::query()
            ->whereKey($program->getKey())
            ->with([
                'business',
                'exchangePack',
                'agentAssignments' => function ($relation): void {
                    $relation
                        ->where('status', 'active')
                        ->with(['agent.user']);
                },
            ])
            ->firstOrFail();

        if ($loaded->agentAssignments->isEmpty()) {
            return;
        }

        $businessName = $loaded->business?->display_name ?? 'Business';
        $programUrl = self::buildProgramUrl($loaded->id);

        foreach ($loaded->agentAssignments as $assignment) {
            $agent = $assignment->agent;
            if ($agent === null || $agent->user_id === null) {
                continue;
            }

            $user = $agent->user;
            $email = $user?->email;

            $callback($loaded, $businessName, $programUrl, $agent->user_id, $email, $agent->id);
        }
    }

    private static function buildProgramUrl(string $programId): string
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5175'), '/');

        return $frontendUrl.'/programs/'.$programId;
    }
}
