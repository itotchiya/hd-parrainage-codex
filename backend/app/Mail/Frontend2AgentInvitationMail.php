<?php

// Frontend2-only mail. Keep the prototype-specific invitation copy isolated from the older frontend invite flow.

namespace App\Mail;

use App\Models\Agent;
use App\Models\Program;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class Frontend2AgentInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Agent $agent,
        public Program $program,
        public string $activationUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Activate your HD Parrainage agent invitation',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.frontend2-agent-invitation',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
