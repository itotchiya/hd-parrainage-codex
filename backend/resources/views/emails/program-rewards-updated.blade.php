<!doctype html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
    <h1 style="font-size: 20px; margin-bottom: 12px;">Program rewards have been updated</h1>
    <p style="margin: 0 0 8px;">
      Business: <strong>{{ $businessName }}</strong>
    </p>
    <p style="margin: 0 0 8px;">
      Program: <strong>{{ $program->name }}</strong>
    </p>
    @if($program->exchangePack)
      <p style="margin: 0 0 8px;">
        Current reward pack: <strong>{{ $program->exchangePack->name }}</strong>
      </p>
    @endif
    <p style="margin: 0 0 16px;">
      The business owner updated the rewards (gift pack) for this program. Check the program page for full details.
    </p>
    <p style="margin: 0;">
      <a href="{{ $programUrl }}" style="display: inline-block; padding: 10px 14px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px;">
        Open program
      </a>
    </p>
  </body>
</html>
