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
import { useTranslation } from 'react-i18next'
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

function getStatusPresentation(t: (key: string) => string): Record<
  ExchangeRequestStatus,
  { label: string; className: string }
> {
  return {
    requested: {
      label: t('exchanges.status.requested'),
      className:
        'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
    },
    approved: {
      label: t('exchanges.status.approved'),
      className:
        'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
    },
    rejected: {
      label: t('exchanges.status.rejected'),
      className:
        'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
    },
    processing: {
      label: t('exchanges.status.processing'),
      className:
        'border-transparent bg-indigo-500/15 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
    },
    completed: {
      label: t('exchanges.status.completed'),
      className:
        'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
    cancelled: {
      label: t('exchanges.status.cancelled'),
      className: 'border-transparent bg-muted text-muted-foreground',
    },
  }
}

function formatDate(value: string | null, withTime = false, t: (key: string) => string) {
  if (!value) return t('common.notAvailable')

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

function requestTypeLabel(type: 'reward' | 'cash', t: (key: string) => string) {
  return type === 'reward' ? t('exchanges.requestType.reward') : t('exchanges.requestType.cash')
}

function requestTitle(exchange: {
  request_type: 'reward' | 'cash'
  requested_reward_title: string | null
  exchange_pack_item_title: string | null
}, t: (key: string) => string) {
  return exchange.request_type === 'reward'
    ? exchange.requested_reward_title ?? exchange.exchange_pack_item_title ?? t('exchanges.request.rewardDefault')
    : t('exchanges.request.cashDefault')
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
  const { t } = useTranslation()
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
          { label: t('exchanges.detail.breadcrumb'), to: '/payouts' },
          { label: requestTitle(exchange, t) },
        ]
      : null,
  )

  const status = exchange ? getStatusPresentation(t)[exchange.status] : getStatusPresentation(t).requested
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
        step: t('exchanges.detail.timelineEvents.requested.step'),
        actor: exchange.requested_by_name ?? t('exchanges.detail.timelineEvents.requested.actor'),
        detail: t('exchanges.detail.timelineEvents.requested.detail'),
        date: exchange.requested_at,
      },
      exchange.approved_at
        ? {
            key: 'approved',
            step: t('exchanges.detail.timelineEvents.approved.step'),
            actor: exchange.approved_by_name ?? t('exchanges.detail.timelineEvents.approved.actor'),
            detail: t('exchanges.detail.timelineEvents.approved.detail'),
            date: exchange.approved_at,
          }
        : null,
      exchange.processed_at
        ? {
            key: 'processing',
            step: t('exchanges.detail.timelineEvents.processing.step'),
            actor: exchange.approved_by_name ?? t('exchanges.detail.timelineEvents.processing.actor'),
            detail: t('exchanges.detail.timelineEvents.processing.detail'),
            date: exchange.processed_at,
          }
        : null,
      exchange.completed_at
        ? {
            key: 'completed',
            step: t('exchanges.detail.timelineEvents.completed.step'),
            actor: exchange.approved_by_name ?? t('exchanges.detail.timelineEvents.completed.actor'),
            detail: t('exchanges.detail.timelineEvents.completed.detail'),
            date: exchange.completed_at,
          }
        : null,
      exchange.rejected_at
        ? {
            key: 'rejected',
            step: t('exchanges.detail.timelineEvents.rejected.step'),
            actor: exchange.approved_by_name ?? t('exchanges.detail.timelineEvents.rejected.actor'),
            detail: t('exchanges.detail.timelineEvents.rejected.detail'),
            date: exchange.rejected_at,
          }
        : null,
      exchange.cancelled_at
        ? {
            key: 'cancelled',
            step: t('exchanges.detail.timelineEvents.cancelled.step'),
            actor: exchange.requested_by_name ?? t('exchanges.detail.timelineEvents.cancelled.actor'),
            detail: t('exchanges.detail.timelineEvents.cancelled.detail'),
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
        {t('exchanges.detail.error.missingId')}
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
        {t('exchanges.detail.error.notFound')}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        beforeTitle={
          <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
            <Link to="/payouts" aria-label={t('exchanges.detail.back')}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        }
        title={requestTitle(exchange, t)}
        titleAddon={
          <>
            <Badge className={status.className}>{status.label}</Badge>
            <Badge variant="secondary">{requestTypeLabel(exchange.request_type, t)}</Badge>
          </>
        }
        right={
          <PageHeaderToolbar>
            {exchange.program_id ? (
              <Button asChild variant="outline">
                <Link to={`/programs/${exchange.program_id}`}>{t('exchanges.detail.viewProgram')}</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/commissions">{t('exchanges.detail.viewPoints')}</Link>
            </Button>
            {!isAgentView && exchange.agent_id ? (
              <Button asChild variant="outline">
                <Link to={`/agents/${exchange.agent_id}`}>{t('exchanges.detail.viewAffiliate')}</Link>
              </Button>
            ) : null}
            {exchange.status === 'requested' && canApprove ? (
              <ActionButton label={t('exchanges.detail.actions.approve')} busy={hasPendingMutation} onClick={() => approveMutation.mutate()} primary />
            ) : null}
            {exchange.status === 'requested' && canReject ? (
              <ActionButton label={t('exchanges.detail.actions.reject')} busy={hasPendingMutation} onClick={() => rejectMutation.mutate()} destructive />
            ) : null}
            {exchange.status === 'approved' && canApprove ? (
              <ActionButton label={t('exchanges.detail.actions.processing')} busy={hasPendingMutation} onClick={() => processingMutation.mutate()} />
            ) : null}
            {['approved', 'processing'].includes(exchange.status) && canApprove ? (
              <ActionButton label={t('exchanges.detail.actions.complete')} busy={hasPendingMutation} onClick={() => completeMutation.mutate()} primary />
            ) : null}
            {canCancel ? (
              <ActionButton label={t('exchanges.detail.actions.cancel')} busy={hasPendingMutation} onClick={() => cancelMutation.mutate()} destructive />
            ) : null}
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t('exchanges.detail.kpi.pointsRequested')}
          value={`${exchange.points_amount.toLocaleString('fr-FR')} pts`}
          description={exchange.request_type === 'reward' ? t('exchanges.detail.overview.description') : t('exchanges.detail.kpi.value')}
          badge={kpiSnapshotBadge(requestTypeLabel(exchange.request_type, t))}
          icon={CircleDollarSign}
          tone="warning"
        />
        <KpiCard
          title={t('exchanges.detail.kpi.value')}
          value={
            exchange.cash_amount === null
              ? requestTypeLabel(exchange.request_type, t)
              : formatCurrency(exchange.cash_amount, exchange.currency_code)
          }
          description={exchange.request_type === 'reward' ? t('exchanges.detail.kpi.value') : t('exchanges.detail.kpi.value')}
          badge={kpiSnapshotBadge(exchange.program_name ?? t('exchanges.detail.relation.noProgram'))}
          icon={exchange.request_type === 'reward' ? Gift : Banknote}
          tone={exchange.request_type === 'reward' ? 'primary' : 'success'}
        />
        <KpiCard
          title={t('exchanges.detail.kpi.requestedAt')}
          value={formatDate(exchange.requested_at, false, t)}
          description={t('exchanges.detail.meta.requestedAt')}
          badge={kpiSnapshotBadge(exchange.requested_by_name ?? t('exchanges.detail.unknownActor.user'))}
          icon={History}
          tone="info"
        />
        <KpiCard
          title={t('exchanges.detail.kpi.ledgerEntries')}
          value={exchange.ledger_entries.length.toLocaleString('fr-FR')}
          description={t('exchanges.detail.kpi.ledgerDescription')}
          badge={kpiSnapshotBadge(status.label)}
          icon={WalletCards}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailSectionCard
          title={t('exchanges.detail.overview.title')}
          description={t('exchanges.detail.overview.description')}
          className="border-0 bg-card shadow-none"
        >
          <EntityCardIdentity
            leading={
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-foreground">
                {exchange.request_type === 'reward' ? <Gift className="size-5" /> : <Banknote className="size-5" />}
              </div>
            }
            title={requestTitle(exchange, t)}
            description={exchange.notes ? exchange.notes : `${requestTypeLabel(exchange.request_type, t)} request`}
            badge={<Badge variant="secondary">{exchange.id.slice(0, 8).toUpperCase()}</Badge>}
          />

          <DetailMetaGrid className="mt-5 xl:grid-cols-3">
            <DetailMetaItem label={t('exchanges.detail.meta.requestType')} value={requestTypeLabel(exchange.request_type, t)} />
            <DetailMetaItem label={t('exchanges.detail.meta.points')} value={`${exchange.points_amount.toLocaleString('fr-FR')} pts`} />
            <DetailMetaItem
              label={t('exchanges.detail.meta.cashValue')}
              value={
                exchange.cash_amount === null
                  ? t('exchanges.detail.meta.na')
                  : formatCurrency(exchange.cash_amount, exchange.currency_code)
              }
            />
            <DetailMetaItem label={t('exchanges.detail.meta.requestedBy')} value={exchange.requested_by_name ?? t('exchanges.detail.unknownUser')} />
            <DetailMetaItem label={t('exchanges.detail.meta.requestedAt')} value={formatDate(exchange.requested_at, true, t)} />
            <DetailMetaItem label={t('exchanges.detail.meta.completedAt')} value={formatDate(exchange.completed_at, true, t)} />
          </DetailMetaGrid>
        </DetailSectionCard>

        <DetailSectionCard
          title={t('exchanges.detail.commercial.title')}
          description={t('exchanges.detail.commercial.description')}
          className="border-0 bg-card shadow-none"
        >
          <div className="space-y-3">
            <RelationRow
              eyebrow={t('exchanges.detail.relation.program')}
              title={exchange.program_name ?? t('exchanges.detail.relation.noProgram')}
              description={t('exchanges.detail.relation.programDescription')}
              to={exchange.program_id ? `/programs/${exchange.program_id}` : null}
              badge={<Badge className="border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">{t('exchanges.detail.relation.activeBadge')}</Badge>}
            />
            <RelationRow
              eyebrow={t('exchanges.detail.relation.affiliate')}
              title={exchange.agent_name ?? t('exchanges.detail.relation.noAffiliate')}
              description={exchange.business_name ?? t('exchanges.detail.relation.affiliateDescription')}
              to={!isAgentView && exchange.agent_id ? `/agents/${exchange.agent_id}` : null}
              badge={<Badge variant="secondary">{t('exchanges.detail.relation.affiliateBadge')}</Badge>}
            />
            <RelationRow
              eyebrow={t('exchanges.detail.relation.reviewer')}
              title={exchange.approved_by_name ?? t('exchanges.detail.relation.pendingReview')}
              description={reviewerDescription(exchange.status, t)}
              badge={<Badge className={status.className}>{status.label}</Badge>}
            />
            {exchange.request_type === 'reward' ? (
              <RelationRow
                eyebrow={t('exchanges.detail.relation.reward')}
                title={exchange.requested_reward_title ?? exchange.exchange_pack_item_title ?? t('exchanges.detail.relation.reward')}
                description={exchange.program_exchange_pack?.name ?? t('exchanges.detail.relation.rewardDescription')}
                badge={<Badge variant="secondary">{t('exchanges.detail.relation.catalogBadge')}</Badge>}
              />
            ) : null}
          </div>
        </DetailSectionCard>
      </div>

      <DetailSectionCard
        title={t('exchanges.detail.timeline.title')}
        description={t('exchanges.detail.timeline.description')}
        right={<span className="text-xs text-muted-foreground">{t('exchanges.detail.timeline.events', { count: timelineRows.length })}</span>}
        className="border-0 bg-card shadow-none"
      >
        {sortedTimelineRows.length === 0 ? (
          <DetailEmptyState message={t('exchanges.detail.timeline.empty')} />
        ) : (
          <div className="overflow-hidden rounded-lg bg-background/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('exchanges.detail.timeline.step')}</TableHead>
                  <TableHead>{t('exchanges.detail.timeline.actor')}</TableHead>
                  <TableHead>{t('exchanges.detail.timeline.detail')}</TableHead>
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
                      {formatDate(row.date, true, t)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailSectionCard>

      <DetailSectionCard
        title={t('exchanges.detail.ledger.title')}
        description={t('exchanges.detail.ledger.description')}
        right={<span className="text-xs text-muted-foreground">{t('exchanges.detail.ledger.entries', { count: ledgerRows.length })}</span>}
        className="border-0 bg-card shadow-none"
      >
        {sortedLedgerRows.length === 0 ? (
          <DetailEmptyState message={t('exchanges.detail.ledger.empty')} />
        ) : (
          <div className="overflow-hidden rounded-lg bg-background/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('exchanges.detail.ledger.source')}</TableHead>
                  <TableHead>{t('exchanges.detail.ledger.entry')}</TableHead>
                  <TableHead>{t('exchanges.detail.ledger.status')}</TableHead>
                  <TableHead className="text-right">{t('exchanges.detail.ledger.delta')}</TableHead>
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
                        <p className="text-xs text-muted-foreground">{entry.description ?? t('exchanges.detail.ledger.noDetail')}</p>
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
                      {formatDate(entry.effective_at ?? entry.created_at, true, t)}
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
          title={t('exchanges.detail.catalog.title')}
          description={t('exchanges.detail.catalog.description')}
          className="border-0 bg-card shadow-none"
        >
          <div className="overflow-hidden rounded-lg bg-background/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('exchanges.detail.catalog.reward')}</TableHead>
                  <TableHead>{t('exchanges.detail.catalog.type')}</TableHead>
                  <TableHead className="text-right">{t('exchanges.detail.catalog.points')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchange.program_exchange_pack.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{item.title}</span>
                        {item.id === exchange.exchange_pack_item_id ? (
                          <Badge variant="secondary">{t('exchanges.detail.catalog.selected')}</Badge>
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

function reviewerDescription(status: ExchangeRequestStatus, t: (key: string) => string) {
  if (status === 'requested') return t('exchanges.detail.reviewerDescription.requested')
  if (status === 'approved') return t('exchanges.detail.reviewerDescription.approved')
  if (status === 'processing') return t('exchanges.detail.reviewerDescription.processing')
  if (status === 'completed') return t('exchanges.detail.reviewerDescription.completed')
  if (status === 'rejected') return t('exchanges.detail.reviewerDescription.rejected')
  return t('exchanges.detail.reviewerDescription.cancelled')
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
