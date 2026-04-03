import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchTransactions, fetchTransactionSummary } from '../api'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
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
import type { TransactionRecord, TransactionStatus } from '../../../types/transactions'

const statusPresentation: Record<TransactionStatus, { label: string; className: string }> = {
  detected: { label: 'Detected', className: 'border-border bg-muted/40 text-foreground' },
  pending: { label: 'Pending', className: 'border-border bg-blue-500/10 text-blue-800 dark:text-blue-300' },
  validated: { label: 'Validated', className: 'border-border bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  rejected: { label: 'Rejected', className: 'border-border bg-rose-500/10 text-rose-800 dark:text-rose-300' },
  paid: { label: 'Paid', className: 'border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
}

function formatDate(value: string | null, withTime = false) {
  if (value === null) {
    return 'Not available'
  }

  return new Date(value).toLocaleString('en-GB', {
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

export function TransactionsPage() {
  const { user } = useAuthSession()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all')

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
      <PageHeader
        title="Transactions"
        right={
          <PageHeaderToolbar>
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
              <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[140px] sm:shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(statusPresentation).map(([key, status]) => (
                    <SelectItem key={key} value={key}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </PageHeaderToolbar>
        }
      />
      <p className="app-copy text-muted-foreground">
        Commercial proof, attribution, and awarded points from synced records.
      </p>

      <div className="grid gap-3 lg:grid-cols-[1fr_minmax(220px,280px)]">
        <article className="rounded-lg border border-border bg-muted/15 px-4 py-3 md:px-5 md:py-4">
          <p className="app-eyebrow">Scope</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {user?.primary_business?.display_name ?? 'Global platform'}
          </p>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p>Transactions: {summary?.transaction_count ?? 0}</p>
            <p>Linked prospects: {summary?.linked_prospect_count ?? 0}</p>
            <p>Points awarded: {summary?.points_awarded_total ?? 0}</p>
          </div>
        </article>
      </div>

      <div className="app-grid-tight xl:grid-cols-4">
        <MetricCard label="Volume" value={formatCurrency(summary?.total_amount ?? 0, 'EUR')} />
        <MetricCard label="Validated" value={formatCurrency(summary?.validated_amount ?? 0, 'EUR')} />
        <MetricCard label="Paid" value={formatCurrency(summary?.paid_amount ?? 0, 'EUR')} />
        <MetricCard label="Points" value={(summary?.points_awarded_total ?? 0).toString()} />
      </div>

      <div className="rounded-lg border border-border bg-muted/10 px-3 py-2 text-center text-xs text-muted-foreground md:text-left">
        Sync-backed inventory
      </div>

      {filteredTransactions.length === 0 ? (
        <article className="rounded-lg border border-dashed border-border bg-muted/15 app-card-padding">
          <p className="app-eyebrow">Transaction inventory</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">No transactions match the current filter.</h2>
        </article>
      ) : (
        <div className="app-section">
          {filteredTransactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-card px-4 py-3 md:px-5 md:py-4">
      <p className="app-eyebrow">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </article>
  )
}

function TransactionCard({ transaction }: { transaction: TransactionRecord }) {
  const status = statusPresentation[transaction.status]

  return (
    <article className="rounded-lg border border-border bg-card app-card-padding">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div>
            <p className="app-eyebrow">
              {transaction.transaction_reference} / {transaction.program_name ?? 'Program'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{transaction.product_name}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${status.className}`}
            >
              {status.label}
            </span>
            {transaction.invoice_status ? (
              <span className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Invoice {transaction.invoice_status}
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <p>Prospect: {transaction.prospect_name ?? 'Not linked yet'}</p>
            <p>Company: {transaction.prospect_company_name ?? 'Not provided'}</p>
            <p>Agent: {transaction.agent_name ?? 'Unknown'}</p>
          </div>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link to={`/transactions/${transaction.id}`}>Open</Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <MiniMetric label="Amount" value={formatCurrency(transaction.amount, transaction.currency_code)} />
        <MiniMetric label="Occurred" value={formatDate(transaction.occurred_at)} />
        <MiniMetric label="Points" value={`${transaction.points_awarded ?? 'Pending'}`} />
        <MiniMetric label="Latest sync" value={formatDate(transaction.last_synced_at, true)} />
      </div>
    </article>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-muted/15 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </article>
  )
}
