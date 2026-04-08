import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  Banknote,
  CircleDollarSign,
  Coins,
  Link2,
  Search,
} from 'lucide-react'

import { KpiCard, KpiCardSkeleton, kpiSnapshotBadge } from '@/features/dashboard/components/KpiCard'
import { DashboardSectionHeader } from '@/features/dashboard/components/DashboardSectionHeader'
import { formatDashboardDateFr } from '@/features/dashboard/utils/semanticBadges'
import { useAuthSession } from '@/features/auth/session'
import { fetchAgents } from '@/features/agents/api'
import { fetchPrograms } from '@/features/programs/api'
import { buildProspectDetailPath } from '@/features/prospects/paths'
import { PageHeader } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import type { TransactionQueryParams, TransactionRecord, TransactionStatus } from '@/types/transactions'

import { fetchTransactionSummary, fetchTransactions } from '../api'

type TransactionSortKey =
  | 'transaction'
  | 'prospect'
  | 'program'
  | 'status'
  | 'sync'
  | 'amount'
  | 'points'
  | 'occurred'

const statusPresentation: Record<TransactionStatus, { label: string; className: string }> = {
  detected: {
    label: 'Détectée',
    className: 'border-transparent bg-muted text-muted-foreground',
  },
  pending: {
    label: 'En attente',
    className:
      'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
  validated: {
    label: 'Validée',
    className:
      'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  },
  rejected: {
    label: 'Rejetée',
    className:
      'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  },
  paid: {
    label: 'Payée',
    className:
      'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
}

const statusSortOrder: Record<TransactionStatus, number> = {
  detected: 0,
  pending: 1,
  validated: 2,
  rejected: 3,
  paid: 4,
}

function invoiceStatusLabel(status: TransactionRecord['invoice_status']) {
  if (!status) return 'Aucune facture'
  if (status === 'pending') return 'Facture en attente'
  if (status === 'paid') return 'Facture réglée'
  if (status === 'overdue') return 'Facture en retard'
  return 'Facture impayée'
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

function transactionSyncPresentation(transaction: TransactionRecord) {
  if (transaction.status === 'rejected') {
    return {
      label: 'Rejet métier',
      className:
        'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
      helper: transaction.rejected_at ? `Rejetée le ${formatDashboardDateFr(transaction.rejected_at)}` : 'Rejetée',
      rank: 0,
    }
  }

  if (transaction.iacrm_transaction_id && transaction.last_synced_at) {
    return {
      label: 'Synchronisée',
      className:
        'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
      helper: formatDashboardDateFr(transaction.last_synced_at),
      rank: 3,
    }
  }

  if (transaction.last_synced_at) {
    return {
      label: 'Trace locale',
      className:
        'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
      helper: formatDashboardDateFr(transaction.last_synced_at),
      rank: 2,
    }
  }

  return {
    label: 'En attente',
    className:
      'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
    helper: 'Aucune synchro',
    rank: 1,
  }
}

function compareTransactions(
  left: TransactionRecord,
  right: TransactionRecord,
  key: TransactionSortKey,
  direction: SortDirection,
) {
  const modifier = direction === 'asc' ? 1 : -1
  const result =
    key === 'occurred'
      ? toTimestamp(left.occurred_at) - toTimestamp(right.occurred_at)
      : key === 'points'
        ? (left.points_awarded ?? 0) - (right.points_awarded ?? 0)
        : key === 'amount'
          ? left.amount - right.amount
          : key === 'sync'
            ? transactionSyncPresentation(left).rank - transactionSyncPresentation(right).rank
            : key === 'status'
              ? statusSortOrder[left.status] - statusSortOrder[right.status]
              : key === 'program'
                ? (left.program_name ?? '').localeCompare(right.program_name ?? '')
                : key === 'prospect'
                  ? (left.prospect_name ?? left.prospect_company_name ?? '').localeCompare(
                      right.prospect_name ?? right.prospect_company_name ?? '',
                    )
                  : `${left.product_name} ${left.transaction_reference}`.localeCompare(
                      `${right.product_name} ${right.transaction_reference}`,
                    )

  return result * modifier
}

function TransactionsPageSkeleton() {
  return (
    <section className="app-section">
      <PageHeader title={<Skeleton className="h-6 w-32" />} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Skeleton className="h-9 w-full sm:w-[260px]" />
            <Skeleton className="h-9 w-full sm:w-[150px]" />
            <Skeleton className="h-9 w-full sm:w-[150px]" />
            <Skeleton className="h-9 w-full sm:w-[140px]" />
            <Skeleton className="h-9 w-full sm:w-[140px]" />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg bg-background/40">
          <div className="h-11 bg-muted/30" />
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-16 border-t border-border/50 bg-card/70 first:border-t-0" />
          ))}
        </div>
      </article>
    </section>
  )
}

export function TransactionsPage() {
  const { user, hasPermission } = useAuthSession()
  const isAgentView = Boolean(user?.agent_profile)
  const canViewAgents = !isAgentView && hasPermission('agent.view')
  const canViewPrograms = hasPermission('program.view')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all')
  const [programFilter, setProgramFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<TransactionSortKey>('occurred')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const queryParams = useMemo<TransactionQueryParams>(
    () => ({
      search,
      status: statusFilter,
      programId: programFilter,
      agentId: canViewAgents ? agentFilter : undefined,
      dateFrom,
      dateTo,
    }),
    [agentFilter, canViewAgents, dateFrom, dateTo, programFilter, search, statusFilter],
  )

  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'list', queryParams],
    queryFn: () => fetchTransactions(queryParams),
  })

  const summaryQuery = useQuery({
    queryKey: ['transactions', 'summary', queryParams],
    queryFn: () => fetchTransactionSummary(queryParams),
  })

  const programsQuery = useQuery({
    queryKey: ['transactions', 'program-options'],
    queryFn: fetchPrograms,
    enabled: canViewPrograms,
  })

  const agentsQuery = useQuery({
    queryKey: ['transactions', 'agent-options'],
    queryFn: fetchAgents,
    enabled: canViewAgents,
  })

  const transactions = transactionsQuery.data?.data ?? []
  const summary = summaryQuery.data?.data

  const programOptions = useMemo(() => {
    if (programsQuery.data?.data) {
      return programsQuery.data.data
        .map((program) => ({ id: program.id, name: program.name }))
        .sort((left, right) => left.name.localeCompare(right.name))
    }

    return Array.from(
      new Map(
        transactions
          .filter((transaction) => transaction.program_id && transaction.program_name)
          .map((transaction) => [
            transaction.program_id,
            { id: transaction.program_id, name: transaction.program_name ?? 'Programme' },
          ]),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name))
  }, [programsQuery.data?.data, transactions])

  const agentOptions = useMemo(() => {
    if (agentsQuery.data?.data) {
      return agentsQuery.data.data
        .map((agent) => ({ id: agent.id, name: agent.display_name ?? 'Affilié' }))
        .sort((left, right) => left.name.localeCompare(right.name))
    }

    return Array.from(
      new Map(
        transactions
          .filter((transaction) => transaction.agent_id && transaction.agent_name)
          .map((transaction) => [
            transaction.agent_id,
            { id: transaction.agent_id, name: transaction.agent_name ?? 'Affilié' },
          ]),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name))
  }, [agentsQuery.data?.data, transactions])

  const sortedTransactions = useMemo(
    () => [...transactions].sort((left, right) => compareTransactions(left, right, sortKey, sortDirection)),
    [sortDirection, sortKey, transactions],
  )

  function handleSort(nextKey: TransactionSortKey) {
    setPage(1)
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection(['amount', 'points', 'occurred'].includes(nextKey) ? 'desc' : 'asc')
  }

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, programFilter, agentFilter, dateFrom, dateTo])

  const totalItems = sortedTransactions.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedTransactions.slice(start, start + pageSize)
  }, [pageSize, safePage, sortedTransactions])

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  if (transactionsQuery.isPending || summaryQuery.isPending) {
    return <TransactionsPageSkeleton />
  }

  if (transactionsQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(transactionsQuery.error as ApiError).message}
      </article>
    )
  }

  if (summaryQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(summaryQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader title="Transactions" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="Volume total"
          value={formatCurrency(summary?.total_amount ?? 0, 'EUR')}
          description={`${summary?.transaction_count ?? 0} transactions dans le scope courant`}
          badge={kpiSnapshotBadge('Ledger')}
          icon={CircleDollarSign}
          tone="primary"
        />
        <KpiCard
          title="Transactions"
          value={(summary?.transaction_count ?? 0).toLocaleString('fr-FR')}
          description={`${summary?.linked_prospect_count ?? 0} reliées à un prospect`}
          badge={kpiSnapshotBadge('Traçabilité')}
          icon={Link2}
          tone="info"
        />
        <KpiCard
          title="Validé"
          value={formatCurrency(summary?.validated_amount ?? 0, 'EUR')}
          description="Montant reconnu après validation"
          badge={kpiSnapshotBadge('Pipeline')}
          icon={BadgeCheck}
          tone="warning"
        />
        <KpiCard
          title="Réglé"
          value={formatCurrency(summary?.paid_amount ?? 0, 'EUR')}
          description="Montant déjà payé"
          badge={kpiSnapshotBadge('Cash')}
          icon={Banknote}
          tone="success"
        />
        <KpiCard
          title="Points"
          value={`${(summary?.points_awarded_total ?? 0).toLocaleString('fr-FR')} pts`}
          description={isAgentView ? 'Points gagnés sur vos transactions' : 'Points générés pour les affiliés'}
          badge={kpiSnapshotBadge('Récompense')}
          icon={Coins}
          tone="info"
        />
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader
          title="Ledger transactionnel"
          description="Lecture opérationnelle des transactions, de leur état métier et de leur traçabilité."
          actions={
            <>
              <Field className="w-full sm:min-w-[220px] sm:max-w-[300px] sm:flex-1">
                <FieldLabel htmlFor="transactions-search" className="sr-only">
                  Rechercher une transaction
                </FieldLabel>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="transactions-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Référence, produit, prospect..."
                    className="pl-9"
                  />
                </div>
              </Field>

              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as 'all' | TransactionStatus)}
              >
                <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[138px] sm:shrink-0">
                  <SelectValue placeholder="Tous statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Statut</SelectLabel>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    {Object.entries(statusPresentation).map(([key, status]) => (
                      <SelectItem key={key} value={key}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {programOptions.length > 1 ? (
                <Select value={programFilter} onValueChange={setProgramFilter}>
                  <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[138px] sm:shrink-0">
                    <SelectValue placeholder="Tous programmes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Programme</SelectLabel>
                      <SelectItem value="all">Tous programmes</SelectItem>
                      {programOptions.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : null}

              {canViewAgents && agentOptions.length > 1 ? (
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[124px] sm:shrink-0">
                    <SelectValue placeholder="Tous affiliés" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Affilié</SelectLabel>
                      <SelectItem value="all">Tous affiliés</SelectItem>
                      {agentOptions.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : null}

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Field className="w-full sm:w-auto">
                  <FieldLabel htmlFor="transactions-date-from" className="sr-only">
                    Date de début
                  </FieldLabel>
                  <Input
                    id="transactions-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="sm:w-[148px]"
                  />
                </Field>
                <Field className="w-full sm:w-auto">
                  <FieldLabel htmlFor="transactions-date-to" className="sr-only">
                    Date de fin
                  </FieldLabel>
                  <Input
                    id="transactions-date-to"
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="sm:w-[148px]"
                  />
                </Field>
              </div>
            </>
          }
        />

        {totalItems === 0 ? (
          <article className="rounded-lg bg-background/40 px-4 py-6 text-sm text-muted-foreground">
            <p className="app-eyebrow">Ledger transactionnel</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">Aucune transaction ne correspond aux filtres.</h2>
            <p className="mt-2 max-w-2xl">
              Ajustez la période, le statut ou le périmètre programme/affilié pour retrouver une transaction existante.
            </p>
          </article>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg bg-background/40">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <SortableTableHead
                      sortKey="transaction"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="min-w-[12rem]"
                    >
                      Transaction
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="prospect"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden min-w-[11rem] md:table-cell"
                    >
                      Prospect
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="program"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden min-w-[10rem] lg:table-cell"
                    >
                      Programme
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Statut
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="sync"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden min-w-[9rem] xl:table-cell"
                    >
                      Sync
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="amount"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden text-right sm:table-cell"
                      align="right"
                    >
                      Montant
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="points"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden text-right xl:table-cell"
                      align="right"
                    >
                      Points
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="occurred"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden min-w-[8rem] lg:table-cell"
                    >
                      Survenue
                    </SortableTableHead>
                    <TableHead className="w-[84px] pe-3 text-right">Voir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageSlice.map((transaction, index) => {
                    const rank = (safePage - 1) * pageSize + index + 1
                    const status = statusPresentation[transaction.status]
                    const sync = transactionSyncPresentation(transaction)
                    const prospectHref = transaction.prospect
                      ? buildProspectDetailPath({
                          prospectId: transaction.prospect.id,
                          agentId: transaction.agent_id,
                        })
                      : null

                    return (
                      <TableRow key={transaction.id} className="hover:bg-muted/20">
                        <TableCell className="text-center text-muted-foreground">{rank}</TableCell>
                        <TableCell>
                          <Link
                            to={`/transactions/${transaction.id}`}
                            className="group -m-1 block cursor-pointer rounded-md p-1 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                              {transaction.product_name}
                            </p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {transaction.transaction_reference}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:hidden">
                              {formatCurrency(transaction.amount, transaction.currency_code)}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden max-w-[12rem] md:table-cell">
                          {prospectHref ? (
                            <Link
                              to={prospectHref}
                              className="group -m-1 block cursor-pointer rounded-md p-1 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                                {transaction.prospect_name ?? 'Prospect lié'}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {transaction.prospect_company_name ?? 'Sans société'}
                              </p>
                            </Link>
                          ) : (
                            <div className="px-1 py-1">
                              <p className="truncate text-sm text-foreground">Aucun prospect lié</p>
                              <p className="truncate text-[11px] text-muted-foreground">Transaction non rattachée</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden max-w-[11rem] lg:table-cell">
                          {transaction.program_id && transaction.program_name ? (
                            <Link
                              to={`/programs/${transaction.program_id}`}
                              className="group -m-1 block cursor-pointer rounded-md p-1 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                                {transaction.program_name}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {transaction.agent_name ?? 'Sans affilié'}
                              </p>
                            </Link>
                          ) : (
                            <div className="px-1 py-1 text-sm text-muted-foreground">Aucun programme</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={status.className}>{status.label}</Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {invoiceStatusLabel(transaction.invoice_status)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex flex-col gap-1">
                            <Badge className={sync.className}>{sync.label}</Badge>
                            <span className="text-[11px] text-muted-foreground">{sync.helper}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-right font-medium tabular-nums sm:table-cell">
                          {formatCurrency(transaction.amount, transaction.currency_code)}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums xl:table-cell">
                          {transaction.points_awarded === null
                            ? '—'
                            : `${transaction.points_awarded.toLocaleString('fr-FR')} pts`}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDashboardDateFr(transaction.occurred_at)}
                        </TableCell>
                        <TableCell className="pe-3 text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/transactions/${transaction.id}`}>Voir</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePaginationBar
              page={safePage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        )}
      </article>
    </section>
  )
}
