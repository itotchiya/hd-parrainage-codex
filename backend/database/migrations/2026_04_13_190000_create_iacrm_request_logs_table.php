<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iacrm_request_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('initiated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('sync_job_id')->nullable()->constrained('sync_jobs')->nullOnDelete();
            $table->string('actor_type', 32);
            $table->string('source', 64);
            $table->string('direction', 16);
            $table->string('method', 16);
            $table->string('endpoint', 255);
            $table->string('status', 16);
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->text('error_message')->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->json('meta')->nullable();
            $table->timestampTz('requested_at')->nullable();
            $table->timestamps();

            $table->index(['business_id', 'created_at']);
            $table->index(['actor_type', 'direction', 'status']);
            $table->index(['source', 'method']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iacrm_request_logs');
    }
};
