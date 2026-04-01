import type { ProgramStatus } from '@/types/programs'
import type { TransactionStatus } from '@/types/transactions'

/** Agent lifecycle status from API (string; normalized for styling). */
export function agentStatusBadgeClass(status: string | null): string {
  if (!status) return 'border-transparent bg-muted text-muted-foreground'
  const s = status.toLowerCase().replace(/\s+/g, '_')
  if (s === 'active') {
    return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
  }
  if (s === 'suspended' || s === 'inactive') {
    return 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
  }
  if (s === 'invited' || s === 'pending' || s === 'pending_activation') {
    return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
  }
  return 'border-transparent bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300'
}

export function programStatusBadgeClass(status: ProgramStatus): string {
  switch (status) {
    case 'active':
      return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'paused':
      return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
    case 'draft':
      return 'border-transparent bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300'
    case 'archived':
      return 'border-transparent bg-muted text-muted-foreground'
    default:
      return 'border-transparent bg-muted text-muted-foreground'
  }
}

export function transactionStatusBadgeClass(status: TransactionStatus): string {
  switch (status) {
    case 'paid':
      return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'validated':
      return 'border-transparent bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300'
    case 'pending':
      return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
    case 'detected':
      return 'border-transparent bg-violet-500/15 text-violet-900 dark:bg-violet-500/20 dark:text-violet-300'
    case 'rejected':
      return 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    default:
      return 'border-transparent bg-muted text-muted-foreground'
  }
}

export function formatDashboardDateFr(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
