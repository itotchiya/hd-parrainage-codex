<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('pending_email')->nullable()->after('email');
            $table->string('pending_email_verification_code_hash', 64)->nullable()->after('pending_email');
            $table->timestampTz('pending_email_verification_sent_at')->nullable()->after('pending_email_verification_code_hash');
            $table->timestampTz('pending_email_verification_expires_at')->nullable()->after('pending_email_verification_sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'pending_email',
                'pending_email_verification_code_hash',
                'pending_email_verification_sent_at',
                'pending_email_verification_expires_at',
            ]);
        });
    }
};
