import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  RefreshCcw,
  Workflow,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { DetailEmptyState, DetailSectionCard } from '@/components/app/DetailPageKit'
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
import { KpiCard, kpiSnapshotBadge } from '@/features/dashboard/components/KpiCard'
import { transactionStatusBadgeClass } from '@/features/dashboard/utils/semanticBadges'
import { buildProspectDetailPath } from '@/features/prospects/paths'
import { useAuthSession } from '@/features/auth/session'
import { useAppBreadcrumbTrail } from '@/layouts/AppShell'
import { ApiError } from '@/lib/api'

import { fetchTransaction } from '../api'

type SyncSortKey = 'updatedAt'
type AuditSortKey = 'occurredAt'

const invoiceBadgeClass = {
  pending:
    'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  paid:
    'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  unpaid: 'border-transparent bg-muted text-muted-foreground',
  overdue:
    'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  cancelled:
    'border-transparent bg-gray-500/15 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300',
} as const

function formatDate(value: string | null, withTime = false, t?: (key: string) => string) {
  if (!value) {
    return t ? t('common.notAvailable') : 'Unavailable'
  }

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

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'detected') return t('transactions.status.detected')
  if (status === 'pending') return t('transactions.status.pending')
  if (status === 'validated') return t('transactions.status.validated')
  if (status === 'rejected') return t('transactions.status.rejected')
  if (status === 'paid') return t('transactions.status.paid')
  return status
}

function invoiceStatusLabel(status: 'pending' | 'paid' | 'unpaid' | 'overdue' | 'cancelled' | null, t: (key: string) => string) {
  if (!status) return t('transactions.invoiceStatus.none')
  if (status === 'pending') return t('transactions.invoiceStatus.pending')
  if (status === 'paid') return t('transactions.invoiceStatus.paid')
  if (status === 'overdue') return t('transactions.invoiceStatus.overdue')
  if (status === 'cancelled') return t('transactions.invoiceStatus.cancelled')
  return t('transactions.invoiceStatus.unpaid')
}

function syncState(transaction: {
  status: string
  iacrm_transaction_id: string | null
  last_synced_at: string | null
  rejected_at: string | null
}, t: (key: string) => string) {
  if (transaction.status === 'rejected') {
    return {
      label: t('transactions.sync.rejected'),
      className:
        'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
    }
  }

  if (transaction.iacrm_transaction_id && transaction.last_synced_at) {
    return {
      label: t('transactions.sync.synced'),
      className:
        'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    }
  }

  if (transaction.last_synced_at) {
    return {
      label: t('transactions.sync.localTrace'),
      className:
        'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
    }
  }

  return {
    label: t('transactions.sync.pending'),
    className:
      'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  }
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
  badge?: React.ReactNode
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
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-background/40 px-4 py-3 transition hover:border-border hover:bg-muted/20"
    >
      {content}
    </Link>
  )
}

function TransactionDetailSkeleton() {
  return (
    <section className="app-section">
      <div className="flex flex-col gap-2 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-full" />
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
            {Array.from({ length: 3 }).map((_, index) => (
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
                <div
                  key={rowIndex}
                  className="h-12 border-t border-border/50 bg-card/70 first:border-t-0"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function TransactionDetailPage() {
  const { t } = useTranslation()
  const { user } = useAuthSession()
  const isAgentView = Boolean(user?.agent_profile)
  const { transactionId } = useParams<{ transactionId: string }>()
  const [syncSortDirection, setSyncSortDirection] = useState<SortDirection>('desc')
  const [historySortDirection, setHistorySortDirection] = useState<SortDirection>('desc')
  const [syncSortKey, setSyncSortKey] = useState<SyncSortKey>('updatedAt')
  const [historySortKey, setHistorySortKey] = useState<AuditSortKey>('occurredAt')

  const transactionQuery = useQuery({
    queryKey: ['transactions', 'detail', transactionId],
    queryFn: async () => fetchTransaction(transactionId ?? ''),
    enabled: Boolean(transactionId),
  })

  const transaction = transactionQuery.data?.data ?? null

  useAppBreadcrumbTrail(
    transaction
      ? [
          { label: t('transactions.detail.breadcrumb'), to: '/transactions' },
          { label: transaction.transaction_reference },
        ]
      : null,
  )

  const transactionStatusClass = transaction
    ? transactionStatusBadgeClass(transaction.status)
    : transactionStatusBadgeClass('pending')
  const invoiceClass =
    transaction && transaction.invoice_status
      ? invoiceBadgeClass[transaction.invoice_status]
      : 'border-transparent bg-muted text-muted-foreground'
  const sync = transaction
    ? syncState(transaction, t)
    : {
        label: t('transactions.sync.pending'),
        className:
          'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
      }
  const prospectHref =
    transaction && transaction.prospect
      ? buildProspectDetailPath({
          prospectId: transaction.prospect.id,
        })
      : null

  const syncRows = useMemo(() => {
    if (!transaction) return []

    return [
      {
        key: 'status',
        label: t('transactions.detail.sync.status'),
        value: statusLabel(transaction.status, t),
        badge: <Badge className={transactionStatusClass}>{statusLabel(transaction.status, t)}</Badge>,
        updatedAt: transaction.rejected_at ?? transaction.validated_at ?? transaction.occurred_at,
      },
      {
        key: 'invoice',
        label: t('transactions.detail.sync.invoice'),
        value: invoiceStatusLabel(transaction.invoice_status, t),
        badge: <Badge className={invoiceClass}>{invoiceStatusLabel(transaction.invoice_status, t)}</Badge>,
        updatedAt: transaction.paid_at ?? transaction.validated_at ?? null,
      },
      {
        key: 'sync',
        label: t('transactions.detail.sync.iacrm'),
        value: transaction.iacrm_transaction_id ?? t('transactions.detail.sync.noReference'),
        badge: <Badge className={sync.className}>{sync.label}</Badge>,
        updatedAt: transaction.last_synced_at,
      },
      {
        key: 'recognition',
        label: t('transactions.detail.sync.recognition'),
        value: transaction.recognized_at
          ? t('transactions.detail.sync.recognized')
          : t('transactions.detail.sync.awaitingRecognition'),
        badge: (
          <Badge
            className={
              transaction.recognized_at
                ? 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
            }
          >
            {transaction.recognized_at ? t('transactions.detail.sync.recognizedBadge') : t('transactions.detail.sync.awaitingBadge')}
          </Badge>
        ),
        updatedAt: transaction.recognized_at,
      },
    ]
  }, [invoiceClass, sync.className, sync.label, t, transaction, transactionStatusClass])

  const auditRows = useMemo(() => {
    if (!transaction) return []

    return [
      {
        key: 'occurred',
        event: t('transactions.detail.audit.occurred.event'),
        system: t('transactions.detail.audit.occurred.system'),
        detail: t('transactions.detail.audit.occurred.detail', { reference: transaction.transaction_reference }),
        occurredAt: transaction.occurred_at,
      },
      transaction.recognized_at
        ? {
            key: 'recognized',
            event: t('transactions.detail.audit.recognized.event'),
            system: t('transactions.detail.audit.recognized.system'),
            detail: t('transactions.detail.audit.recognized.detail'),
            occurredAt: transaction.recognized_at,
          }
        : null,
      transaction.validated_at
        ? {
            key: 'validated',
            event: t('transactions.detail.audit.validated.event'),
            system: t('transactions.detail.audit.validated.system'),
            detail: t('transactions.detail.audit.validated.detail'),
            occurredAt: transaction.validated_at,
          }
        : null,
      transaction.rejected_at
        ? {
            key: 'rejected',
            event: t('transactions.detail.audit.rejected.event'),
            system: t('transactions.detail.audit.rejected.system'),
            detail: t('transactions.detail.audit.rejected.detail'),
            occurredAt: transaction.rejected_at,
          }
        : null,
      transaction.paid_at
        ? {
            key: 'paid',
            event: t('transactions.detail.audit.paid.event'),
            system: t('transactions.detail.audit.paid.system'),
            detail: t('transactions.detail.audit.paid.detail'),
            occurredAt: transaction.paid_at,
          }
        : null,
      transaction.last_synced_at
        ? {
            key: 'synced',
            event: t('transactions.detail.audit.synced.event'),
            system: t('transactions.detail.audit.synced.system'),
            detail: transaction.iacrm_transaction_id
              ? t('transactions.detail.audit.synced.detailWithRef', { ref: transaction.iacrm_transaction_id })
              : t('transactions.detail.audit.synced.detailNoRef'),
            occurredAt: transaction.last_synced_at,
          }
        : null,
    ].filter(Boolean) as Array<{
      key: string
      event: string
      system: string
      detail: string
      occurredAt: string | null
    }>
  }, [t, transaction])

  const sortedSyncRows = useMemo(() => {
    return [...syncRows].sort((left, right) => {
      const result = toTimestamp(left.updatedAt) - toTimestamp(right.updatedAt)
      return syncSortDirection === 'asc' ? result : -result
    })
  }, [syncRows, syncSortDirection])

  const sortedAuditRows = useMemo(() => {
    return [...auditRows].sort((left, right) => {
      const result = toTimestamp(left.occurredAt) - toTimestamp(right.occurredAt)
      return historySortDirection === 'asc' ? result : -result
    })
  }, [auditRows, historySortDirection])

  function handleSyncSort(nextKey: SyncSortKey) {
    if (syncSortKey === nextKey) {
      setSyncSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSyncSortKey(nextKey)
    setSyncSortDirection('desc')
  }

  function handleHistorySort(nextKey: AuditSortKey) {
    if (historySortKey === nextKey) {
      setHistorySortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setHistorySortKey(nextKey)
    setHistorySortDirection('desc')
  }

  if (!transactionId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {t('transactions.detail.error.missingId')}
      </article>
    )
  }

  if (transactionQuery.isPending) {
    return <TransactionDetailSkeleton />
  }

  if (transactionQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(transactionQuery.error as ApiError).message}
      </article>
    )
  }

  if (!transaction) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {t('transactions.detail.error.notFound')}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        beforeTitle={
          <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
            <Link to="/transactions" aria-label={t('transactions.detail.back')}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        }
        title={transaction.transaction_reference}
        titleAddon={
          <>
            <Badge className={transactionStatusClass}>{statusLabel(transaction.status, t)}</Badge>
            <Badge className={sync.className}>{sync.label}</Badge>
            {transaction.invoice_status ? (
              <Badge className={invoiceClass}>{invoiceStatusLabel(transaction.invoice_status, t)}</Badge>
            ) : null}
          </>
        }
        right={
          <PageHeaderToolbar>
            {prospectHref ? (
              <Button asChild variant="outline">
                <Link to={prospectHref}>{t('transactions.detail.viewProspect')}</Link>
              </Button>
            ) : null}
            {transaction.program_id ? (
              <Button asChild variant="outline">
                <Link to={`/programs/${transaction.program_id}`}>{t('transactions.detail.viewProgram')}</Link>
              </Button>
            ) : null}
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {!isAgentView ? (
          <KpiCard
            title={t('transactions.detail.kpi.amount.title')}
            value={formatCurrency(transaction.amount, transaction.currency_code)}
            description={t('transactions.detail.kpi.amount.description')}
            badge={kpiSnapshotBadge(transaction.product_name)}
            icon={Banknote}
            tone="success"
          />
        ) : null}
        <KpiCard
          title={t('transactions.detail.kpi.points.title')}
          value={
            transaction.points_awarded === null
              ? t('transactions.detail.kpi.points.pending')
              : `${transaction.points_awarded.toLocaleString('fr-FR')} pts`
          }
          description={t('transactions.detail.kpi.points.description')}
          badge={kpiSnapshotBadge(transaction.program_name ?? t('transactions.fallback.noProgram'))}
          icon={CircleDollarSign}
          tone="primary"
        />
        <KpiCard
          title={t('transactions.detail.kpi.occurred.title')}
          value={formatDate(transaction.occurred_at, false, t)}
          description={t('transactions.detail.kpi.occurred.description')}
          badge={kpiSnapshotBadge(transaction.agent_name ?? t('transactions.fallback.noAgent'))}
          icon={CalendarClock}
          tone="warning"
        />
        <KpiCard
          title={t('transactions.detail.kpi.lastSync.title')}
          value={formatDate(transaction.last_synced_at, false, t)}
          description={t('transactions.detail.kpi.lastSync.description')}
          badge={kpiSnapshotBadge(transaction.iacrm_transaction_id ?? t('transactions.detail.kpi.lastSync.noReference'))}
          icon={RefreshCcw}
          tone="info"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailSectionCard
          className="border-0"
          title={t('transactions.detail.overview.title')}
          description={t('transactions.detail.overview.description')}
          contentClassName="pt-5"
        >
          <EntityCardIdentity
            leading={
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <CircleDollarSign className="size-5" />
              </div>
            }
            title={transaction.product_name}
            description={transaction.business_name ?? t('transactions.detail.overview.platformTransaction')}
            badge={
              <>
                <Badge variant="secondary" className="text-xs">
                  {transaction.currency_code}
                </Badge>
                {transaction.program_name ? (
                  <Badge variant="secondary" className="text-xs">
                    {transaction.program_name}
                  </Badge>
                ) : null}
              </>
            }
            titleClassName="text-base"
            descriptionClassName="text-sm"
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t('transactions.detail.meta.reference')}</p>
              <p className="mt-1 text-xs font-medium text-foreground">{transaction.transaction_reference}</p>
            </div>
            {!isAgentView ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t('transactions.detail.meta.amount')}</p>
                <p className="mt-1 text-xs font-medium text-foreground">
                  {formatCurrency(transaction.amount, transaction.currency_code)}
                </p>
              </div>
            ) : null}
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t('transactions.detail.meta.points')}</p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {transaction.points_awarded === null
                  ? t('transactions.detail.meta.pointsPending')
                  : `${transaction.points_awarded.toLocaleString('fr-FR')} pts`}
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t('transactions.detail.meta.occurred')}</p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {formatDate(transaction.occurred_at, true, t)}
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t('transactions.detail.meta.validated')}</p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {formatDate(transaction.validated_at, true, t)}
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t('transactions.detail.meta.paid')}</p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {formatDate(transaction.paid_at, true, t)}
              </p>
            </div>
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          className="border-0"
          title={t('transactions.detail.context.title')}
          description={t('transactions.detail.context.description')}
          contentClassName="space-y-3 pt-5"
        >
          <RelationRow
            eyebrow={t('transactions.detail.context.program')}
            title={transaction.program_name ?? t('transactions.fallback.noProgram')}
            description={
              transaction.program_name
                ? t('transactions.detail.context.programDescription')
                : t('transactions.detail.context.noProgram')
            }
            to={transaction.program_id ? `/programs/${transaction.program_id}` : null}
            badge={
              transaction.program_name ? (
                <Badge className="bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {t('transactions.detail.context.active')}
                </Badge>
              ) : undefined
            }
          />
          <RelationRow
            eyebrow={t('transactions.detail.context.agent')}
            title={transaction.agent_name ?? t('transactions.fallback.noAgent')}
            description={transaction.agent_email ?? t('transactions.fallback.noEmail')}
            to={transaction.agent_id ? `/agents/${transaction.agent_id}` : null}
            badge={transaction.agent_name ? <Badge variant="secondary">{t('transactions.detail.context.affiliateBadge')}</Badge> : undefined}
          />
          <RelationRow
            eyebrow={t('transactions.detail.context.prospect')}
            title={transaction.prospect?.contact_name ?? t('transactions.fallback.noLinkedProspect')}
            description={
              transaction.prospect
                ? `${transaction.prospect.company_name ?? t('transactions.fallback.noCompany')} / ${transaction.prospect.pipeline_stage}`
                : t('transactions.detail.context.noProspect')
            }
            to={prospectHref}
            badge={transaction.prospect ? <Workflow className="size-4 text-muted-foreground" /> : undefined}
          />
        </DetailSectionCard>
      </div>

      <div className="space-y-4">
        <DetailSectionCard
          className="border-0"
          title={t('transactions.detail.sync.title')}
          description={t('transactions.detail.sync.description')}
          right={<Badge variant="secondary">{t('transactions.detail.sync.markers', { count: syncRows.length })}</Badge>}
          contentClassName="pt-4"
        >
          <div className="overflow-hidden rounded-lg bg-background/40">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('transactions.detail.sync.table.element')}</TableHead>
                    <TableHead>{t('transactions.detail.sync.table.value')}</TableHead>
                    <TableHead>{t('transactions.detail.sync.table.status')}</TableHead>
                    <SortableTableHead
                      sortKey="updatedAt"
                      activeKey={syncSortKey}
                      direction={syncSortDirection}
                      onSort={handleSyncSort}
                      className="text-right"
                      align="right"
                    >
                      {t('transactions.detail.sync.table.lastUpdate')}
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSyncRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium text-foreground">{row.label}</TableCell>
                      <TableCell className="text-muted-foreground">{row.value}</TableCell>
                      <TableCell>{row.badge}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(row.updatedAt, true, t)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          className="border-0"
          title={t('transactions.detail.audit.title')}
          description={t('transactions.detail.audit.description')}
          right={<Badge variant="secondary">{t('transactions.detail.audit.events', { count: auditRows.length })}</Badge>}
          contentClassName="pt-4"
        >
          {auditRows.length === 0 ? (
            <DetailEmptyState message={t('transactions.detail.audit.empty')} />
          ) : (
            <div className="overflow-hidden rounded-lg bg-background/40">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        sortKey="occurredAt"
                        activeKey={historySortKey}
                        direction={historySortDirection}
                        onSort={handleHistorySort}
                      >
                        {t('transactions.detail.audit.table.date')}
                      </SortableTableHead>
                      <TableHead>{t('transactions.detail.audit.table.step')}</TableHead>
                      <TableHead>{t('transactions.detail.audit.table.system')}</TableHead>
                      <TableHead>{t('transactions.detail.audit.table.detail')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAuditRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(row.occurredAt, true, t)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{row.event}</TableCell>
                        <TableCell className="text-muted-foreground">{row.system}</TableCell>
                        <TableCell className="text-muted-foreground">{row.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DetailSectionCard>
      </div>
    </section>
  )
}
