<?php

namespace App\Support;

use Illuminate\Http\Request;

class FrontendUrlResolver
{
    public static function activationUrl(Request $request, string $email, string $token): string
    {
        $frontendUrl = self::fromRequest($request);

        return $frontendUrl.'/activate-invitation?email='.urlencode($email).'&token='.urlencode($token);
    }

    public static function passwordResetUrl(Request $request, string $email, string $token): string
    {
        $frontendUrl = self::fromRequest($request);

        return $frontendUrl.'/password/reset?email='.urlencode($email).'&token='.urlencode($token);
    }

    public static function verifyEmailUrl(Request $request): string
    {
        $frontendUrl = self::fromRequest($request);

        return $frontendUrl.'/verify-email';
    }

    /**
     * @param array<string, string> $query
     */
    public static function settingsUrl(Request $request, array $query = []): string
    {
        $frontendUrl = self::fromRequest($request);

        if ($query === []) {
            return $frontendUrl.'/settings';
        }

        return $frontendUrl.'/settings?'.http_build_query($query);
    }

    public static function isTrustedFrontendUrl(string $url): bool
    {
        $origin = self::originFromHeader($url);

        return $origin !== null && in_array($origin, self::trustedOrigins(), true);
    }

    public static function fromRequest(Request $request): string
    {
        $trustedOrigins = self::trustedOrigins();

        foreach (['X-HD-Frontend-Origin', 'Origin', 'Referer'] as $header) {
            $origin = self::originFromHeader((string) $request->headers->get($header, ''));

            if ($origin !== null && in_array($origin, $trustedOrigins, true)) {
                return $origin;
            }
        }

        return rtrim((string) config('app.frontend_url', 'http://localhost:5175'), '/');
    }

    /**
     * @return list<string>
     */
    private static function trustedOrigins(): array
    {
        $configuredOrigins = array_filter([
            (string) config('app.frontend_url', ''),
            (string) config('app.frontend2_url', ''),
            ...explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
        ]);

        $origins = array_map(
            static fn (string $origin): string => rtrim(trim($origin), '/'),
            $configuredOrigins,
        );

        return array_values(array_unique(array_filter($origins)));
    }

    private static function originFromHeader(string $value): ?string
    {
        $value = trim($value);

        if ($value === '') {
            return null;
        }

        $parts = parse_url($value);

        if (! is_array($parts) || ! isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        $origin = $parts['scheme'].'://'.$parts['host'];

        if (isset($parts['port'])) {
            $origin .= ':'.$parts['port'];
        }

        return rtrim($origin, '/');
    }
}
