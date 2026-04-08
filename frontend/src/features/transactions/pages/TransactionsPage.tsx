import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Banknote, BadgeCheck, Coins, Euro, MoreHorizontal, Search } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { fetchTransactions, fetchTransactionSummary } from '../api'
import { KpiCard, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { DashboardSectionHeader } from '../../dashboard/components/DashboardSectionHeader'
import { formatDashboardDateFr } from '../../dashboard/utils/semanticBadges'
import { PageHeader } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { TransactionRecord, TransactionStatus } from '../../../types/transactions'

type TransactionSortKey =
  | 'transaction'
  | 'prospect'
  | 'program'
  | 'status'
  | 'amount'
  | 'points'
  | 'occurred'

const statusPresentation: Record<TransactionStatus, { label: string; className: string }> = {
  detected: { label: 'Detected', className: 'border-border bg-muted/40 text-foreground' },
  pending: { label: 'Pending', className: 'border-border bg-blue-500/10 text-blue-800 dark:text-blue-300' },
  validated: { label: 'Validated', className: 'border-border bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  rejected: { label: 'Rejected', className: 'border-border bg-rose-500/10 text-rose-800 dark:text-rose-300' },
  paid: { label: 'Paid', className: 'border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
}

const statusSortOrder: Record<TransactionStatus, number> = {
  detected: 0,
  pending: 1,
  validated: 2,
  rejected: 3,
  paid: 4,
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

function transactionTime(value: string | null) {
  return new Date(value ?? 0).getTime()
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
      ? transactionTime(left.occurred_at) - transactionTime(right.occurred_at)
      : key === 'points'
        ? (left.points_awarded ?? 0) - (right.points_awarded ?? 0)
        : key === 'amount'
          ? left.amount - right.amount
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

export function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<TransactionSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'list'],
    queryFn: fetchTransactions,
  })

  const summaryQuery = useQuery({
    queryKey: ['transactions', 'summary'],
    queryFn: fetchTransactionSummary,
  })

  const transactions = transactionsQuery.data?.data ?? []
  const summary = summaryQuery.data?.data

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return transactions.filter((transaction) => {
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        transaction.transaction_reference.toLowerCase().includes(normalizedSearch) ||
        transaction.product_name.toLowerCase().includes(normalizedSearch) ||
        (transaction.prospect_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (transaction.prospect_company_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (transaction.program_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (transaction.agent_name ?? '').toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [transactions, search, statusFilter])

  const sortedTransactions = useMemo(() => {
    if (!sortKey) return filteredTransactions
    return [...filteredTransactions].sort((left, right) =>
      compareTransactions(left, right, sortKey, sortDirection),
    )
  }, [filteredTransactions, sortDirection, sortKey])

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
  }, [search, statusFilter])

  const totalFiltered = sortedTransactions.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const pageSafe = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    return sortedTransactions.slice(start, start + pageSize)
  }, [sortedTransactions, pageSafe, pageSize])

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

  if (transactionsQuery.isPending || summaryQuery.isPending) {
    return (
      <article className="app-panel text-sm text-muted-foreground">Loading transactions...</article>
    )
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Volume"
          value={formatCurrency(summary?.total_amount ?? 0, 'EUR')}
          description="Total commercial amount in scope"
          badge={kpiSnapshotBadge('Revenue')}
          icon={Euro}
          tone="primary"
        />
        <KpiCard
          title="Validated"
          value={formatCurrency(summary?.validated_amount ?? 0, 'EUR')}
          description="Amount past validation"
          badge={kpiSnapshotBadge('Pipeline')}
          icon={BadgeCheck}
          tone="warning"
        />
        <KpiCard
          title="Paid"
          value={formatCurrency(summary?.paid_amount ?? 0, 'EUR')}
          description="Settled commercial outcomes"
          badge={kpiSnapshotBadge('Cash')}
          icon={Banknote}
          tone="success"
        />
        <KpiCard
          title="Points"
          value={(summary?.points_awarded_total ?? 0).toString()}
          description="Points awarded from transactions"
          badge={kpiSnapshotBadge('Loyalty')}
          icon={Coins}
          tone="info"
        />
      </div>

      {filteredTransactions.length === 0 ? (
        <article className="rounded-lg bg-card p-3 sm:p-4">
          <DashboardSectionHeader
            title="Transaction ledger"
            actions={
              <>
                <Field className="w-full sm:min-w-[180px] sm:max-w-[320px] sm:flex-1">
                  <FieldLabel htmlFor="transactions-search" className="sr-only">
                    Search transactions
                  </FieldLabel>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="transactions-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Reference, product, prospect, program..."
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as 'all' | TransactionStatus)}
                >
                  <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[104px] sm:shrink-0">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Status</SelectLabel>
                      <SelectItem value="all">All</SelectItem>
                      {Object.entries(statusPresentation).map(([key, status]) => (
                        <SelectItem key={key} value={key}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </>
            }
          />
          <article className="rounded-lg border border-dashed border-border bg-muted/15 app-card-padding">
            <p className="app-eyebrow">Transaction ledger</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">No transactions match the filter.</h2>
          </article>
        </article>
      ) : (
        <article className="rounded-lg bg-card p-3 sm:p-4">
          <DashboardSectionHeader
            title="Transaction ledger"
            actions={
              <>
                <Field className="w-full sm:min-w-[180px] sm:max-w-[320px] sm:flex-1">
                  <FieldLabel htmlFor="transactions-search" className="sr-only">
                    Search transactions
                  </FieldLabel>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="transactions-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Reference, product, prospect, program..."
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as 'all' | TransactionStatus)}
                >
                  <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[104px] sm:shrink-0">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Status</SelectLabel>
                      <SelectItem value="all">All</SelectItem>
                      {Object.entries(statusPresentation).map(([key, status]) => (
                        <SelectItem key={key} value={key}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </>
            }
          />

          <div className="overflow-hidden rounded-lg border border-border">
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
                      className="min-w-[11rem]"
                    >
                      Transaction
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="prospect"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden md:table-cell"
                    >
                      Prospect
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="program"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden lg:table-cell"
                    >
                      Program
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Status
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="amount"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden sm:table-cell text-right"
                      align="right"
                    >
                      Amount
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="points"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden xl:table-cell text-right"
                      align="right"
                    >
                      Points
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="occurred"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden lg:table-cell"
                    >
                      Occurred
                    </SortableTableHead>
                    <TableHead className="w-10 pe-2 text-end">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageSlice.map((transaction, index) => {
                    const status = statusPresentation[transaction.status]
                    const rank = (pageSafe - 1) * pageSize + index + 1
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-center text-muted-foreground">{rank}</TableCell>
                        <TableCell>
                          <Link
                            to={`/transactions/${transaction.id}`}
                            className="group -m-1 block rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                              {transaction.product_name}
                            </p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {transaction.transaction_reference}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                              {formatCurrency(transaction.amount, transaction.currency_code)}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden max-w-[12rem] md:table-cell">
                          <p className="truncate text-sm text-foreground">
                            {transaction.prospect_name ?? 'Not linked yet'}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {transaction.prospect_company_name ?? 'No company'}
                          </p>
                        </TableCell>
                        <TableCell className="hidden max-w-[11rem] truncate text-muted-foreground lg:table-cell">
                          {transaction.program_name ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={`w-fit text-xs capitalize ${status.className}`}>
                              {status.label}
                            </Badge>
                            {transaction.invoice_status ? (
                              <span className="text-[11px] capitalize text-muted-foreground">
                                Invoice {transaction.invoice_status}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-right font-medium tabular-nums sm:table-cell">
                          {formatCurrency(transaction.amount, transaction.currency_code)}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums xl:table-cell">
                          {transaction.points_awarded === null
                            ? '—'
                            : transaction.points_awarded.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDashboardDateFr(transaction.occurred_at)}
                        </TableCell>
                        <TableCell className="pe-2 text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground"
                                aria-label={`Actions for ${transaction.transaction_reference}`}
                              >
                                <MoreHorizontal className="size-4" aria-hidden />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[10rem]">
                              <DropdownMenuItem asChild>
                                <Link to={`/transactions/${transaction.id}`}>Open detail</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePaginationBar
              page={pageSafe}
              pageSize={pageSize}
              totalItems={totalFiltered}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        </article>
      )}
    </section>
  )
}
