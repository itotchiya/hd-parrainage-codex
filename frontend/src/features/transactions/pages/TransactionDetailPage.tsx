import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { fetchTransaction } from '../api'

const statusPresentation = {
  detected: { label: 'Detected', className: 'bg-slate-100 text-slate-700' },
  pending: { label: 'Pending', className: 'bg-blue-100 text-blue-700' },
  validated: { label: 'Validated', className: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700' },
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' },
} as const

function formatDate(value: string | null, withTime = false) {
  if (!value) {
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

export function TransactionDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>()

  const transactionQuery = useQuery({
    queryKey: ['transactions', 'detail', transactionId],
    queryFn: async () => fetchTransaction(transactionId ?? ''),
    enabled: Boolean(transactionId),
  })

  if (!transactionId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Transaction identifier is missing from the current route.
      </article>
    )
  }

  if (transactionQuery.isPending) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading transaction detail...
      </article>
    )
  }

  if (transactionQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(transactionQuery.error as ApiError).message}
      </article>
    )
  }

  const transaction = transactionQuery.data.data
  const status = statusPresentation[transaction.status]

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Transaction
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {transaction.transaction_reference}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {transaction.product_name} / {transaction.program_name ?? 'No program'} /{' '}
                {transaction.agent_name ?? 'No agent'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${status.className}`}>
              {status.label}
            </span>
            {transaction.invoice_status ? (
              <span className="rounded-md bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Invoice {transaction.invoice_status}
              </span>
            ) : null}
            <Link
              to="/transactions"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Back
            </Link>
          </div>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Commercial data
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DataCell label="Amount" value={formatCurrency(transaction.amount, transaction.currency_code)} />
            <DataCell label="Points awarded" value={transaction.points_awarded?.toString() ?? 'Pending'} />
            <DataCell label="Business" value={transaction.business_name ?? 'Global platform'} />
            <DataCell label="Prospect" value={transaction.prospect_name ?? 'Not linked'} />
            <DataCell label="Occurred" value={formatDate(transaction.occurred_at, true)} />
            <DataCell label="Validated" value={formatDate(transaction.validated_at, true)} />
            <DataCell label="Paid" value={formatDate(transaction.paid_at, true)} />
            <DataCell label="Recognized" value={formatDate(transaction.recognized_at, true)} />
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Sync and relation
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DataCell label="IACRM reference" value={transaction.iacrm_transaction_id ?? 'Not available'} />
            <DataCell label="Last sync" value={formatDate(transaction.last_synced_at, true)} />
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Linked prospect
            </p>
            {transaction.prospect ? (
              <div className="mt-3">
                <h2 className="text-base font-semibold text-slate-950">
                  {transaction.prospect.contact_name}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {transaction.prospect.company_name ?? 'No company'} / {transaction.prospect.pipeline_stage} /{' '}
                  {transaction.prospect.conversion_status}
                </p>
                <Link
                  to={`/prospects/${transaction.prospect.id}`}
                  className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                >
                  Open prospect
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                This transaction entered the scoped ledger without a local prospect relation.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </article>
  )
}
