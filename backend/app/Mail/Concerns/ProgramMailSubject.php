<?php

namespace App\Mail\Concerns;

/**
 * Subject line: {what happened — eye-catching lead} — {program name} - {business name}
 */
trait ProgramMailSubject
{
    protected function programMailSubject(string $whatHappened): string
    {
        $programName = trim((string) $this->program->name);
        if ($programName === '') {
            $programName = 'Program';
        }

        $business = trim($this->businessName);
        if ($business === '') {
            $business = 'Business';
        }

        return $whatHappened.' — '.$programName.' - '.$business;
    }
}
