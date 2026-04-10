<?php

namespace App\Mail;

use App\Models\Business;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BusinessInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $owner,
        public Business $business,
        public string $activationUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Activate your HD Parrainage business account',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.business-invitation',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
