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
        Schema::create('prospects', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->foreignUuid('program_id')->constrained('programs')->cascadeOnDelete();
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->foreignUuid('submitted_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('contact_name');
            $table->string('contact_email')->nullable();
            $table->string('contact_phone_raw')->nullable();
            $table->string('contact_phone_e164')->nullable();
            $table->string('company_name')->nullable();
            $table->string('submission_status')->default('pending_sync');
            $table->string('pipeline_stage')->default('suspect');
            $table->string('progression_status')->nullable();
            $table->string('conversion_status')->default('open');
            $table->string('iacrm_prospect_id')->nullable();
            $table->string('iacrm_status_code')->nullable();
            $table->string('iacrm_status_label')->nullable();
            $table->timestampTz('last_synced_at')->nullable();
            $table->text('sync_error_message')->nullable();
            $table->string('source')->default('hd_parrainage');
            $table->timestampTz('submitted_at');
            $table->timestampTz('first_synced_at')->nullable();
            $table->timestampTz('pipeline_stage_changed_at')->nullable();
            $table->timestampTz('conversion_locked_at')->nullable();
            $table->timestampTz('converted_at')->nullable();
            $table->timestampTz('lost_at')->nullable();
            $table->foreignUuid('soft_deleted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('soft_delete_reason')->nullable();
            $table->json('raw_iacrm_payload')->default(DB::raw("'{}'::jsonb"));
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index(['business_id', 'submitted_at'], 'prospects_business_submitted_idx');
            $table->index(['agent_id', 'submitted_at'], 'prospects_agent_submitted_idx');
            $table->index(['program_id'], 'prospects_program_idx');
            $table->index(['business_id', 'pipeline_stage'], 'prospects_business_stage_idx');
            $table->index(['business_id', 'submission_status'], 'prospects_business_submission_idx');
        });

        Schema::create('prospect_status_history', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('prospect_id')->constrained('prospects')->cascadeOnDelete();
            $table->string('source_system');
            $table->string('old_submission_status')->nullable();
            $table->string('new_submission_status')->nullable();
            $table->string('old_progression_status')->nullable();
            $table->string('new_progression_status')->nullable();
            $table->text('reason')->nullable();
            $table->json('payload_snapshot')->default(DB::raw("'{}'::jsonb"));
            $table->foreignUuid('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->index(['prospect_id', 'created_at'], 'prospect_history_prospect_created_idx');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE prospects ADD CONSTRAINT chk_prospects_submission_status CHECK (submission_status IN ('pending_sync','synced','sync_failed','deleted'))");
            DB::statement("ALTER TABLE prospects ADD CONSTRAINT chk_prospects_pipeline_stage CHECK (pipeline_stage IN ('suspect','prospect_froid','prospect_tiede','prospect_chaud'))");
            DB::statement("ALTER TABLE prospects ADD CONSTRAINT chk_prospects_conversion_status CHECK (conversion_status IN ('open','converted','lost','locked'))");
            DB::statement('CREATE UNIQUE INDEX prospects_iacrm_prospect_id_unique ON prospects (iacrm_prospect_id) WHERE iacrm_prospect_id IS NOT NULL');
            DB::statement('CREATE UNIQUE INDEX prospects_active_phone_unique ON prospects (business_id, program_id, contact_phone_e164) WHERE deleted_at IS NULL AND contact_phone_e164 IS NOT NULL');
            DB::statement('CREATE UNIQUE INDEX prospects_active_email_unique ON prospects (business_id, program_id, lower(contact_email)) WHERE deleted_at IS NULL AND contact_email IS NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS prospects_active_email_unique');
            DB::statement('DROP INDEX IF EXISTS prospects_active_phone_unique');
            DB::statement('DROP INDEX IF EXISTS prospects_iacrm_prospect_id_unique');
        }

        Schema::dropIfExists('prospect_status_history');
        Schema::dropIfExists('prospects');
    }
};
