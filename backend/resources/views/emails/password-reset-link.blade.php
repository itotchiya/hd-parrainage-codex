<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif;">
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
        <p style="margin-top: 0; font-size: 14px; color: #475569;">HD Parrainage</p>
        <h1 style="margin: 0 0 16px; font-size: 24px;">Reset your password</h1>
        <p style="margin: 0 0 16px; line-height: 1.6;">
            Hello {{ $user->display_name ?? 'there' }},
        </p>
        <p style="margin: 0 0 16px; line-height: 1.6;">
            We received a request to reset the password for your HD Parrainage account.
            Use the button below to choose a new password.
        </p>
        <p style="margin: 24px 0;">
            <a
                href="{{ $resetUrl }}"
                style="display: inline-block; padding: 12px 20px; border-radius: 10px; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700;"
            >Reset my password</a>
        </p>
        <p style="margin: 0 0 12px; line-height: 1.6;">
            If the button does not work, open this link:
        </p>
        <p style="margin: 0 0 16px; line-height: 1.6; word-break: break-all;">
            <a href="{{ $resetUrl }}" style="color: #2563eb;">{{ $resetUrl }}</a>
        </p>
        <p style="margin: 0; line-height: 1.6; color: #64748b;">
            If you did not request a password reset, you can safely ignore this email.
        </p>
    </div>
</body>
</html>
