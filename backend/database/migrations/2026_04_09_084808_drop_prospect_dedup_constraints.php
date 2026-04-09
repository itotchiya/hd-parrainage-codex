<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Allow the same contact to be submitted multiple times for the same program
     * (a client may want multiple services / re-engage at a later date).
     */
    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS prospects_active_phone_unique');
        DB::statement('DROP INDEX IF EXISTS prospects_active_email_unique');
    }

    public function down(): void
    {
        DB::statement('CREATE UNIQUE INDEX prospects_active_phone_unique ON prospects (business_id, program_id, contact_phone_e164) WHERE deleted_at IS NULL AND contact_phone_e164 IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX prospects_active_email_unique ON prospects (business_id, program_id, lower(contact_email)) WHERE deleted_at IS NULL AND contact_email IS NOT NULL');
    }
};
