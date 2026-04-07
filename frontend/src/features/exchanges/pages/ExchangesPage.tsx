import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Inbox, Loader2, MoreHorizontal, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { KpiCard, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { DashboardSectionHeader } from '../../dashboard/components/DashboardSectionHeader'
import { formatDashboardDateFr } from '../../dashboard/utils/semanticBadges'
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
import { PageHeader } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import type { ExchangeRequestRecord, ExchangeRequestStatus } from '../../../types/exchanges'

type ExchangeSortKey = 'request' | 'status' | 'points' | 'cash' | 'requested' | 'owner'

const statusPresentation: Record<ExchangeRequestStatus, { label: string; className: string }> = {
  requested: { label: 'Requested', className: 'border-border bg-blue-500/10 text-blue-800 dark:text-blue-300' },
  approved: { label: 'Approved', className: 'border-border bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  rejected: { label: 'Rejected', className: 'border-border bg-rose-500/10 text-rose-800 dark:text-rose-300' },
  processing: { label: 'Processing', className: 'border-border bg-indigo-500/10 text-indigo-800 dark:text-indigo-300' },
  completed: { label: 'Completed', className: 'border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
  cancelled: { label: 'Cancelled', className: 'border-border bg-muted text-muted-foreground' },
}

const statusSortOrder: Record<ExchangeRequestStatus, number> = {
  requested: 0,
  approved: 1,
  processing: 2,
  completed: 3,
  rejected: 4,
  cancelled: 5,
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

function requestTime(value: string | null) {
  return new Date(value ?? 0).getTime()
}

function exchangeRequestTitle(record: ExchangeRequestRecord) {
  return record.request_type === 'reward'
    ? record.requested_reward_title ?? record.exchange_pack_item_title ?? 'Reward request'
    : 'Cash exchange request'
}

function compareExchangeRequests(
  left: ExchangeRequestRecord,
  right: ExchangeRequestRecord,
  key: ExchangeSortKey,
  direction: SortDirection,
) {
  const modifier = direction === 'asc' ? 1 : -1
  const result =
    key === 'requested'
      ? requestTime(left.requested_at) - requestTime(right.requested_at)
      : key === 'cash'
        ? (left.cash_amount ?? 0) - (right.cash_amount ?? 0)
        : key === 'points'
          ? left.points_amount - right.points_amount
          : key === 'status'
            ? statusSortOrder[left.status] - statusSortOrder[right.status]
            : key === 'owner'
              ? (left.approved_by_name ?? '').localeCompare(right.approved_by_name ?? '')
              : `${exchangeRequestTitle(left)} ${left.program_name ?? ''} ${left.agent_name ?? ''}`.localeCompare(
                  `${exchangeRequestTitle(right)} ${right.program_name ?? ''} ${right.agent_name ?? ''}`,
                )

  return result * modifier
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
  const [search, setSearch] = useState('')
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [requestType, setRequestType] = useState<'reward' | 'cash'>('reward')
  const [pointsAmount, setPointsAmount] = useState('100')
  const [rewardItemId, setRewardItemId] = useState('')
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<ExchangeSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    if (!canCreateReward && canCreateCash) {
      setRequestType('cash')
    }
    if (!canCreateCash && canCreateReward) {
      setRequestType('reward')
    }
  }, [canCreateCash, canCreateReward])

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
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((record) => {
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter
      const matchesSearch =
        q.length === 0 ||
        (record.program_name ?? '').toLowerCase().includes(q) ||
        (record.agent_name ?? '').toLowerCase().includes(q) ||
        (record.business_name ?? '').toLowerCase().includes(q) ||
        (record.request_type ?? '').toLowerCase().includes(q) ||
        (record.requested_reward_title ?? '').toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [requests, search, statusFilter])

  const sortedRequests = useMemo(() => {
    if (!sortKey) return filteredRequests
    return [...filteredRequests].sort((left, right) =>
      compareExchangeRequests(left, right, sortKey, sortDirection),
    )
  }, [filteredRequests, sortDirection, sortKey])

  function handleSort(nextKey: ExchangeSortKey) {
    setPage(1)
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection(['points', 'cash', 'requested'].includes(nextKey) ? 'desc' : 'asc')
  }

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const totalFiltered = sortedRequests.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const pageSafe = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    return sortedRequests.slice(start, start + pageSize)
  }, [sortedRequests, pageSafe, pageSize])

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

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
    return <article className="app-panel text-sm text-muted-foreground">Loading exchanges...</article>
  }

  if (exchangesQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(exchangesQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Payouts"
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <KpiCard
          title="Total"
          value={requests.length.toString()}
          description="All exchange requests"
          badge={kpiSnapshotBadge('Requests')}
          icon={Inbox}
          tone="info"
        />
        <KpiCard
          title="Pending"
          value={pendingCount.toString()}
          description="Awaiting approval"
          badge={kpiSnapshotBadge('Queue')}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          title="Processing"
          value={processingCount.toString()}
          description="In fulfillment"
          badge={kpiSnapshotBadge('Workflow')}
          icon={Loader2}
          tone="primary"
        />
      </div>

      {canCreate ? (
        <article className="rounded-lg border border-border bg-card app-card-padding">
          <p className="app-eyebrow">New request</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">Submit exchange</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={requestType}
                onValueChange={(value) => {
                  const nextType = value as 'reward' | 'cash'
                  setRequestType(nextType)
                  setSelectedProgramId('')
                  setRewardItemId('')
                  setFeedback(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Request type</SelectLabel>
                    {canCreateReward ? <SelectItem value="reward">Reward</SelectItem> : null}
                    {canCreateCash ? <SelectItem value="cash">Cash</SelectItem> : null}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Program</FieldLabel>
              <Select
                value={selectedProgramId || undefined}
                onValueChange={(value) => {
                  setSelectedProgramId(value)
                  setRewardItemId('')
                  setFeedback(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Program</SelectLabel>
                    {eligiblePrograms.map((program) => (
                      <SelectItem key={program.program_id} value={program.program_id}>
                        {program.program_name} ({program.available_points} pts)
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            {requestType === 'reward' ? (
              <Field>
                <FieldLabel>Reward</FieldLabel>
                <Select
                  value={rewardItemId || undefined}
                  onValueChange={(value) => {
                    setRewardItemId(value)
                    setFeedback(null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reward" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Reward item</SelectLabel>
                      {selectedPackItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title} ({item.points_cost} pts)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field>
                <FieldLabel>Points amount</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={pointsAmount}
                  onChange={(event) => {
                    setPointsAmount(event.target.value)
                    setFeedback(null)
                  }}
                  placeholder="Points amount"
                />
              </Field>
            )}

            <Field className="md:col-span-2 xl:col-span-1">
              <FieldLabel>Note</FieldLabel>
              <Input
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value)
                  setFeedback(null)
                }}
                placeholder="Internal note"
              />
            </Field>
          </div>

          {selectedProgram ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              Available {selectedProgram.available_points} pts / Locked {selectedProgram.locked_points} pts / Pack{' '}
              {selectedProgram.exchange_pack_name ?? 'No active pack'}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">{feedback ?? ' '}</div>
            <Button type="button" size="sm" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Submitting...' : 'Submit request'}
            </Button>
          </div>
        </article>
      ) : null}

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader
          title="Payout requests"
          actions={
            <>
              <Field className="w-full sm:min-w-[200px] sm:max-w-[340px] sm:flex-1">
                <FieldLabel htmlFor="payouts-search" className="sr-only">
                  Search payouts
                </FieldLabel>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="payouts-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Program, business, agent, request type..."
                    className="pl-9"
                  />
                </div>
              </Field>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as 'all' | ExchangeRequestStatus)}
              >
                <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[160px] sm:shrink-0">
                  <SelectValue placeholder="Filter status" />
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
            </>
          }
        />

        {totalFiltered === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-5 text-sm text-muted-foreground">
            No payout requests match the current filter.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <SortableTableHead
                      sortKey="request"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Request
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
                      sortKey="points"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="text-right"
                      align="right"
                    >
                      Points
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="cash"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden md:table-cell text-right"
                      align="right"
                    >
                      Cash
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="requested"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden lg:table-cell"
                    >
                      Requested
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="owner"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden xl:table-cell"
                    >
                      Owner
                    </SortableTableHead>
                    <TableHead className="w-10 pe-2 text-end">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageSlice.map((record, index) => {
                    const status = statusPresentation[record.status]
                    const rank = (pageSafe - 1) * pageSize + index + 1
                    const isBusy = activeActionId === record.id
                    const canCancel =
                      user?.id !== undefined &&
                      user.id !== null &&
                      record.requested_by_user_id === user.id &&
                      ['requested', 'approved', 'processing'].includes(record.status)
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-center text-muted-foreground">{rank}</TableCell>
                        <TableCell>
                          <Link
                            to={`/payouts/${record.id}`}
                            className="group -m-1 block rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                              {record.request_type === 'reward'
                                ? record.requested_reward_title ??
                                  record.exchange_pack_item_title ??
                                  'Reward request'
                                : 'Cash exchange request'}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {(record.program_name ?? 'Program') + ' · ' + (record.agent_name ?? 'Agent')}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground md:hidden">
                              {record.points_amount.toLocaleString('fr-FR')} pts
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`w-fit text-xs capitalize ${status.className}`}>
                            {status.label}
                          </Badge>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {record.request_type}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-primary">
                          {record.points_amount.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums md:table-cell">
                          {record.cash_amount === null
                            ? '—'
                            : formatCurrency(record.cash_amount, record.currency_code)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDashboardDateFr(record.requested_at)}
                        </TableCell>
                        <TableCell className="hidden max-w-[10rem] truncate text-muted-foreground xl:table-cell">
                          {record.approved_by_name ?? 'Pending'}
                        </TableCell>
                        <TableCell className="pe-2 text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground"
                                aria-label={`Actions for payout ${record.id}`}
                              >
                                <MoreHorizontal className="size-4" aria-hidden />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[11rem]">
                              <DropdownMenuItem asChild>
                                <Link to={`/payouts/${record.id}`}>Open detail</Link>
                              </DropdownMenuItem>
                              {(record.status === 'requested' && canApprove) ||
                              (record.status === 'requested' && canReject) ||
                              (record.status === 'approved' && canApprove) ||
                              (['approved', 'processing'].includes(record.status) && canApprove) ||
                              canCancel ? (
                                <DropdownMenuSeparator />
                              ) : null}
                              {record.status === 'requested' && canApprove ? (
                                <DropdownMenuItem disabled={isBusy} onClick={() => approveMutation.mutate(record.id)}>
                                  Approve
                                </DropdownMenuItem>
                              ) : null}
                              {record.status === 'requested' && canReject ? (
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={isBusy}
                                  onClick={() => rejectMutation.mutate(record.id)}
                                >
                                  Reject
                                </DropdownMenuItem>
                              ) : null}
                              {record.status === 'approved' && canApprove ? (
                                <DropdownMenuItem
                                  disabled={isBusy}
                                  onClick={() => processingMutation.mutate(record.id)}
                                >
                                  Mark processing
                                </DropdownMenuItem>
                              ) : null}
                              {['approved', 'processing'].includes(record.status) && canApprove ? (
                                <DropdownMenuItem disabled={isBusy} onClick={() => completeMutation.mutate(record.id)}>
                                  Complete
                                </DropdownMenuItem>
                              ) : null}
                              {canCancel ? (
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={isBusy}
                                  onClick={() => cancelMutation.mutate(record.id)}
                                >
                                  Cancel
                                </DropdownMenuItem>
                              ) : null}
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
        )}
      </article>
    </section>
  )
}
