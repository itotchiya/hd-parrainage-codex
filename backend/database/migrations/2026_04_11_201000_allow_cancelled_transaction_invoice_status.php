<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_invoice_status_check');

        DB::statement("
            ALTER TABLE transactions
            ADD CONSTRAINT transactions_invoice_status_check
            CHECK (
                invoice_status IS NULL
                OR invoice_status IN ('pending', 'paid', 'unpaid', 'overdue', 'cancelled')
            )
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_invoice_status_check');

        DB::statement("
            ALTER TABLE transactions
            ADD CONSTRAINT transactions_invoice_status_check
            CHECK (
                invoice_status IS NULL
                OR invoice_status IN ('pending', 'paid', 'unpaid', 'overdue')
            )
        ");
    }
};
