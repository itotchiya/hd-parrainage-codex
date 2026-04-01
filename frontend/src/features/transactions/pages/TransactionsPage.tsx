import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchTransactions, fetchTransactionSummary } from '../api'
import type { TransactionRecord, TransactionStatus } from '../../../types/transactions'

const statusPresentation: Record<TransactionStatus, { label: string; className: string }> = {
  detected: { label: 'Detected', className: 'bg-slate-100 text-slate-700' },
  pending: { label: 'Pending', className: 'bg-blue-100 text-blue-700' },
  validated: { label: 'Validated', className: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700' },
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' },
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
      <article className="rounded-xl border border-slate-300/70 bg-white/90 p-6 text-sm text-slate-600">
        Loading transactions...
      </article>
    )
  }

  if (transactionsQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(transactionsQuery.error as ApiError).message}
      </article>
    )
  }

  if (summaryQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(summaryQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-slate-300/70 bg-white p-6 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Revenue visibility
          </p>
          <h1 className="app-page-title mt-2 text-slate-950">
            Transactions
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Commercial proof, attribution, and awarded points from live synced records.
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-50 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.9)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Scope
          </p>
          <p className="app-stat-value mt-3 text-slate-50">
            {user?.primary_business?.display_name ?? 'Global platform'}
          </p>
          <div className="mt-5 space-y-2 text-sm text-slate-300">
            <p>Transactions: {summary?.transaction_count ?? 0}</p>
            <p>Linked prospects: {summary?.linked_prospect_count ?? 0}</p>
            <p>Points awarded: {summary?.points_awarded_total ?? 0}</p>
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Volume" value={formatCurrency(summary?.total_amount ?? 0, 'EUR')} />
        <MetricCard label="Validated" value={formatCurrency(summary?.validated_amount ?? 0, 'EUR')} />
        <MetricCard label="Paid" value={formatCurrency(summary?.paid_amount ?? 0, 'EUR')} />
        <MetricCard label="Points" value={(summary?.points_awarded_total ?? 0).toString()} />
      </div>

      <article className="rounded-xl border border-slate-300/70 bg-white/90 p-4 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
              placeholder="Search by reference, product, prospect, program, or agent..."
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | TransactionStatus)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
            >
              <option value="all">All statuses</option>
              {Object.entries(statusPresentation).map(([key, status]) => (
                <option key={key} value={key}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            Sync-backed inventory
          </div>
        </div>
      </article>

      {filteredTransactions.length === 0 ? (
        <article className="rounded-xl border border-dashed border-slate-300 bg-white/90 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Transaction inventory
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            No transactions match the current filter.
          </h2>
        </article>
      ) : (
        <div className="space-y-4">
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
    <article className="rounded-lg border border-slate-300/70 bg-white px-5 py-4 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.16)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </article>
  )
}

function TransactionCard({ transaction }: { transaction: TransactionRecord }) {
  const status = statusPresentation[transaction.status]

  return (
    <article className="rounded-xl border border-slate-300/70 bg-white p-5 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.16)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {transaction.transaction_reference} / {transaction.program_name ?? 'Program'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {transaction.product_name}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${status.className}`}>
              {status.label}
            </span>
            {transaction.invoice_status ? (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Invoice {transaction.invoice_status}
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <p>Prospect: {transaction.prospect_name ?? 'Not linked yet'}</p>
            <p>Company: {transaction.prospect_company_name ?? 'Not provided'}</p>
            <p>Agent: {transaction.agent_name ?? 'Unknown'}</p>
          </div>
        </div>

        <Link
          to={`/transactions/${transaction.id}`}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
        >
          Open
        </Link>
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
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </article>
  )
}
