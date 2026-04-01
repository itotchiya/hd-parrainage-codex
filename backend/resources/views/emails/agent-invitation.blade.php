<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Activate your invitation</title>
</head>
<body style="margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif;">
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
        <p style="margin-top: 0; font-size: 14px; color: #475569;">HD Parrainage</p>
        <h1 style="margin: 0 0 16px; font-size: 24px;">Activate your invitation</h1>
        <p style="margin: 0 0 16px; line-height: 1.6;">
            Hello {{ $agent->user?->display_name ?? 'there' }},
        </p>
        <p style="margin: 0 0 16px; line-height: 1.6;">
            You have been invited to join the HD Parrainage workspace for
            <strong>{{ $agent->business?->name ?? 'your business' }}</strong>.
            Use the button below to activate your account and create your password.
        </p>
        <p style="margin: 24px 0;">
            <a
                href="{{ $activationUrl }}"
                style="display: inline-block; padding: 12px 20px; border-radius: 10px; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700;"
            >Activate my account</a>
        </p>
        <p style="margin: 0 0 12px; line-height: 1.6;">
            If the button does not work, open this link:
        </p>
        <p style="margin: 0 0 16px; line-height: 1.6; word-break: break-all;">
            <a href="{{ $activationUrl }}" style="color: #2563eb;">{{ $activationUrl }}</a>
        </p>
        <p style="margin: 0; line-height: 1.6; color: #64748b;">
            This invitation link expires in 14 days.
        </p>
    </div>
</body>
</html>
