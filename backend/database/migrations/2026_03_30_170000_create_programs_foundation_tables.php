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
        Schema::create('exchange_packs', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('active');
            $table->uuid('created_by_user_id')->nullable();
            $table->uuid('updated_by_user_id')->nullable();
            $table->timestampTz('archived_at')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->unique(['business_id', 'name'], 'exchange_packs_business_name_unique');
            $table->index(['business_id', 'status']);
        });

        Schema::create('exchange_pack_items', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('exchange_pack_id')->constrained('exchange_packs')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('item_type')->default('reward');
            $table->unsignedInteger('points_cost');
            $table->unsignedInteger('display_order')->default(1);
            $table->string('status')->default('active');
            $table->json('metadata')->nullable();
            $table->timestampTz('archived_at')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index(['exchange_pack_id', 'status']);
            $table->index(['exchange_pack_id', 'display_order']);
        });

        Schema::create('programs', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->string('slug');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('commission_type');
            $table->string('exchange_mode');
            $table->unsignedInteger('points_per_transaction')->nullable();
            $table->unsignedInteger('points_per_euro')->nullable();
            $table->foreignUuid('exchange_pack_id')->nullable()->constrained('exchange_packs')->nullOnDelete();
            $table->text('eligibility_criteria')->nullable();
            $table->unsignedInteger('rule_version')->default(1);
            $table->string('status')->default('draft');
            $table->timestampTz('starts_at')->nullable();
            $table->timestampTz('ends_at')->nullable();
            $table->timestampTz('activated_at')->nullable();
            $table->timestampTz('paused_at')->nullable();
            $table->timestampTz('archived_at')->nullable();
            $table->uuid('created_by_user_id')->nullable();
            $table->uuid('updated_by_user_id')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->unique(['business_id', 'slug'], 'programs_business_slug_unique');
            $table->index(['business_id', 'status']);
            $table->index('exchange_pack_id');
        });

        Schema::create('program_agent_assignments', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('program_id')->constrained('programs')->cascadeOnDelete();
            $table->foreignUuid('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('status')->default('active');
            $table->uuid('assigned_by_user_id')->nullable();
            $table->timestampTz('assigned_at')->nullable();
            $table->timestampTz('paused_at')->nullable();
            $table->timestampTz('removed_at')->nullable();
            $table->timestampsTz();

            $table->unique(['program_id', 'agent_id'], 'program_agent_assignments_unique');
            $table->index(['agent_id', 'status']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE programs ALTER COLUMN slug TYPE citext');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('program_agent_assignments');
        Schema::dropIfExists('programs');
        Schema::dropIfExists('exchange_pack_items');
        Schema::dropIfExists('exchange_packs');
    }
};
