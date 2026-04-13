import { useCallback, useEffect, useMemo, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'

import type { AppNotificationRecord } from '@/types/notifications'

export const OWNER_IDLE_REFRESH_MS = 15_000
export const OWNER_BURST_REFRESH_MS = 5_000
export const OWNER_BURST_DURATION_MS = 60_000

const ownerRefreshEvents = new Set([
  'agent_invited',
  'agent_activation',
  'agent_suspended',
  'agent_reactivated',
])

const ownerRefreshQueryKeys: ReadonlyArray<readonly string[]> = [
  ['agents'],
  ['dashboard', 'business-summary'],
  ['dashboard', 'agents'],
]

function isDocumentVisible() {
  if (typeof document === 'undefined') {
    return true
  }

  return document.visibilityState === 'visible'
}

export function isOwnerRefreshNotification(record: AppNotificationRecord) {
  const event = typeof record.metadata?.event === 'string' ? record.metadata.event : null

  if (event && ownerRefreshEvents.has(event)) {
    return true
  }

  return record.notification_type === 'agent' || record.notification_type === 'business'
}

export async function invalidateOwnerRefreshQueries(queryClient: QueryClient) {
  await Promise.all(
    ownerRefreshQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] })),
  )
}

export function useOwnerRefreshPolicy(enabled: boolean) {
  const [burstUntil, setBurstUntil] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(() => isDocumentVisible())

  const triggerBurst = useCallback(() => {
    if (!enabled) return
    setBurstUntil(Date.now() + OWNER_BURST_DURATION_MS)
  }, [enabled])

  useEffect(() => {
    if (!enabled || burstUntil === null) {
      return
    }

    const remaining = burstUntil - Date.now()
    if (remaining <= 0) {
      setBurstUntil(null)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setBurstUntil(null)
    }, remaining)

    return () => window.clearTimeout(timeoutId)
  }, [enabled, burstUntil])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const onFocus = () => triggerBurst()

    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [enabled, triggerBurst])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const onVisibilityChange = () => {
      setIsVisible(isDocumentVisible())
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const isBurstActive = enabled && burstUntil !== null && burstUntil > Date.now()
  const refetchInterval: number | false = !enabled || !isVisible
    ? false
    : isBurstActive
      ? OWNER_BURST_REFRESH_MS
      : OWNER_IDLE_REFRESH_MS

  const queryOptions = useMemo(
    () => ({
      refetchOnWindowFocus: enabled,
      refetchInterval,
    }),
    [enabled, refetchInterval],
  )

  return {
    isBurstActive,
    triggerBurst,
    queryOptions,
  }
}

export function formatLastUpdatedLabel(
  value: number | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!value) {
    return t('common.loading')
  }

  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000))

  if (seconds < 5) {
    return t('common.updatedJustNow')
  }

  if (seconds < 60) {
    return t('common.updatedSecondsAgo', { count: seconds })
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return t('common.updatedMinutesAgo', { count: minutes })
  }

  const hours = Math.floor(minutes / 60)
  return t('common.updatedHoursAgo', { count: hours })
}
