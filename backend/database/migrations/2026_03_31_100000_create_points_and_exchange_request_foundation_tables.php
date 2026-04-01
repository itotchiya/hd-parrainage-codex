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
        Schema::create('exchange_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignUuid('program_id')->nullable()->constrained()->cascadeOnUpdate()->nullOnDelete();
            $table->foreignUuid('agent_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignUuid('requested_by_user_id')->constrained('users')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignUuid('approved_by_user_id')->nullable()->constrained('users')->cascadeOnUpdate()->nullOnDelete();
            $table->foreignUuid('exchange_pack_item_id')->nullable()->constrained()->cascadeOnUpdate()->nullOnDelete();
            $table->string('request_type', 24);
            $table->string('status', 24)->default('requested');
            $table->unsignedInteger('points_amount');
            $table->decimal('cash_amount', 12, 2)->nullable();
            $table->char('currency_code', 3)->default('EUR');
            $table->string('requested_reward_title', 160)->nullable();
            $table->text('notes')->nullable();
            $table->timestampTz('requested_at');
            $table->timestampTz('approved_at')->nullable();
            $table->timestampTz('processed_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('cancelled_at')->nullable();
            $table->timestampTz('rejected_at')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['business_id', 'status']);
            $table->index(['agent_id', 'status']);
            $table->index(['program_id', 'status']);
        });

        DB::statement("
            ALTER TABLE exchange_requests
            ADD CONSTRAINT exchange_requests_request_type_check
            CHECK (request_type IN ('reward', 'cash'))
        ");

        DB::statement("
            ALTER TABLE exchange_requests
            ADD CONSTRAINT exchange_requests_status_check
            CHECK (status IN ('requested', 'approved', 'rejected', 'processing', 'completed', 'cancelled'))
        ");

        Schema::create('points_ledger', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignUuid('program_id')->nullable()->constrained()->cascadeOnUpdate()->nullOnDelete();
            $table->foreignUuid('agent_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignUuid('prospect_id')->nullable()->constrained()->cascadeOnUpdate()->nullOnDelete();
            $table->foreignUuid('transaction_id')->nullable()->constrained()->cascadeOnUpdate()->nullOnDelete();
            $table->foreignUuid('exchange_request_id')->nullable()->constrained()->cascadeOnUpdate()->nullOnDelete();
            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->cascadeOnUpdate()->nullOnDelete();
            $table->string('entry_type', 24);
            $table->string('entry_status', 24);
            $table->integer('points_delta');
            $table->string('source', 64);
            $table->string('description', 190)->nullable();
            $table->string('idempotency_key', 160);
            $table->timestampTz('effective_at');
            $table->timestampsTz();

            $table->index(['business_id', 'entry_status']);
            $table->index(['agent_id', 'entry_status']);
            $table->index(['program_id', 'entry_status']);
            $table->index(['effective_at']);
            $table->unique('idempotency_key');
        });

        DB::statement("
            ALTER TABLE points_ledger
            ADD CONSTRAINT points_ledger_entry_type_check
            CHECK (entry_type IN ('accrual', 'hold', 'release', 'spend', 'refund', 'adjustment', 'reversal'))
        ");

        DB::statement("
            ALTER TABLE points_ledger
            ADD CONSTRAINT points_ledger_entry_status_check
            CHECK (entry_status IN ('pending', 'available', 'locked', 'consumed', 'reversed'))
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('points_ledger');
        Schema::dropIfExists('exchange_requests');
    }
};
