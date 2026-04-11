<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Push new prospects to IACRM every minute
Schedule::command('iacrm:sync')->everyMinute()->withoutOverlapping();

// Pull stage changes from IACRM back into HD Parrainage every minute.
// This command is fast and idempotent, so avoid a scheduler mutex here:
// stale overlap locks were preventing local prospect stages from updating.
Schedule::command('iacrm:pull-stages')->everyMinute();

// Pull invoices from IACRM and create/update Transactions + award points when paid
Schedule::command('iacrm:pull-invoices')->everyMinute()->withoutOverlapping();
