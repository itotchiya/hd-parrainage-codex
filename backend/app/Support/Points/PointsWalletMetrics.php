<?php

namespace App\Support\Points;

use App\Models\ExchangeRequest;
use App\Models\PointsLedger;
use Illuminate\Support\Collection;

class PointsWalletMetrics
{
    /**
     * @param  Collection<int, PointsLedger>  $ledgerEntries
     * @param  Collection<int, ExchangeRequest>  $exchangeRequests
     * @return array{
     *     available_points:int,
     *     locked_points:int,
     *     consumed_points:int,
     *     reversed_points:int,
     *     active_exchange_request_count:int
     * }
     */
    public static function summarize(Collection $ledgerEntries, Collection $exchangeRequests): array
    {
        $rawAvailable = (int) $ledgerEntries
            ->where('entry_status', 'available')
            ->sum('points_delta');
        $reversedPoints = (int) abs((int) $ledgerEntries
            ->where('entry_status', 'reversed')
            ->sum('points_delta'));

        $ledgerByRequest = $ledgerEntries
            ->filter(fn (PointsLedger $entry): bool => $entry->exchange_request_id !== null)
            ->groupBy('exchange_request_id');

        $availabilityAdjustment = 0;
        $lockedPoints = 0;
        $consumedPoints = 0;
        $activeExchangeRequestCount = 0;

        foreach ($exchangeRequests as $exchangeRequest) {
            $snapshot = self::requestSnapshot(
                $exchangeRequest,
                $ledgerByRequest->get($exchangeRequest->id, collect()),
            );

            $availabilityAdjustment += $snapshot['availability_adjustment'];
            $lockedPoints += $snapshot['locked_points'];
            $consumedPoints += $snapshot['consumed_points'];

            if ($snapshot['is_active']) {
                $activeExchangeRequestCount += 1;
            }
        }

        return [
            'available_points' => max($rawAvailable + $availabilityAdjustment, 0),
            'locked_points' => max($lockedPoints, 0),
            'consumed_points' => max($consumedPoints, 0),
            'reversed_points' => $reversedPoints,
            'active_exchange_request_count' => $activeExchangeRequestCount,
        ];
    }

    /**
     * @param  Collection<int, PointsLedger>  $requestEntries
     * @return array{
     *     availability_adjustment:int,
     *     locked_points:int,
     *     consumed_points:int,
     *     is_active:bool
     * }
     */
    private static function requestSnapshot(ExchangeRequest $exchangeRequest, Collection $requestEntries): array
    {
        $availableNet = (int) $requestEntries
            ->where('entry_status', 'available')
            ->sum('points_delta');
        $lockedNet = (int) $requestEntries
            ->where('entry_status', 'locked')
            ->sum('points_delta');
        $consumedNet = (int) $requestEntries
            ->where('entry_status', 'consumed')
            ->sum('points_delta');

        return match ($exchangeRequest->status) {
            'requested', 'approved', 'processing' => [
                'availability_adjustment' => $availableNet < 0 ? 0 : -1 * self::effectiveLegacyLockedPoints($lockedNet, $availableNet, $exchangeRequest->points_amount),
                'locked_points' => self::effectiveLockedPoints($lockedNet, $availableNet, $exchangeRequest->points_amount),
                'consumed_points' => 0,
                'is_active' => true,
            ],
            'completed' => [
                'availability_adjustment' => $availableNet < 0 ? 0 : -1 * self::effectiveLegacyConsumedPoints($consumedNet, $lockedNet, $exchangeRequest->points_amount),
                'locked_points' => 0,
                'consumed_points' => self::effectiveConsumedPoints($consumedNet, $availableNet, $lockedNet, $exchangeRequest->points_amount),
                'is_active' => false,
            ],
            default => [
                'availability_adjustment' => 0,
                'locked_points' => 0,
                'consumed_points' => 0,
                'is_active' => false,
            ],
        };
    }

    private static function effectiveLockedPoints(int $lockedNet, int $availableNet, int $pointsAmount): int
    {
        if ($lockedNet > 0) {
            return $lockedNet;
        }

        if ($lockedNet < 0) {
            return abs($lockedNet);
        }

        if ($availableNet < 0) {
            return abs($availableNet);
        }

        return $pointsAmount > 0 ? $pointsAmount : 0;
    }

    private static function effectiveConsumedPoints(int $consumedNet, int $availableNet, int $lockedNet, int $pointsAmount): int
    {
        if ($consumedNet > 0) {
            return $consumedNet;
        }

        if ($consumedNet < 0) {
            return abs($consumedNet);
        }

        if ($availableNet < 0) {
            return abs($availableNet);
        }

        if ($lockedNet !== 0) {
            return abs($lockedNet);
        }

        return $pointsAmount > 0 ? $pointsAmount : 0;
    }

    private static function effectiveLegacyLockedPoints(int $lockedNet, int $availableNet, int $pointsAmount): int
    {
        if ($availableNet < 0) {
            return 0;
        }

        if ($lockedNet !== 0) {
            return abs($lockedNet);
        }

        return $pointsAmount > 0 ? $pointsAmount : 0;
    }

    private static function effectiveLegacyConsumedPoints(int $consumedNet, int $lockedNet, int $pointsAmount): int
    {
        if ($consumedNet !== 0) {
            return abs($consumedNet);
        }

        if ($lockedNet !== 0) {
            return abs($lockedNet);
        }

        return $pointsAmount > 0 ? $pointsAmount : 0;
    }
}
