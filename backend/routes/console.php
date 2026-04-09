<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Push new prospects to IACRM every minute
Schedule::command('iacrm:sync')->everyMinute()->withoutOverlapping();

// Pull stage changes from IACRM back into HD Parrainage every minute
Schedule::command('iacrm:pull-stages')->everyMinute()->withoutOverlapping();
