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
        Schema::create('transactions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignUuid('program_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignUuid('agent_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignUuid('prospect_id')->nullable()->constrained()->cascadeOnUpdate()->nullOnDelete();
            $table->string('iacrm_transaction_id', 120)->nullable();
            $table->string('transaction_reference', 120);
            $table->string('product_name', 160);
            $table->decimal('amount', 14, 2);
            $table->char('currency_code', 3)->default('EUR');
            $table->string('status', 32)->default('detected');
            $table->string('invoice_status', 32)->nullable();
            $table->unsignedInteger('points_awarded')->nullable();
            $table->timestampTz('occurred_at');
            $table->timestampTz('recognized_at')->nullable();
            $table->timestampTz('validated_at')->nullable();
            $table->timestampTz('rejected_at')->nullable();
            $table->timestampTz('paid_at')->nullable();
            $table->timestampTz('last_synced_at')->nullable();
            $table->json('raw_iacrm_payload')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['business_id', 'status']);
            $table->index(['agent_id', 'status']);
            $table->index(['prospect_id']);
            $table->index(['occurred_at']);
            $table->unique(['transaction_reference']);
        });

        DB::statement("
            ALTER TABLE transactions
            ADD CONSTRAINT transactions_status_check
            CHECK (status IN ('detected', 'pending', 'validated', 'rejected', 'paid'))
        ");

        DB::statement("
            ALTER TABLE transactions
            ADD CONSTRAINT transactions_invoice_status_check
            CHECK (
                invoice_status IS NULL
                OR invoice_status IN ('pending', 'paid', 'unpaid', 'overdue')
            )
        ");

        DB::statement("
            CREATE UNIQUE INDEX transactions_iacrm_transaction_id_unique
            ON transactions (iacrm_transaction_id)
            WHERE iacrm_transaction_id IS NOT NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS transactions_iacrm_transaction_id_unique');
        Schema::dropIfExists('transactions');
    }
};
