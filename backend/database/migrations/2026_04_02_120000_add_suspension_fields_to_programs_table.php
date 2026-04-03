<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('programs', function (Blueprint $table): void {
            $table->timestampTz('suspended_at')->nullable()->after('paused_at');
            $table->timestampTz('suspension_deadline_at')->nullable()->after('suspended_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('programs', function (Blueprint $table): void {
            $table->dropColumn(['suspended_at', 'suspension_deadline_at']);
        });
    }
};

