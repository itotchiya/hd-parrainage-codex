<!doctype html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
    <h1 style="font-size: 20px; margin-bottom: 12px;">You have been removed from a program</h1>
    <p style="margin: 0 0 8px;">
      Business: <strong>{{ $businessName }}</strong>
    </p>
    <p style="margin: 0 0 8px;">
      Program: <strong>{{ $program->name }}</strong>
    </p>
    <p style="margin: 0 0 16px;">
      Your access to this program has been removed by the business owner.
    </p>
    <p style="margin: 0;">
      <a href="{{ $programUrl }}" style="display: inline-block; padding: 10px 14px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px;">
        Open workspace
      </a>
    </p>
  </body>
  </html>
