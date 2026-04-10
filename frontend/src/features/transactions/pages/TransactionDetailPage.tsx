import { useMemo, useState } from 'react'
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
} as const

function formatDate(value: string | null, withTime = false) {
  if (!value) {
    return 'Indisponible'
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

function invoiceStatusLabel(status: 'pending' | 'paid' | 'unpaid' | 'overdue' | null) {
  if (!status) return 'Aucune facture'
  if (status === 'pending') return 'En attente'
  if (status === 'paid') return 'Réglée'
  if (status === 'overdue') return 'En retard'
  return 'Impayée'
}

function syncState(transaction: {
  status: string
  iacrm_transaction_id: string | null
  last_synced_at: string | null
  rejected_at: string | null
}) {
  if (transaction.status === 'rejected') {
    return {
      label: 'Rejet métier',
      className:
        'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
    }
  }

  if (transaction.iacrm_transaction_id && transaction.last_synced_at) {
    return {
      label: 'Synchronisée',
      className:
        'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    }
  }

  if (transaction.last_synced_at) {
    return {
      label: 'Trace locale',
      className:
        'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
    }
  }

  return {
    label: 'En attente',
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
          { label: 'Transactions', to: '/transactions' },
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
    ? syncState(transaction)
    : {
        label: 'En attente',
        className:
          'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
      }
  const prospectHref =
    transaction && transaction.prospect
      ? buildProspectDetailPath({
          prospectId: transaction.prospect.id,
          agentId: transaction.agent_id,
        })
      : null

  const syncRows = useMemo(() => {
    if (!transaction) return []

    return [
      {
        key: 'status',
        label: 'Statut transaction',
        value: statusLabel(transaction.status),
        badge: <Badge className={transactionStatusClass}>{statusLabel(transaction.status)}</Badge>,
        updatedAt: transaction.rejected_at ?? transaction.validated_at ?? transaction.occurred_at,
      },
      {
        key: 'invoice',
        label: 'Facturation',
        value: invoiceStatusLabel(transaction.invoice_status),
        badge: <Badge className={invoiceClass}>{invoiceStatusLabel(transaction.invoice_status)}</Badge>,
        updatedAt: transaction.paid_at ?? transaction.validated_at ?? null,
      },
      {
        key: 'sync',
        label: 'Synchronisation IACRM',
        value: transaction.iacrm_transaction_id ?? 'Aucune référence liée',
        badge: <Badge className={sync.className}>{sync.label}</Badge>,
        updatedAt: transaction.last_synced_at,
      },
      {
        key: 'recognition',
        label: 'Reconnaissance',
        value: transaction.recognized_at ? 'Transaction reconnue' : 'En attente de reconnaissance',
        badge: (
          <Badge
            className={
              transaction.recognized_at
                ? 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
            }
          >
            {transaction.recognized_at ? 'Reconnue' : 'En attente'}
          </Badge>
        ),
        updatedAt: transaction.recognized_at,
      },
    ]
  }, [invoiceClass, sync.className, sync.label, transaction, transactionStatusClass])

  const auditRows = useMemo(() => {
    if (!transaction) return []

    return [
      {
        key: 'occurred',
        event: 'Transaction détectée',
        system: 'Moteur transactionnel',
        detail: `Référence ${transaction.transaction_reference}`,
        occurredAt: transaction.occurred_at,
      },
      transaction.recognized_at
        ? {
            key: 'recognized',
            event: 'Transaction reconnue',
            system: 'IACRM / rapprochement',
            detail: 'La transaction a été reconnue et rapprochée au flux commercial.',
            occurredAt: transaction.recognized_at,
          }
        : null,
      transaction.validated_at
        ? {
            key: 'validated',
            event: 'Transaction validée',
            system: 'Pipeline financier',
            detail: 'Le montant a été validé et peut alimenter le calcul de points.',
            occurredAt: transaction.validated_at,
          }
        : null,
      transaction.rejected_at
        ? {
            key: 'rejected',
            event: 'Transaction rejetée',
            system: 'Contrôle métier',
            detail: 'La transaction a été rejetée avant validation finale.',
            occurredAt: transaction.rejected_at,
          }
        : null,
      transaction.paid_at
        ? {
            key: 'paid',
            event: 'Transaction réglée',
            system: 'Suivi facturation',
            detail: 'Le règlement commercial a été enregistré comme payé.',
            occurredAt: transaction.paid_at,
          }
        : null,
      transaction.last_synced_at
        ? {
            key: 'synced',
            event: 'Dernière synchronisation',
            system: 'IACRM',
            detail: transaction.iacrm_transaction_id
              ? `Référence externe ${transaction.iacrm_transaction_id}`
              : 'Synchronisation enregistrée sans référence externe.',
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
  }, [transaction])

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
        Identifiant de transaction manquant.
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
        Transaction introuvable.
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        beforeTitle={
          <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
            <Link to="/transactions" aria-label="Retour à la liste des transactions">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        }
        title={transaction.transaction_reference}
        titleAddon={
          <>
            <Badge className={transactionStatusClass}>{statusLabel(transaction.status)}</Badge>
            <Badge className={sync.className}>{sync.label}</Badge>
            {transaction.invoice_status ? (
              <Badge className={invoiceClass}>{invoiceStatusLabel(transaction.invoice_status)}</Badge>
            ) : null}
          </>
        }
        right={
          <PageHeaderToolbar>
            {prospectHref ? (
              <Button asChild variant="outline">
                <Link to={prospectHref}>Voir le prospect</Link>
              </Button>
            ) : null}
            {transaction.program_id ? (
              <Button asChild variant="outline">
                <Link to={`/programs/${transaction.program_id}`}>Voir le programme</Link>
              </Button>
            ) : null}
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {!isAgentView ? (
          <KpiCard
            title="Montant"
            value={formatCurrency(transaction.amount, transaction.currency_code)}
            description="Valeur commerciale de la transaction"
            badge={kpiSnapshotBadge(transaction.product_name)}
            icon={Banknote}
            tone="success"
          />
        ) : null}
        <KpiCard
          title="Points attribués"
          value={
            transaction.points_awarded === null
              ? 'En attente'
              : `${transaction.points_awarded.toLocaleString('fr-FR')} pts`
          }
          description="Crédit affilié généré"
          badge={kpiSnapshotBadge(transaction.program_name ?? 'Sans programme')}
          icon={CircleDollarSign}
          tone="primary"
        />
        <KpiCard
          title="Survenue"
          value={formatDate(transaction.occurred_at)}
          description="Date métier de la transaction"
          badge={kpiSnapshotBadge(transaction.agent_name ?? 'Sans affilié')}
          icon={CalendarClock}
          tone="warning"
        />
        <KpiCard
          title="Dernière synchro"
          value={formatDate(transaction.last_synced_at)}
          description="Trace de synchronisation IACRM"
          badge={kpiSnapshotBadge(transaction.iacrm_transaction_id ?? 'Sans référence')}
          icon={RefreshCcw}
          tone="info"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailSectionCard
          className="border-0"
          title="Vue transaction"
          description="Référence, produit et données financières utiles pour la lecture métier."
          contentClassName="pt-5"
        >
          <EntityCardIdentity
            leading={
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <CircleDollarSign className="size-5" />
              </div>
            }
            title={transaction.product_name}
            description={transaction.business_name ?? 'Transaction rattachée à la plateforme'}
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
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Référence</p>
              <p className="mt-1 text-xs font-medium text-foreground">{transaction.transaction_reference}</p>
            </div>
            {!isAgentView ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Montant</p>
                <p className="mt-1 text-xs font-medium text-foreground">
                  {formatCurrency(transaction.amount, transaction.currency_code)}
                </p>
              </div>
            ) : null}
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Points</p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {transaction.points_awarded === null
                  ? 'En attente'
                  : `${transaction.points_awarded.toLocaleString('fr-FR')} pts`}
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Survenue</p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {formatDate(transaction.occurred_at, true)}
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Validée</p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {formatDate(transaction.validated_at, true)}
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Réglée</p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {formatDate(transaction.paid_at, true)}
              </p>
            </div>
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          className="border-0"
          title="Contexte commercial"
          description="Programme, affilié référent et prospect rattaché à la transaction."
          contentClassName="space-y-3 pt-5"
        >
          <RelationRow
            eyebrow="Programme"
            title={transaction.program_name ?? 'Aucun programme'}
            description={
              transaction.program_name
                ? 'Programme source de la transaction'
                : 'Aucun rattachement programme'
            }
            to={transaction.program_id ? `/programs/${transaction.program_id}` : null}
            badge={
              transaction.program_name ? (
                <Badge className="bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Actif
                </Badge>
              ) : undefined
            }
          />
          <RelationRow
            eyebrow="Affilié"
            title={transaction.agent_name ?? 'Aucun affilié'}
            description={transaction.agent_email ?? 'Aucun email renseigné'}
            to={transaction.agent_id ? `/agents/${transaction.agent_id}` : null}
            badge={transaction.agent_name ? <Badge variant="secondary">Affilié</Badge> : undefined}
          />
          <RelationRow
            eyebrow="Prospect"
            title={transaction.prospect?.contact_name ?? 'Aucun prospect lié'}
            description={
              transaction.prospect
                ? `${transaction.prospect.company_name ?? 'Sans société'} / ${transaction.prospect.pipeline_stage}`
                : 'Cette transaction n’est reliée à aucun prospect local.'
            }
            to={prospectHref}
            badge={transaction.prospect ? <Workflow className="size-4 text-muted-foreground" /> : undefined}
          />
        </DetailSectionCard>
      </div>

      <div className="space-y-4">
        <DetailSectionCard
          className="border-0"
          title="Synchronisation"
          description="Lecture rapide des repères de synchronisation et de rapprochement."
          right={<Badge variant="secondary">{syncRows.length} repères</Badge>}
          contentClassName="pt-4"
        >
          <div className="overflow-hidden rounded-lg bg-background/40">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élément</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <SortableTableHead
                      sortKey="updatedAt"
                      activeKey={syncSortKey}
                      direction={syncSortDirection}
                      onSort={handleSyncSort}
                      className="text-right"
                      align="right"
                    >
                      Dernière mise à jour
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
                        {formatDate(row.updatedAt, true)}
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
          title="Audit trail"
          description="Étapes enregistrées sur la transaction, classées du plus récent au plus ancien."
          right={<Badge variant="secondary">{auditRows.length} événements</Badge>}
          contentClassName="pt-4"
        >
          {auditRows.length === 0 ? (
            <DetailEmptyState message="Aucun événement horodaté n’est encore disponible pour cette transaction." />
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
                        Date
                      </SortableTableHead>
                      <TableHead>Étape</TableHead>
                      <TableHead>Système</TableHead>
                      <TableHead>Détail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAuditRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(row.occurredAt, true)}
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

function statusLabel(status: string) {
  if (status === 'detected') return 'Détectée'
  if (status === 'pending') return 'En attente'
  if (status === 'validated') return 'Validée'
  if (status === 'rejected') return 'Rejetée'
  if (status === 'paid') return 'Payée'
  return status
}
