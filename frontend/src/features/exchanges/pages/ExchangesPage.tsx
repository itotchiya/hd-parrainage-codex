import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchPointsByProgram } from '../../points/api'
import {
  approveExchangeRequest,
  cancelExchangeRequest,
  completeExchangeRequest,
  createCashExchangeRequest,
  createRewardExchangeRequest,
  fetchExchangeRequests,
  markExchangeRequestProcessing,
  rejectExchangeRequest,
} from '../api'
import type { ExchangeRequestRecord, ExchangeRequestStatus } from '../../../types/exchanges'

const statusPresentation: Record<ExchangeRequestStatus, { label: string; className: string }> = {
  requested: { label: 'Requested', className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', className: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700' },
  processing: { label: 'Processing', className: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
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

function invalidateExchangeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['exchange-requests'] }),
    queryClient.invalidateQueries({ queryKey: ['points', 'summary'] }),
    queryClient.invalidateQueries({ queryKey: ['points', 'by-program'] }),
    queryClient.invalidateQueries({ queryKey: ['points', 'ledger'] }),
  ])
}

export function ExchangesPage() {
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuthSession()
  const canCreateReward = hasPermission('exchange-request.create-reward')
  const canCreateCash = hasPermission('exchange-request.create-cash')
  const canApprove = hasPermission('exchange-request.approve')
  const canReject = hasPermission('exchange-request.reject')
  const canCreate = canCreateReward || canCreateCash

  const [statusFilter, setStatusFilter] = useState<'all' | ExchangeRequestStatus>('all')
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [requestType, setRequestType] = useState<'reward' | 'cash'>('reward')
  const [pointsAmount, setPointsAmount] = useState('100')
  const [rewardItemId, setRewardItemId] = useState('')
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)

  const exchangesQuery = useQuery({
    queryKey: ['exchange-requests', 'list'],
    queryFn: fetchExchangeRequests,
  })

  const programBalancesQuery = useQuery({
    queryKey: ['points', 'by-program', 'exchanges-form'],
    queryFn: fetchPointsByProgram,
    enabled: canCreate,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProgramId) {
        throw new ApiError(422, { message: 'Please select a program first.' })
      }

      if (requestType === 'reward') {
        if (!rewardItemId) {
          throw new ApiError(422, { message: 'Please select a reward item.' })
        }

        return createRewardExchangeRequest({
          program_id: selectedProgramId,
          exchange_pack_item_id: rewardItemId,
          notes: notes.trim() || undefined,
        })
      }

      const parsedPoints = Number(pointsAmount)

      if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
        throw new ApiError(422, { message: 'Points amount must be greater than zero.' })
      }

      return createCashExchangeRequest({
        program_id: selectedProgramId,
        points_amount: parsedPoints,
        notes: notes.trim() || undefined,
      })
    },
    onSuccess: async () => {
      setFeedback('Exchange request submitted.')
      setSelectedProgramId('')
      setRewardItemId('')
      setNotes('')
      setPointsAmount('100')
      await invalidateExchangeQueries(queryClient)
    },
    onError: (error) => {
      setFeedback((error as ApiError).message)
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (exchangeRequestId: string) => {
      setActiveActionId(exchangeRequestId)
      return approveExchangeRequest(exchangeRequestId)
    },
    onSuccess: async () => {
      await invalidateExchangeQueries(queryClient)
    },
    onSettled: () => {
      setActiveActionId(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (exchangeRequestId: string) => {
      setActiveActionId(exchangeRequestId)
      return rejectExchangeRequest(exchangeRequestId)
    },
    onSuccess: async () => {
      await invalidateExchangeQueries(queryClient)
    },
    onSettled: () => {
      setActiveActionId(null)
    },
  })

  const processingMutation = useMutation({
    mutationFn: async (exchangeRequestId: string) => {
      setActiveActionId(exchangeRequestId)
      return markExchangeRequestProcessing(exchangeRequestId)
    },
    onSuccess: async () => {
      await invalidateExchangeQueries(queryClient)
    },
    onSettled: () => {
      setActiveActionId(null)
    },
  })

  const completeMutation = useMutation({
    mutationFn: async (exchangeRequestId: string) => {
      setActiveActionId(exchangeRequestId)
      return completeExchangeRequest(exchangeRequestId)
    },
    onSuccess: async () => {
      await invalidateExchangeQueries(queryClient)
    },
    onSettled: () => {
      setActiveActionId(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (exchangeRequestId: string) => {
      setActiveActionId(exchangeRequestId)
      return cancelExchangeRequest(exchangeRequestId)
    },
    onSuccess: async () => {
      await invalidateExchangeQueries(queryClient)
    },
    onSettled: () => {
      setActiveActionId(null)
    },
  })

  const requests = exchangesQuery.data?.data ?? []
  const programBalances = programBalancesQuery.data?.data ?? []
  const filteredRequests = useMemo(
    () => requests.filter((record) => statusFilter === 'all' || record.status === statusFilter),
    [requests, statusFilter],
  )

  const eligiblePrograms = useMemo(() => {
    return programBalances.filter((program) => {
      if (program.available_points <= 0) {
        return false
      }

      return requestType === 'reward'
        ? program.exchange_mode === 'reward' || program.exchange_mode === 'both'
        : program.exchange_mode === 'cash' || program.exchange_mode === 'both'
    })
  }, [programBalances, requestType])

  const selectedProgram = eligiblePrograms.find((program) => program.program_id === selectedProgramId)
  const selectedPackItems = selectedProgram?.exchange_pack_items ?? []
  const pendingCount = requests.filter((record) => record.status === 'requested').length
  const processingCount = requests.filter((record) => record.status === 'processing').length

  if (exchangesQuery.isPending) {
    return (
      <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading exchanges...
      </article>
    )
  }

  if (exchangesQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(exchangesQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Exchanges
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Requests
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Reward and cash conversion requests, with only the workflow state that matters.
              </p>
            </div>
          </div>

          <div className="grid min-w-[300px] gap-3 sm:grid-cols-3 xl:w-[420px]">
            <MetricCard label="Scope" value={user?.primary_business?.display_name ?? 'Global'} />
            <MetricCard label="Pending" value={pendingCount.toString()} />
            <MetricCard label="Processing" value={processingCount.toString()} />
          </div>
        </div>
      </article>

      {canCreate ? (
        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                New request
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Submit exchange
              </h2>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={requestType}
              onChange={(event) => {
                const nextType = event.target.value as 'reward' | 'cash'
                setRequestType(nextType)
                setSelectedProgramId('')
                setRewardItemId('')
                setFeedback(null)
              }}
              className="rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              {canCreateReward ? <option value="reward">Reward</option> : null}
              {canCreateCash ? <option value="cash">Cash</option> : null}
            </select>

            <select
              value={selectedProgramId}
              onChange={(event) => {
                setSelectedProgramId(event.target.value)
                setRewardItemId('')
                setFeedback(null)
              }}
              className="rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Select program</option>
              {eligiblePrograms.map((program) => (
                <option key={program.program_id} value={program.program_id}>
                  {program.program_name} ({program.available_points} pts)
                </option>
              ))}
            </select>

            {requestType === 'reward' ? (
              <select
                value={rewardItemId}
                onChange={(event) => {
                  setRewardItemId(event.target.value)
                  setFeedback(null)
                }}
                className="rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="">Select reward</option>
                {selectedPackItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({item.points_cost} pts)
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={pointsAmount}
                onChange={(event) => {
                  setPointsAmount(event.target.value)
                  setFeedback(null)
                }}
                type="number"
                min={1}
                className="rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                placeholder="Points amount"
              />
            )}

            <input
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value)
                setFeedback(null)
              }}
              className="rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Internal note"
            />
          </div>

          {selectedProgram ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Available {selectedProgram.available_points} pts / Locked {selectedProgram.locked_points} pts / Pack{' '}
              {selectedProgram.exchange_pack_name ?? 'No active pack'}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">{feedback ?? ' '}</div>
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit request'}
            </button>
          </div>
        </article>
      ) : null}

      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | ExchangeRequestStatus)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 lg:max-w-[240px]"
          >
            <option value="all">All statuses</option>
            {Object.entries(statusPresentation).map(([key, status]) => (
              <option key={key} value={key}>
                {status.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">{filteredRequests.length} requests in view</p>
        </div>
      </article>

      <div className="space-y-4">
        {filteredRequests.map((record) => (
          <ExchangeRequestCard
            key={record.id}
            record={record}
            currentUserId={user?.id ?? null}
            canApprove={canApprove}
            canReject={canReject}
            activeActionId={activeActionId}
            onApprove={(exchangeRequestId) => approveMutation.mutate(exchangeRequestId)}
            onReject={(exchangeRequestId) => rejectMutation.mutate(exchangeRequestId)}
            onProcessing={(exchangeRequestId) => processingMutation.mutate(exchangeRequestId)}
            onComplete={(exchangeRequestId) => completeMutation.mutate(exchangeRequestId)}
            onCancel={(exchangeRequestId) => cancelMutation.mutate(exchangeRequestId)}
          />
        ))}
      </div>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold text-foreground">{value}</p>
    </article>
  )
}

function ExchangeRequestCard({
  record,
  currentUserId,
  canApprove,
  canReject,
  activeActionId,
  onApprove,
  onReject,
  onProcessing,
  onComplete,
  onCancel,
}: {
  record: ExchangeRequestRecord
  currentUserId: string | null
  canApprove: boolean
  canReject: boolean
  activeActionId: string | null
  onApprove: (exchangeRequestId: string) => void
  onReject: (exchangeRequestId: string) => void
  onProcessing: (exchangeRequestId: string) => void
  onComplete: (exchangeRequestId: string) => void
  onCancel: (exchangeRequestId: string) => void
}) {
  const status = statusPresentation[record.status]
  const isBusy = activeActionId === record.id
  const canCancel =
    currentUserId !== null &&
    record.requested_by_user_id === currentUserId &&
    ['requested', 'approved', 'processing'].includes(record.status)

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {record.program_name ?? 'Program'}
            </span>
            <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${status.className}`}>
              {status.label}
            </span>
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {record.request_type}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {record.request_type === 'reward'
                ? record.requested_reward_title ?? record.exchange_pack_item_title ?? 'Reward request'
                : 'Cash exchange request'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {record.agent_name ?? 'Agent'} / {record.business_name ?? 'Business'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DataCell label="Points" value={record.points_amount.toLocaleString('en-GB')} />
            <DataCell
              label="Cash"
              value={record.cash_amount === null ? 'N/A' : formatCurrency(record.cash_amount, record.currency_code)}
            />
            <DataCell label="Requested" value={formatDate(record.requested_at, true)} />
            <DataCell label="Owner" value={record.approved_by_name ?? 'Pending'} />
          </div>
        </div>

        <div className="flex min-w-[220px] flex-wrap gap-2 xl:justify-end">
          <Link
            to={`/payouts/${record.id}`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Open
          </Link>
          {record.status === 'requested' && canApprove ? (
            <ActionButton label="Approve" busy={isBusy} onClick={() => onApprove(record.id)} primary />
          ) : null}
          {record.status === 'requested' && canReject ? (
            <ActionButton label="Reject" busy={isBusy} onClick={() => onReject(record.id)} />
          ) : null}
          {record.status === 'approved' && canApprove ? (
            <ActionButton label="Processing" busy={isBusy} onClick={() => onProcessing(record.id)} />
          ) : null}
          {['approved', 'processing'].includes(record.status) && canApprove ? (
            <ActionButton label="Complete" busy={isBusy} onClick={() => onComplete(record.id)} primary />
          ) : null}
          {canCancel ? (
            <ActionButton label="Cancel" busy={isBusy} onClick={() => onCancel(record.id)} />
          ) : null}
        </div>
      </div>
    </article>
  )
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
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
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border border-border text-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      {label}
    </button>
  )
}
