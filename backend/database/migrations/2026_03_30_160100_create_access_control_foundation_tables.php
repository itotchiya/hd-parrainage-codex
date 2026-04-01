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
        Schema::create('roles', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->string('status')->default('active');
            $table->uuid('created_by_user_id')->nullable();
            $table->uuid('updated_by_user_id')->nullable();
            $table->timestampTz('archived_at')->nullable();
            $table->timestampsTz();

            $table->index(['is_system', 'status']);
        });

        Schema::create('permissions', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('permission_id')->unique();
            $table->string('resource');
            $table->string('action');
            $table->text('description');
            $table->boolean('is_system')->default(false);
            $table->timestampsTz();

            $table->index(['resource', 'action']);
        });

        Schema::create('role_permissions', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignUuid('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->uuid('created_by_user_id')->nullable();
            $table->timestampTz('created_at')->default(DB::raw('CURRENT_TIMESTAMP'));

            $table->unique(['role_id', 'permission_id']);
            $table->index('permission_id');
        });

        Schema::create('user_roles', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('role_id')->constrained('roles')->cascadeOnDelete();
            $table->string('scope_type')->default('global');
            $table->foreignUuid('business_id')->nullable()->constrained('businesses')->nullOnDelete();
            $table->uuid('assigned_by_user_id')->nullable();
            $table->timestampTz('assigned_at')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->timestampTz('expires_at')->nullable();
            $table->string('status')->default('active');
            $table->timestampsTz();

            $table->unique(['user_id', 'role_id', 'scope_type', 'business_id'], 'user_roles_unique_scope');
            $table->index(['user_id', 'status']);
            $table->index('business_id');
        });

        Schema::create('user_permission_overrides', function (Blueprint $table): void {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->string('effect');
            $table->string('scope_type')->default('global');
            $table->foreignUuid('business_id')->nullable()->constrained('businesses')->nullOnDelete();
            $table->uuid('program_id')->nullable();
            $table->text('reason')->nullable();
            $table->timestampTz('active_from')->nullable();
            $table->timestampTz('active_until')->nullable();
            $table->uuid('created_by_user_id')->nullable();
            $table->timestampsTz();

            $table->unique(
                ['user_id', 'permission_id', 'scope_type', 'business_id', 'program_id'],
                'user_permission_overrides_unique_scope'
            );
            $table->index('program_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE roles ALTER COLUMN slug TYPE citext');
            DB::statement('ALTER TABLE permissions ALTER COLUMN permission_id TYPE citext');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_permission_overrides');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
