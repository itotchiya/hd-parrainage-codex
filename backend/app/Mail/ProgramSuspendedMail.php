<?php

namespace App\Mail;

use App\Mail\Concerns\ProgramMailSubject;
use App\Models\Program;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProgramSuspendedMail extends Mailable
{
    use ProgramMailSubject;
    use Queueable, SerializesModels;

    public function __construct(
        public Program $program,
        public string $businessName,
        public string $programUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->programMailSubject('Program suspended (please review)'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.program-suspended',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
