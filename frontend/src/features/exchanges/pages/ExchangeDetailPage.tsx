import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import {
  approveExchangeRequest,
  cancelExchangeRequest,
  completeExchangeRequest,
  fetchExchangeRequest,
  markExchangeRequestProcessing,
  rejectExchangeRequest,
} from '../api'
import type { ExchangeRequestStatus } from '../../../types/exchanges'

const statusPresentation: Record<ExchangeRequestStatus, { label: string; className: string }> = {
  requested: { label: 'Requested', className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', className: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700' },
  processing: { label: 'Processing', className: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-700' },
}

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

export function ExchangeDetailPage() {
  const { exchangeRequestId } = useParams<{ exchangeRequestId: string }>()
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuthSession()
  const canApprove = hasPermission('exchange-request.approve')
  const canReject = hasPermission('exchange-request.reject')

  const exchangeQuery = useQuery({
    queryKey: ['exchange-requests', 'detail', exchangeRequestId],
    queryFn: async () => fetchExchangeRequest(exchangeRequestId ?? ''),
    enabled: Boolean(exchangeRequestId),
  })

  const invalidateExchangeState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['exchange-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['points', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['points', 'by-program'] }),
      queryClient.invalidateQueries({ queryKey: ['points', 'ledger'] }),
    ])
  }

  const approveMutation = useMutation({
    mutationFn: async () => approveExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  const rejectMutation = useMutation({
    mutationFn: async () => rejectExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  const processingMutation = useMutation({
    mutationFn: async () => markExchangeRequestProcessing(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  const completeMutation = useMutation({
    mutationFn: async () => completeExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  const cancelMutation = useMutation({
    mutationFn: async () => cancelExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  if (!exchangeRequestId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Exchange request identifier is missing from the current route.
      </article>
    )
  }

  if (exchangeQuery.isPending) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading exchange detail...
      </article>
    )
  }

  if (exchangeQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(exchangeQuery.error as ApiError).message}
      </article>
    )
  }

  const exchange = exchangeQuery.data.data
  const status = statusPresentation[exchange.status]
  const isRequester = user?.id === exchange.requested_by_user_id
  const canCancel = isRequester && ['requested', 'approved', 'processing'].includes(exchange.status)
  const hasPendingMutation =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    processingMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Exchange
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {exchange.request_type === 'reward'
                  ? exchange.requested_reward_title ?? exchange.exchange_pack_item_title ?? 'Reward request'
                  : 'Cash exchange request'}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {exchange.agent_name ?? 'Agent'} / {exchange.program_name ?? 'Program'} /{' '}
                {exchange.business_name ?? 'Business'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${status.className}`}>
              {status.label}
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {exchange.request_type}
            </span>
            <Link
              to="/payouts"
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
            Request data
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DataCell label="Points" value={exchange.points_amount.toLocaleString('en-GB')} />
            <DataCell
              label="Cash"
              value={
                exchange.cash_amount === null
                  ? 'Not applicable'
                  : formatCurrency(exchange.cash_amount, exchange.currency_code)
              }
            />
            <DataCell label="Requested" value={formatDate(exchange.requested_at, true)} />
            <DataCell label="Approved" value={formatDate(exchange.approved_at, true)} />
            <DataCell label="Processing" value={formatDate(exchange.processed_at, true)} />
            <DataCell label="Completed" value={formatDate(exchange.completed_at, true)} />
            <DataCell label="Requested by" value={exchange.requested_by_name ?? 'Unknown user'} />
            <DataCell label="Decision owner" value={exchange.approved_by_name ?? 'Pending'} />
          </div>
          {exchange.notes ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              {exchange.notes}
            </div>
          ) : null}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Actions
            </p>
            <span className="text-xs text-slate-500">
              {exchange.ledger_entries.length} ledger entries
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {exchange.status === 'requested' && canApprove ? (
              <ActionButton label="Approve" busy={hasPendingMutation} onClick={() => approveMutation.mutate()} primary />
            ) : null}
            {exchange.status === 'requested' && canReject ? (
              <ActionButton label="Reject" busy={hasPendingMutation} onClick={() => rejectMutation.mutate()} />
            ) : null}
            {exchange.status === 'approved' && canApprove ? (
              <ActionButton label="Processing" busy={hasPendingMutation} onClick={() => processingMutation.mutate()} />
            ) : null}
            {['approved', 'processing'].includes(exchange.status) && canApprove ? (
              <ActionButton label="Complete" busy={hasPendingMutation} onClick={() => completeMutation.mutate()} primary />
            ) : null}
            {canCancel ? (
              <ActionButton label="Cancel" busy={hasPendingMutation} onClick={() => cancelMutation.mutate()} />
            ) : null}
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Program exchange pack
            </p>
            {exchange.program_exchange_pack ? (
              <div className="mt-3 space-y-3">
                <h2 className="text-base font-semibold text-slate-950">
                  {exchange.program_exchange_pack.name}
                </h2>
                {exchange.program_exchange_pack.items.map((item) => (
                  <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.points_cost} pts</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                No active exchange pack. Cash conversion can still apply if the program allows it.
              </p>
            )}
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Ledger
          </p>
          <span className="text-xs text-slate-500">{exchange.ledger_entries.length} entries</span>
        </div>
        <div className="mt-4 space-y-3">
          {exchange.ledger_entries.length === 0 ? (
            <EmptyState message="No ledger mutation has been written for this request yet." />
          ) : (
            exchange.ledger_entries.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {entry.entry_type} / {entry.entry_status}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {entry.source}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDate(entry.effective_at ?? entry.created_at, true)}
                  </p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DataCell label="Points delta" value={entry.points_delta.toString()} />
                  <DataCell
                    label="Status snapshot"
                    value={entry.exchange_request_status ?? 'Not available'}
                  />
                </div>
                {entry.description ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{entry.description}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </article>
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

function ActionButton({
  label,
  busy,
  onClick,
  primary = false,
}: {
  label: string
  busy: boolean
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        primary
          ? 'bg-slate-950 text-white hover:bg-slate-800'
          : 'border border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-950'
      }`}
    >
      {label}
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <article className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
      {message}
    </article>
  )
}
