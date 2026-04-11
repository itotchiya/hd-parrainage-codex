<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table): void {
            $table->string('iacrm_base_url')->nullable()->after('iacrm_business_id');
            $table->text('iacrm_api_key')->nullable()->after('iacrm_base_url');
            $table->boolean('iacrm_auto_sync_enabled')->default(false)->after('iacrm_api_key');
            $table->string('iacrm_connection_status')->default('untested')->after('iacrm_auto_sync_enabled');
            $table->timestampTz('iacrm_last_tested_at')->nullable()->after('iacrm_connection_status');
        });
    }

    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table): void {
            $table->dropColumn([
                'iacrm_base_url',
                'iacrm_api_key',
                'iacrm_auto_sync_enabled',
                'iacrm_connection_status',
                'iacrm_last_tested_at',
            ]);
        });
    }
};
