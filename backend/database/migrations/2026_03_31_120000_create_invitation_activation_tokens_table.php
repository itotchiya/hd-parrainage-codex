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
        Schema::create('invitation_activation_tokens', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnUpdate()->cascadeOnDelete();
            $table->string('email');
            $table->string('token_digest', 64);
            $table->timestampTz('expires_at');
            $table->timestampTz('used_at')->nullable();
            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->cascadeOnUpdate()->nullOnDelete();
            $table->timestampsTz();

            $table->index(['user_id', 'used_at']);
            $table->index(['email', 'used_at']);
            $table->index('expires_at');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE invitation_activation_tokens ALTER COLUMN email TYPE citext');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invitation_activation_tokens');
    }
};
