<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sync_jobs', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('business_id')->nullable()->constrained('businesses')->nullOnDelete();
            $table->foreignUuid('initiated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('job_type', 80);
            $table->string('entity_type', 40);
            $table->uuid('entity_id')->nullable();
            $table->string('queue_name', 40)->default('sync-normal');
            $table->string('status', 24)->default('queued');
            $table->unsignedInteger('attempt_count')->default(0);
            $table->unsignedInteger('max_attempts')->default(5);
            $table->string('idempotency_key', 160)->unique();
            $table->string('failure_code', 80)->nullable();
            $table->text('failure_message')->nullable();
            $table->json('payload')->default(DB::raw("'{}'::jsonb"));
            $table->json('response_payload')->default(DB::raw("'{}'::jsonb"));
            $table->timestampTz('queued_at');
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('finished_at')->nullable();
            $table->timestampTz('failed_at')->nullable();
            $table->timestampTz('dead_lettered_at')->nullable();
            $table->timestampTz('next_retry_at')->nullable();
            $table->timestampsTz();

            $table->index(['business_id', 'status'], 'sync_jobs_business_status_idx');
            $table->index(['job_type', 'status'], 'sync_jobs_job_type_status_idx');
            $table->index(['entity_type', 'entity_id'], 'sync_jobs_entity_lookup_idx');
            $table->index(['queue_name', 'status'], 'sync_jobs_queue_status_idx');
            $table->index(['queued_at'], 'sync_jobs_queued_at_idx');
            $table->index(['next_retry_at'], 'sync_jobs_next_retry_idx');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE sync_jobs
                ADD CONSTRAINT chk_sync_jobs_status
                CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'dead_lettered', 'cancelled'))
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_jobs');
    }
};
