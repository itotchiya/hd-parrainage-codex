<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Verify your email address</title>
</head>
<body style="margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif;">
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
        <p style="margin-top: 0; font-size: 14px; color: #475569;">HD Parrainage</p>
        <h1 style="margin: 0 0 16px; font-size: 24px;">Verify your email address</h1>
        <p style="margin: 0 0 16px; line-height: 1.6;">
            Hello {{ $user->display_name ?? 'there' }},
        </p>
        <p style="margin: 0 0 16px; line-height: 1.6;">
            You requested an email verification for <strong>{{ $targetEmail }}</strong> on your HD Parrainage profile. You can verify it with the secure link below or with the 6-digit code.
        </p>
        <p style="margin: 24px 0;">
            <a
                href="{{ $verificationUrl }}"
                style="display: inline-block; padding: 12px 20px; border-radius: 10px; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700;"
            >Verify my email</a>
        </p>
        <p style="margin: 0 0 12px; line-height: 1.6;">
            If the button does not work, open this link:
        </p>
        <p style="margin: 0 0 16px; line-height: 1.6; word-break: break-all;">
            <a href="{{ $verificationUrl }}" style="color: #2563eb;">{{ $verificationUrl }}</a>
        </p>
        <div style="margin: 0 0 20px; padding: 20px; border-radius: 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b;">
                Verification code
            </p>
            <p style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.4em; color: #0f172a;">
                {{ $verificationCode }}
            </p>
            <p style="margin: 12px 0 0; line-height: 1.6; color: #64748b;">
                This code expires in 15 minutes.
            </p>
        </div>
        <p style="margin: 0; line-height: 1.6; color: #64748b;">
            If you did not request this change, contact the platform operator immediately.
        </p>
    </div>
</body>
</html>
