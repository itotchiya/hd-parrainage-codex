<!doctype html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
    <h1 style="font-size: 20px; margin-bottom: 12px;">A program you are assigned to has been suspended</h1>
    <p style="margin: 0 0 8px;">
      Business: <strong>{{ $businessName }}</strong>
    </p>
    <p style="margin: 0 0 8px;">
      Program: <strong>{{ $program->name }}</strong>
    </p>
    @if($program->suspension_deadline_at)
      <p style="margin: 0 0 16px;">
        The business has suspended this program. The suspension period is tracked in your workspace; review details there for next steps.
      </p>
    @else
      <p style="margin: 0 0 16px;">
        The business has suspended this program. Open your workspace for the latest status.
      </p>
    @endif
    <p style="margin: 0;">
      <a href="{{ $programUrl }}" style="display: inline-block; padding: 10px 14px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px;">
        Open program
      </a>
    </p>
  </body>
</html>
