import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

function formatRemaining(ms: number) {
  if (ms <= 0) return null
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (days > 0) {
    return `${days}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`
  }
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

interface SuspensionDeadlineCountdownProps {
  /** ISO 8601 deadline; countdown runs client-side until this instant. */
  deadlineIso: string | null | undefined
  className?: string
}

/**
 * Live countdown until suspension wind-down deadline (archive eligibility).
 */
export function SuspensionDeadlineCountdown({ deadlineIso, className }: SuspensionDeadlineCountdownProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!deadlineIso) return undefined
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [deadlineIso])

  if (!deadlineIso) return null

  const end = new Date(deadlineIso).getTime()
  if (Number.isNaN(end)) return null

  const remaining = end - Date.now()
  const label = formatRemaining(remaining)

  return (
    <div
      className={className}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
        <Clock className="size-3.5 shrink-0 opacity-80" aria-hidden />
        {label ? (
          <span>
            <span className="text-muted-foreground">Archive in </span>
            <span className="font-semibold text-foreground">{label}</span>
          </span>
        ) : (
          <span className="font-semibold text-amber-800 dark:text-amber-300">Archive eligible now</span>
        )}
      </span>
    </div>
  )
}
