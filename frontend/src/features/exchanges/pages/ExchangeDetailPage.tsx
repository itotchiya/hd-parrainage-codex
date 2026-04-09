import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CircleDollarSign,
  Gift,
  History,
  Loader2,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import {
  DetailEmptyState,
  DetailMetaGrid,
  DetailMetaItem,
  DetailSectionCard,
} from '@/components/app/DetailPageKit'
import { EntityCardIdentity } from '@/components/app/EntityCardIdentity'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuthSession } from '@/features/auth/session'
import { KpiCard, kpiSnapshotBadge } from '@/features/dashboard/components/KpiCard'
import { useAppBreadcrumbTrail } from '@/layouts/AppShell'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

import {
  approveExchangeRequest,
  cancelExchangeRequest,
  completeExchangeRequest,
  fetchExchangeRequest,
  markExchangeRequestProcessing,
  rejectExchangeRequest,
} from '../api'
import type { ExchangeRequestStatus } from '@/types/exchanges'

type TimelineSortKey = 'date'
type LedgerSortKey = 'effective'

const statusPresentation: Record<
  ExchangeRequestStatus,
  { label: string; className: string }
> = {
  requested: {
    label: 'Demandée',
    className:
      'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
  approved: {
    label: 'Approuvée',
    className:
      'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  },
  rejected: {
    label: 'Refusée',
    className:
      'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  },
  processing: {
    label: 'En traitement',
    className:
      'border-transparent bg-indigo-500/15 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
  },
  completed: {
    label: 'Terminée',
    className:
      'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  cancelled: {
    label: 'Annulée',
    className: 'border-transparent bg-muted text-muted-foreground',
  },
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return 'Indisponible'

  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  })
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

function toTimestamp(value: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

function requestTypeLabel(type: 'reward' | 'cash') {
  return type === 'reward' ? 'Récompense' : 'Cash'
}

function requestTitle(exchange: {
  request_type: 'reward' | 'cash'
  requested_reward_title: string | null
  exchange_pack_item_title: string | null
}) {
  return exchange.request_type === 'reward'
    ? exchange.requested_reward_title ?? exchange.exchange_pack_item_title ?? 'Demande de récompense'
    : 'Demande cash'
}

function RelationRow({
  eyebrow,
  title,
  description,
  to,
  badge,
}: {
  eyebrow: string
  title: string
  description: string
  to?: string | null
  badge?: ReactNode
}) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{description}</p>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </>
  )

  if (!to) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-background/40 px-4 py-3">
        {content}
      </div>
    )
  }

  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-background/40 px-4 py-3 transition hover:border-border hover:bg-muted/20"
    >
      {content}
    </Link>
  )
}

function invalidateExchangeState(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['exchange-requests'] }),
    queryClient.invalidateQueries({ queryKey: ['points', 'summary'] }),
    queryClient.invalidateQueries({ queryKey: ['points', 'by-program'] }),
    queryClient.invalidateQueries({ queryKey: ['points', 'ledger'] }),
  ])
}

function ExchangeDetailSkeleton() {
  return (
    <section className="app-section">
      <div className="flex flex-col gap-2 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-44 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-3 h-5 w-28 rounded-full" />
            <Skeleton className="mt-4 h-3.5 w-40" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border-0 bg-card p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-4 w-56 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[74px] rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border-0 bg-card p-5">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-xl border-0 bg-card p-5">
            <Skeleton className="h-5 w-36 rounded-md" />
            <div className="mt-4 overflow-hidden rounded-lg bg-background/40">
              <div className="h-11 bg-muted/30" />
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div key={rowIndex} className="h-12 border-t border-border/50 bg-card/70 first:border-t-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ExchangeDetailPage() {
  const { exchangeRequestId } = useParams<{ exchangeRequestId: string }>()
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuthSession()
  const canApprove = hasPermission('exchange-request.approve')
  const canReject = hasPermission('exchange-request.reject')
  const isAgentView = Boolean(user?.agent_profile)
  const [timelineSortDirection, setTimelineSortDirection] = useState<SortDirection>('desc')
  const [ledgerSortDirection, setLedgerSortDirection] = useState<SortDirection>('desc')
  const [timelineSortKey, setTimelineSortKey] = useState<TimelineSortKey>('date')
  const [ledgerSortKey, setLedgerSortKey] = useState<LedgerSortKey>('effective')

  const exchangeQuery = useQuery({
    queryKey: ['exchange-requests', 'detail', exchangeRequestId],
    queryFn: async () => fetchExchangeRequest(exchangeRequestId ?? ''),
    enabled: Boolean(exchangeRequestId),
  })

  const approveMutation = useMutation({
    mutationFn: async () => approveExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: async () => {
      await invalidateExchangeState(queryClient)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async () => rejectExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: async () => {
      await invalidateExchangeState(queryClient)
    },
  })

  const processingMutation = useMutation({
    mutationFn: async () => markExchangeRequestProcessing(exchangeRequestId ?? ''),
    onSuccess: async () => {
      await invalidateExchangeState(queryClient)
    },
  })

  const completeMutation = useMutation({
    mutationFn: async () => completeExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: async () => {
      await invalidateExchangeState(queryClient)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => cancelExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: async () => {
      await invalidateExchangeState(queryClient)
    },
  })

  const exchange = exchangeQuery.data?.data ?? null

  useAppBreadcrumbTrail(
    exchange
      ? [
          { label: 'Exchanges', to: '/payouts' },
          { label: requestTitle(exchange) },
        ]
      : null,
  )

  const status = exchange ? statusPresentation[exchange.status] : statusPresentation.requested
  const hasPendingMutation =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    processingMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending

  const canCancel =
    !!exchange &&
    exchange.requested_by_user_id === user?.id &&
    ['requested', 'approved', 'processing'].includes(exchange.status)

  const timelineRows = useMemo(() => {
    if (!exchange) return []

    return [
      {
        key: 'requested',
        step: 'Requested',
        actor: exchange.requested_by_name ?? 'User',
        detail: 'The exchange request was submitted and entered the queue.',
        date: exchange.requested_at,
      },
      exchange.approved_at
        ? {
            key: 'approved',
            step: 'Approved',
            actor: exchange.approved_by_name ?? 'Business owner',
            detail: 'The request was approved and points were locked for fulfillment.',
            date: exchange.approved_at,
          }
        : null,
      exchange.processed_at
        ? {
            key: 'processing',
            step: 'Processing',
            actor: exchange.approved_by_name ?? 'Operations',
            detail: 'Fulfillment started for this exchange request.',
            date: exchange.processed_at,
          }
        : null,
      exchange.completed_at
        ? {
            key: 'completed',
            step: 'Completed',
            actor: exchange.approved_by_name ?? 'Operations',
            detail: 'The request was completed and the points were consumed.',
            date: exchange.completed_at,
          }
        : null,
      exchange.rejected_at
        ? {
            key: 'rejected',
            step: 'Rejected',
            actor: exchange.approved_by_name ?? 'Business owner',
            detail: 'The request was rejected before fulfillment.',
            date: exchange.rejected_at,
          }
        : null,
      exchange.cancelled_at
        ? {
            key: 'cancelled',
            step: 'Cancelled',
            actor: exchange.requested_by_name ?? 'Requester',
            detail: 'The request was cancelled and any held points were released.',
            date: exchange.cancelled_at,
          }
        : null,
    ].filter(Boolean) as Array<{
      key: string
      step: string
      actor: string
      detail: string
      date: string | null
    }>
  }, [exchange])

  const ledgerRows = useMemo(() => {
    if (!exchange) return []

    return [...exchange.ledger_entries]
  }, [exchange])

  const sortedTimelineRows = useMemo(() => {
    return [...timelineRows].sort((left, right) => {
      const result = toTimestamp(left.date) - toTimestamp(right.date)
      return timelineSortDirection === 'asc' ? result : -result
    })
  }, [timelineRows, timelineSortDirection])

  const sortedLedgerRows = useMemo(() => {
    return [...ledgerRows].sort((left, right) => {
      const result = toTimestamp(left.effective_at ?? left.created_at) - toTimestamp(right.effective_at ?? right.created_at)
      return ledgerSortDirection === 'asc' ? result : -result
    })
  }, [ledgerRows, ledgerSortDirection])

  function handleTimelineSort(nextKey: TimelineSortKey) {
    if (timelineSortKey === nextKey) {
      setTimelineSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setTimelineSortKey(nextKey)
    setTimelineSortDirection('desc')
  }

  function handleLedgerSort(nextKey: LedgerSortKey) {
    if (ledgerSortKey === nextKey) {
      setLedgerSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setLedgerSortKey(nextKey)
    setLedgerSortDirection('desc')
  }

  if (!exchangeRequestId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Identifiant de demande manquant.
      </article>
    )
  }

  if (exchangeQuery.isPending) {
    return <ExchangeDetailSkeleton />
  }

  if (exchangeQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(exchangeQuery.error as ApiError).message}
      </article>
    )
  }

  if (!exchange) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Demande introuvable.
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        beforeTitle={
          <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
            <Link to="/payouts" aria-label="Retour à la liste des échanges">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        }
        title={requestTitle(exchange)}
        titleAddon={
          <>
            <Badge className={status.className}>{status.label}</Badge>
            <Badge variant="secondary">{requestTypeLabel(exchange.request_type)}</Badge>
          </>
        }
        right={
          <PageHeaderToolbar>
            {exchange.program_id ? (
              <Button asChild variant="outline">
                <Link to={`/programs/${exchange.program_id}`}>Voir le programme</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/commissions">Voir les points</Link>
            </Button>
            {!isAgentView && exchange.agent_id ? (
              <Button asChild variant="outline">
                <Link to={`/agents/${exchange.agent_id}`}>Voir l'affilié</Link>
              </Button>
            ) : null}
            {exchange.status === 'requested' && canApprove ? (
              <ActionButton label="Approuver" busy={hasPendingMutation} onClick={() => approveMutation.mutate()} primary />
            ) : null}
            {exchange.status === 'requested' && canReject ? (
              <ActionButton label="Refuser" busy={hasPendingMutation} onClick={() => rejectMutation.mutate()} destructive />
            ) : null}
            {exchange.status === 'approved' && canApprove ? (
              <ActionButton label="En traitement" busy={hasPendingMutation} onClick={() => processingMutation.mutate()} />
            ) : null}
            {['approved', 'processing'].includes(exchange.status) && canApprove ? (
              <ActionButton label="Terminer" busy={hasPendingMutation} onClick={() => completeMutation.mutate()} primary />
            ) : null}
            {canCancel ? (
              <ActionButton label="Annuler" busy={hasPendingMutation} onClick={() => cancelMutation.mutate()} destructive />
            ) : null}
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Points demandés"
          value={`${exchange.points_amount.toLocaleString('fr-FR')} pts`}
          description="Locked for this request"
          badge={kpiSnapshotBadge(requestTypeLabel(exchange.request_type))}
          icon={CircleDollarSign}
          tone="warning"
        />
        <KpiCard
          title="Valeur"
          value={
            exchange.cash_amount === null
              ? requestTypeLabel(exchange.request_type)
              : formatCurrency(exchange.cash_amount, exchange.currency_code)
          }
          description={exchange.request_type === 'reward' ? 'Requested reward value' : 'Cash conversion value'}
          badge={kpiSnapshotBadge(exchange.program_name ?? 'Sans programme')}
          icon={exchange.request_type === 'reward' ? Gift : Banknote}
          tone={exchange.request_type === 'reward' ? 'primary' : 'success'}
        />
        <KpiCard
          title="Demandée le"
          value={formatDate(exchange.requested_at)}
          description="Request creation date"
          badge={kpiSnapshotBadge(exchange.requested_by_name ?? 'Utilisateur')}
          icon={History}
          tone="info"
        />
        <KpiCard
          title="Écritures liées"
          value={exchange.ledger_entries.length.toLocaleString('fr-FR')}
          description="Ledger impact entries"
          badge={kpiSnapshotBadge(status.label)}
          icon={WalletCards}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailSectionCard
          title="Exchange overview"
          description="Request value, lifecycle dates, and submission context."
          className="border-0 bg-card shadow-none"
        >
          <EntityCardIdentity
            leading={
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-foreground">
                {exchange.request_type === 'reward' ? <Gift className="size-5" /> : <Banknote className="size-5" />}
              </div>
            }
            title={requestTitle(exchange)}
            description={exchange.notes ? exchange.notes : `${requestTypeLabel(exchange.request_type)} request`}
            badge={<Badge variant="secondary">{exchange.id.slice(0, 8).toUpperCase()}</Badge>}
          />

          <DetailMetaGrid className="mt-5 xl:grid-cols-3">
            <DetailMetaItem label="Request type" value={requestTypeLabel(exchange.request_type)} />
            <DetailMetaItem label="Points" value={`${exchange.points_amount.toLocaleString('fr-FR')} pts`} />
            <DetailMetaItem
              label="Cash value"
              value={
                exchange.cash_amount === null
                  ? 'Non applicable'
                  : formatCurrency(exchange.cash_amount, exchange.currency_code)
              }
            />
            <DetailMetaItem label="Requested by" value={exchange.requested_by_name ?? 'Utilisateur inconnu'} />
            <DetailMetaItem label="Requested at" value={formatDate(exchange.requested_at, true)} />
            <DetailMetaItem label="Completed at" value={formatDate(exchange.completed_at, true)} />
          </DetailMetaGrid>
        </DetailSectionCard>

        <DetailSectionCard
          title="Commercial context"
          description="Program, affiliate, and validation context around this exchange."
          className="border-0 bg-card shadow-none"
        >
          <div className="space-y-3">
            <RelationRow
              eyebrow="Program"
              title={exchange.program_name ?? 'No program'}
              description="Program scope for this request"
              to={exchange.program_id ? `/programs/${exchange.program_id}` : null}
              badge={<Badge className="border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">Actif</Badge>}
            />
            <RelationRow
              eyebrow="Affiliate"
              title={exchange.agent_name ?? 'No affiliate'}
              description={exchange.business_name ?? 'Business scope'}
              to={!isAgentView && exchange.agent_id ? `/agents/${exchange.agent_id}` : null}
              badge={<Badge variant="secondary">Affilié</Badge>}
            />
            <RelationRow
              eyebrow="Reviewer"
              title={exchange.approved_by_name ?? 'Pending review'}
              description={reviewerDescription(exchange.status)}
              badge={<Badge className={status.className}>{status.label}</Badge>}
            />
            {exchange.request_type === 'reward' ? (
              <RelationRow
                eyebrow="Reward"
                title={exchange.requested_reward_title ?? exchange.exchange_pack_item_title ?? 'Reward requested'}
                description={exchange.program_exchange_pack?.name ?? 'Program catalog'}
                badge={<Badge variant="secondary">Catalogue</Badge>}
              />
            ) : null}
          </div>
        </DetailSectionCard>
      </div>

      <DetailSectionCard
        title="Fulfillment timeline"
        description="Lifecycle milestones recorded for this exchange request."
        right={<span className="text-xs text-muted-foreground">{timelineRows.length} events</span>}
        className="border-0 bg-card shadow-none"
      >
        {sortedTimelineRows.length === 0 ? (
          <DetailEmptyState message="No lifecycle event has been recorded yet." />
        ) : (
          <div className="overflow-hidden rounded-lg bg-background/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Detail</TableHead>
                <SortableTableHead
                    sortKey="date"
                    activeKey={timelineSortKey}
                    direction={timelineSortDirection}
                    onSort={handleTimelineSort}
                    className="text-right"
                    align="right"
                  >
                    Date
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTimelineRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium text-foreground">{row.step}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.actor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.detail}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(row.date, true)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailSectionCard>

      <DetailSectionCard
        title="Ledger impact"
        description="Immutable points entries generated by this exchange request."
        right={<span className="text-xs text-muted-foreground">{ledgerRows.length} entries</span>}
        className="border-0 bg-card shadow-none"
      >
        {sortedLedgerRows.length === 0 ? (
          <DetailEmptyState message="No ledger impact has been recorded for this request yet." />
        ) : (
          <div className="overflow-hidden rounded-lg bg-background/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <SortableTableHead
                    sortKey="effective"
                    activeKey={ledgerSortKey}
                    direction={ledgerSortDirection}
                    onSort={handleLedgerSort}
                    className="text-right"
                    align="right"
                  >
                    Effective
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLedgerRows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground">{entry.source}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{entry.entry_type}</p>
                        <p className="text-xs text-muted-foreground">{entry.description ?? 'No extra detail'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.entry_status}</Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right text-sm font-semibold',
                        entry.points_delta < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300',
                      )}
                    >
                      {entry.points_delta > 0 ? '+' : ''}
                      {entry.points_delta.toLocaleString('fr-FR')} pts
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(entry.effective_at ?? entry.created_at, true)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailSectionCard>

      {exchange.request_type === 'reward' && exchange.program_exchange_pack ? (
        <DetailSectionCard
          title="Reward catalog snapshot"
          description="Pack items visible in the linked program at the time of review."
          className="border-0 bg-card shadow-none"
        >
          <div className="overflow-hidden rounded-lg bg-background/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reward</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchange.program_exchange_pack.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{item.title}</span>
                        {item.id === exchange.exchange_pack_item_id ? (
                          <Badge variant="secondary">Selected</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.item_type}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-foreground">
                      {item.points_cost.toLocaleString('fr-FR')} pts
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DetailSectionCard>
      ) : null}
    </section>
  )
}

function reviewerDescription(status: ExchangeRequestStatus) {
  if (status === 'requested') return 'Awaiting business review'
  if (status === 'approved') return 'Validated, not yet in fulfillment'
  if (status === 'processing') return 'Currently being fulfilled'
  if (status === 'completed') return 'Fulfillment completed'
  if (status === 'rejected') return 'Request declined by the business'
  return 'Request cancelled before completion'
}

function ActionButton({
  label,
  busy,
  onClick,
  primary = false,
  destructive = false,
}: {
  label: string
  busy: boolean
  onClick: () => void
  primary?: boolean
  destructive?: boolean
}) {
  return (
    <Button
      type="button"
      disabled={busy}
      onClick={onClick}
      variant={destructive ? 'destructive' : primary ? 'default' : 'outline'}
      className={cn(!primary && !destructive ? 'bg-transparent' : '')}
    >
      {busy ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : destructive ? (
        <XCircle className="mr-2 size-4" />
      ) : primary ? (
        <BadgeCheck className="mr-2 size-4" />
      ) : (
        <ShieldCheck className="mr-2 size-4" />
      )}
      {label}
    </Button>
  )
}
