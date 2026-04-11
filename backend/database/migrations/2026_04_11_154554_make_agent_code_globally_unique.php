<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix duplicate agent codes by keeping the oldest agent per code
        // and updating the rest with random unique suffixes.
        $duplicates = DB::table('agents')
            ->select('agent_code')
            ->whereNotNull('agent_code')
            ->groupBy('agent_code')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('agent_code');

        foreach ($duplicates as $agentCode) {
            $agentIds = DB::table('agents')
                ->where('agent_code', $agentCode)
                ->orderBy('created_at', 'asc')
                ->pluck('id');

            // Keep the first (oldest) agent's code, update the rest.
            foreach ($agentIds->slice(1) as $agentId) {
                do {
                    $newCode = 'AGT-' . Str::upper(Str::random(8));
                    $exists = DB::table('agents')
                        ->where('agent_code', $newCode)
                        ->exists();
                } while ($exists);

                DB::table('agents')
                    ->where('id', $agentId)
                    ->update(['agent_code' => $newCode]);
            }
        }

        // Drop the old per-business unique index.
        Schema::table('agents', function (Blueprint $table): void {
            $table->dropUnique('agents_business_id_agent_code_unique');
        });

        // Add a new global unique index on agent_code.
        Schema::table('agents', function (Blueprint $table): void {
            $table->unique('agent_code', 'agents_agent_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table): void {
            $table->dropUnique('agents_agent_code_unique');
            $table->unique(['business_id', 'agent_code'], 'agents_business_id_agent_code_unique');
        });
    }
};
