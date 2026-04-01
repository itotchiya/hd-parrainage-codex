<?php

namespace App\Mail;

use App\Models\Agent;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AgentInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Agent $agent,
        public string $activationUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Activate your HD Parrainage invitation',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.agent-invitation',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
