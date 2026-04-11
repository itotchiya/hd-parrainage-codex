<?php

namespace App\Services;

use App\Models\Business;
use Illuminate\Support\Collection;

class IacrmConfigResolver
{
    /** @var array<string, array{base_url: ?string, api_key: ?string, source: string}> */
    private array $businessCache = [];

    public function __construct(
        private readonly ?string $defaultBaseUrl = null,
        private readonly ?string $defaultApiKey = null,
    ) {
    }

    /**
     * @return array{base_url: ?string, api_key: ?string, source: string}
     */
    public function forBusiness(?string $businessId, bool $allowFallback = true): array
    {
        if ($businessId === null) {
            return $allowFallback ? $this->defaultConfig() : $this->missingConfig();
        }

        if (! array_key_exists($businessId, $this->businessCache)) {
            $business = Business::query()->find($businessId);
            $businessApiKey = $this->normalizeApiKey($business?->iacrm_api_key);
            $businessBaseUrl = $this->normalizeBaseUrl($business?->iacrm_base_url)
                ?? $this->normalizeBaseUrl($this->defaultBaseUrl ?? config('services.iacrm.base_url'));

            $this->businessCache[$businessId] = [
                'base_url' => $businessApiKey !== null ? $businessBaseUrl : null,
                'api_key' => $businessApiKey,
                'source' => $businessApiKey !== null ? 'business' : 'missing',
            ];
        }

        $config = $this->businessCache[$businessId];

        if ($config['base_url'] !== null && $config['api_key'] !== null) {
            return $config;
        }

        return $allowFallback ? $this->defaultConfig() : $this->missingConfig();
    }

    public function hasDefaultConfig(): bool
    {
        $config = $this->defaultConfig();

        return $config['base_url'] !== null && $config['api_key'] !== null;
    }

    /**
     * @return array{base_url: ?string, api_key: ?string, source: string}
     */
    public function defaultConfig(): array
    {
        return [
            'base_url' => $this->normalizeBaseUrl($this->defaultBaseUrl ?? config('services.iacrm.base_url')),
            'api_key' => $this->normalizeApiKey($this->defaultApiKey ?? config('services.iacrm.api_key')),
            'source' => 'env',
        ];
    }

    /**
     * @return Collection<int, Business>
     */
    public function businessesWithStoredCredentials(): Collection
    {
        return Business::query()
            ->whereNotNull('iacrm_api_key')
            ->orderBy('display_name')
            ->get();
    }

    /**
     * @return array{base_url: null, api_key: null, source: string}
     */
    private function missingConfig(): array
    {
        return [
            'base_url' => null,
            'api_key' => null,
            'source' => 'missing',
        ];
    }

    private function normalizeBaseUrl(mixed $value): ?string
    {
        $baseUrl = is_string($value) ? trim($value) : '';

        return $baseUrl !== '' ? rtrim($baseUrl, '/') : null;
    }

    private function normalizeApiKey(mixed $value): ?string
    {
        $apiKey = is_string($value) ? trim($value) : '';

        return $apiKey !== '' ? $apiKey : null;
    }
}
