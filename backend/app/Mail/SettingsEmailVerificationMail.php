<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SettingsEmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $verificationUrl,
        public string $verificationCode,
        public string $targetEmail,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verify your HD Parrainage email address',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.settings-email-verification',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
