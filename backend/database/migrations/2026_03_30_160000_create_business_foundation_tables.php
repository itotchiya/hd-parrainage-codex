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
        Schema::create('businesses', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('slug')->unique();
            $table->string('legal_name');
            $table->string('display_name');
            $table->string('industry')->nullable();
            $table->string('website_url')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->char('country_code', 2)->nullable();
            $table->char('currency_code', 3)->default('EUR');
            $table->string('timezone')->default('Europe/Paris');
            $table->string('status')->default('pending');
            $table->string('iacrm_business_id')->nullable()->unique();
            $table->timestampTz('approved_at')->nullable();
            $table->uuid('approved_by_user_id')->nullable();
            $table->timestampTz('rejected_at')->nullable();
            $table->uuid('rejected_by_user_id')->nullable();
            $table->timestampTz('suspended_at')->nullable();
            $table->timestampTz('archived_at')->nullable();
            $table->timestampTz('last_synced_at')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index('status');
        });

        Schema::create('business_user_assignments', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('assignment_type');
            $table->string('status')->default('invited');
            $table->boolean('is_primary')->default(false);
            $table->uuid('assigned_by_user_id')->nullable();
            $table->timestampTz('invited_at')->nullable();
            $table->timestampTz('activated_at')->nullable();
            $table->timestampTz('suspended_at')->nullable();
            $table->timestampTz('removed_at')->nullable();
            $table->timestampTz('starts_at')->nullable();
            $table->timestampTz('ends_at')->nullable();
            $table->timestampsTz();

            $table->unique(['business_id', 'user_id', 'assignment_type'], 'business_user_assignments_unique_assignment');
            $table->index('user_id');
        });

        Schema::create('agents', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('agent_code')->nullable();
            $table->string('status')->default('invited');
            $table->uuid('invited_by_user_id')->nullable();
            $table->timestampTz('invited_at')->nullable();
            $table->timestampTz('activated_at')->nullable();
            $table->timestampTz('suspended_at')->nullable();
            $table->timestampTz('archived_at')->nullable();
            $table->timestampTz('last_activity_at')->nullable();
            $table->text('notes')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->unique(['business_id', 'user_id']);
            $table->unique(['business_id', 'agent_code']);
            $table->index(['business_id', 'status']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE businesses ALTER COLUMN slug TYPE citext');
            DB::statement('ALTER TABLE businesses ALTER COLUMN contact_email TYPE citext');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agents');
        Schema::dropIfExists('business_user_assignments');
        Schema::dropIfExists('businesses');
    }
};
