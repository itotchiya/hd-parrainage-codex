import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Coins,
  Eye,
  Gift,
  Loader2,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  WalletCards,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthSession } from '@/features/auth/session'
import { KpiCard, KpiCardSkeleton, kpiSnapshotBadge } from '@/features/dashboard/components/KpiCard'
import { DashboardSectionHeader } from '@/features/dashboard/components/DashboardSectionHeader'
import { formatDashboardDateTimeFr } from '@/features/dashboard/utils/semanticBadges'
import { fetchPointsByProgram, fetchPointsSummary } from '@/features/points/api'
import { ApiError } from '@/lib/api'
import type { ExchangeRequestRecord, ExchangeRequestStatus } from '@/types/exchanges'

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

type ExchangeSortKey =
  | 'request'
  | 'status'
  | 'agent'
  | 'program'
  | 'points'
  | 'requested'
  | 'reviewer'

const statusPresentation: Record<ExchangeRequestStatus, { label: string; className: string }> = {
  requested: {
    label: 'Demandée',
    className:
      'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
  approved: {
    label: 'Approuvée',
    className:
      'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  },
  rejected: {
    label: 'Refusée',
    className:
      'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  },
  processing: {
    label: 'En traitement',
    className:
      'border-transparent bg-indigo-500/15 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
  },
  completed: {
    label: 'Terminée',
    className:
      'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  cancelled: {
    label: 'Annulée',
    className: 'border-transparent bg-muted text-muted-foreground',
  },
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
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

function exchangeRequestTitle(record: ExchangeRequestRecord) {
  return record.request_type === 'reward'
    ? record.requested_reward_title ?? record.exchange_pack_item_title ?? 'Demande de récompense'
    : 'Demande cash'
}

function requestTypeLabel(record: ExchangeRequestRecord) {
  return record.request_type === 'reward' ? 'Récompense' : 'Cash'
}

function requestValueLabel(record: ExchangeRequestRecord) {
  if (record.request_type === 'reward') {
    return record.requested_reward_title ?? record.exchange_pack_item_title ?? 'Catalogue programme'
  }

  return record.cash_amount === null
    ? 'Montant en attente'
    : formatCurrency(record.cash_amount, record.currency_code)
}

function reviewerLabel(record: ExchangeRequestRecord) {
  if (record.status === 'requested') return 'Action requise'
  if (record.status === 'approved') return 'Validée, en attente de traitement'
  if (record.status === 'processing') return 'Fulfillment en cours'
  if (record.status === 'completed') return 'Traitée'
  if (record.status === 'rejected') return 'Refusée'
  return 'Annulée'
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
      : key === 'points'
        ? left.points_amount - right.points_amount
        : key === 'status'
          ? statusSortOrder[left.status] - statusSortOrder[right.status]
          : key === 'agent'
            ? (left.agent_name ?? '').localeCompare(right.agent_name ?? '')
            : key === 'program'
              ? (left.program_name ?? '').localeCompare(right.program_name ?? '')
              : key === 'reviewer'
                ? `${left.approved_by_name ?? ''} ${reviewerLabel(left)}`.localeCompare(
                    `${right.approved_by_name ?? ''} ${reviewerLabel(right)}`,
                  )
                : `${exchangeRequestTitle(left)} ${left.id}`.localeCompare(
                    `${exchangeRequestTitle(right)} ${right.id}`,
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

function ExchangesPageSkeleton({ isAgentView }: { isAgentView: boolean }) {
  return (
    <section className="app-section">
      <PageHeader
        title={<Skeleton className="h-6 w-40" />}
        right={
          <PageHeaderToolbar>
            {isAgentView ? <Skeleton className="h-8 w-36 rounded-md" /> : null}
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Skeleton className="h-8 w-full sm:w-[240px]" />
            <Skeleton className="h-8 w-full sm:w-[150px]" />
            <Skeleton className="h-8 w-full sm:w-[150px]" />
            {!isAgentView ? <Skeleton className="h-8 w-full sm:w-[150px]" /> : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-11 bg-muted/30" />
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-16 border-t border-border/50 bg-card/70 first:border-t-0" />
          ))}
        </div>
      </article>
    </section>
  )
}

export function ExchangesPage() {
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuthSession()
  const isAgentView = Boolean(user?.agent_profile)
  const canCreateReward = isAgentView && hasPermission('exchange-request.create-reward')
  const canCreateCash = isAgentView && hasPermission('exchange-request.create-cash')
  const canCreate = canCreateReward || canCreateCash
  const canApprove = hasPermission('exchange-request.approve')
  const canReject = hasPermission('exchange-request.reject')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ExchangeRequestStatus>('all')
  const [programFilter, setProgramFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<ExchangeSortKey>('requested')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [requestType, setRequestType] = useState<'reward' | 'cash'>('reward')
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [pointsAmount, setPointsAmount] = useState('100')
  const [rewardItemId, setRewardItemId] = useState('')
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)

  useEffect(() => {
    if (!canCreateReward && canCreateCash) setRequestType('cash')
    if (!canCreateCash && canCreateReward) setRequestType('reward')
  }, [canCreateCash, canCreateReward])

  const exchangesQuery = useQuery({
    queryKey: ['exchange-requests', 'list'],
    queryFn: fetchExchangeRequests,
    refetchInterval: 30_000,
  })

  const programBalancesQuery = useQuery({
    queryKey: ['points', 'by-program', 'exchange-request-dialog'],
    queryFn: () => fetchPointsByProgram(),
    enabled: canCreate,
  })

  const pointsSummaryQuery = useQuery({
    queryKey: ['points', 'summary', 'exchanges-page'],
    queryFn: () => fetchPointsSummary(),
    enabled: true,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProgramId) {
        throw new ApiError(422, { message: 'Sélectionnez un programme.' })
      }

      if (requestType === 'reward') {
        if (!rewardItemId) {
          throw new ApiError(422, { message: 'Sélectionnez une récompense.' })
        }

        return createRewardExchangeRequest({
          program_id: selectedProgramId,
          exchange_pack_item_id: rewardItemId,
          notes: notes.trim() || undefined,
        })
      }

      const parsedPoints = Number(pointsAmount)
      if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
        throw new ApiError(422, { message: 'Le nombre de points doit être supérieur à zéro.' })
      }

      if (selectedProgram && parsedPoints > selectedProgram.available_points) {
        throw new ApiError(422, {
          message: `Vous ne pouvez demander que ${selectedProgram.available_points.toLocaleString('fr-FR')} pts sur ce programme.`,
        })
      }

      return createCashExchangeRequest({
        program_id: selectedProgramId,
        points_amount: parsedPoints,
        notes: notes.trim() || undefined,
      })
    },
    onSuccess: async () => {
      setFeedback('Demande envoyée.')
      setSelectedProgramId('')
      setRewardItemId('')
      setNotes('')
      setPointsAmount('100')
      setIsCreateOpen(false)
      await invalidateExchangeQueries(queryClient)
    },
    onError: (error) => {
      const apiError = error as ApiError
      const firstFieldMessage = apiError.errors
        ? Object.values(apiError.errors).flat()[0]
        : null

      setFeedback(firstFieldMessage ?? apiError.message)
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
    onSettled: () => setActiveActionId(null),
  })

  const rejectMutation = useMutation({
    mutationFn: async (exchangeRequestId: string) => {
      setActiveActionId(exchangeRequestId)
      return rejectExchangeRequest(exchangeRequestId)
    },
    onSuccess: async () => {
      await invalidateExchangeQueries(queryClient)
    },
    onSettled: () => setActiveActionId(null),
  })

  const processingMutation = useMutation({
    mutationFn: async (exchangeRequestId: string) => {
      setActiveActionId(exchangeRequestId)
      return markExchangeRequestProcessing(exchangeRequestId)
    },
    onSuccess: async () => {
      await invalidateExchangeQueries(queryClient)
    },
    onSettled: () => setActiveActionId(null),
  })

  const completeMutation = useMutation({
    mutationFn: async (exchangeRequestId: string) => {
      setActiveActionId(exchangeRequestId)
      return completeExchangeRequest(exchangeRequestId)
    },
    onSuccess: async () => {
      await invalidateExchangeQueries(queryClient)
    },
    onSettled: () => setActiveActionId(null),
  })

  const cancelMutation = useMutation({
    mutationFn: async (exchangeRequestId: string) => {
      setActiveActionId(exchangeRequestId)
      return cancelExchangeRequest(exchangeRequestId)
    },
    onSuccess: async () => {
      await invalidateExchangeQueries(queryClient)
    },
    onSettled: () => setActiveActionId(null),
  })

  const requests = exchangesQuery.data?.data ?? []
  const programBalances = programBalancesQuery.data?.data ?? []
  const pointsSummary = pointsSummaryQuery.data?.data

  function resetCreateDialog() {
    setCreateStep(1)
    setRequestType(canCreateReward ? 'reward' : 'cash')
    setSelectedProgramId('')
    setRewardItemId('')
    setNotes('')
    setPointsAmount('100')
    setFeedback(null)
  }

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((record) => {
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter
      const matchesProgram = programFilter === 'all' || record.program_id === programFilter
      const matchesAgent = isAgentView || agentFilter === 'all' || record.agent_id === agentFilter
      const matchesSearch =
        q.length === 0 ||
        exchangeRequestTitle(record).toLowerCase().includes(q) ||
        (record.program_name ?? '').toLowerCase().includes(q) ||
        (record.agent_name ?? '').toLowerCase().includes(q) ||
        (record.business_name ?? '').toLowerCase().includes(q) ||
        (record.requested_reward_title ?? '').toLowerCase().includes(q)

      return matchesStatus && matchesProgram && matchesAgent && matchesSearch
    })
  }, [agentFilter, isAgentView, programFilter, requests, search, statusFilter])

  const sortedRequests = useMemo(
    () =>
      [...filteredRequests].sort((left, right) =>
        compareExchangeRequests(left, right, sortKey, sortDirection),
      ),
    [filteredRequests, sortDirection, sortKey],
  )

  function handleSort(nextKey: ExchangeSortKey) {
    setPage(1)
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextKey)
    setSortDirection(['points', 'requested'].includes(nextKey) ? 'desc' : 'asc')
  }

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, programFilter, agentFilter])

  const totalItems = sortedRequests.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedRequests.slice(start, start + pageSize)
  }, [pageSize, safePage, sortedRequests])

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const selectablePrograms = useMemo(
    () =>
      programBalances.filter(
        (program) => program.available_points > 0 && (program.program_status ?? 'active') === 'active',
      ),
    [programBalances],
  )

  const selectedProgram = selectablePrograms.find((program) => program.program_id === selectedProgramId)
  const selectedPackItems = selectedProgram?.exchange_pack_items ?? []
  const supportedRequestTypes = useMemo<Array<'reward' | 'cash'>>(() => {
    if (!selectedProgram) return []

    const hasRewardItems = selectedPackItems.length > 0
    const hasCashConversion =
      typeof selectedProgram.points_per_euro === 'number' && selectedProgram.points_per_euro > 0

    if (selectedProgram.exchange_mode === 'both') {
      if (hasRewardItems && hasCashConversion) return ['reward', 'cash']
      if (hasRewardItems) return ['reward']
      if (hasCashConversion) return ['cash']
      return []
    }
    if (selectedProgram.exchange_mode === 'cash') return hasCashConversion ? ['cash'] : []
    return hasRewardItems ? ['reward'] : []
  }, [selectedPackItems.length, selectedProgram])

  useEffect(() => {
    if (!isCreateOpen) {
      resetCreateDialog()
    }
  }, [isCreateOpen])

  useEffect(() => {
    if (!selectedProgram) return
    if (supportedRequestTypes.length === 0) return
    if (!supportedRequestTypes.includes(requestType)) {
      setRequestType(supportedRequestTypes[0])
      setRewardItemId('')
    }
  }, [requestType, selectedProgram, supportedRequestTypes])

  const programOptions = useMemo(
    () =>
      Array.from(
        new Map(
          requests
            .filter((record) => record.program_id && record.program_name)
            .map((record) => [record.program_id, { id: record.program_id!, name: record.program_name ?? 'Programme' }]),
        ).values(),
      ).sort((left, right) => left.name.localeCompare(right.name)),
    [requests],
  )

  const agentOptions = useMemo(
    () =>
      Array.from(
        new Map(
          requests
            .filter((record) => record.agent_id && record.agent_name)
            .map((record) => [record.agent_id, { id: record.agent_id, name: record.agent_name ?? 'Affilié' }]),
        ).values(),
      ).sort((left, right) => left.name.localeCompare(right.name)),
    [requests],
  )

  const requestedCount = requests.filter((record) => record.status === 'requested').length
  const inFulfillmentCount = requests.filter((record) =>
    ['approved', 'processing'].includes(record.status),
  ).length
  const completedCount = requests.filter((record) => record.status === 'completed').length
  const totalPointsRequested = requests.reduce((sum, record) => sum + record.points_amount, 0)
  const totalWalletPoints = isAgentView
    ? (pointsSummary?.available_points ?? 0)
    : 0
  const totalAvailablePoints = !isAgentView
    ? (pointsSummary?.available_points ?? 0)
    : 0
  const selectedReward = selectedPackItems.find((item) => item.id === rewardItemId)
  const parsedPointsAmount = Number(pointsAmount)
  const selectedProgramAvailablePoints = selectedProgram?.available_points ?? 0
  const requestedPointsAmount =
    requestType === 'reward'
      ? (selectedReward?.points_cost ?? 0)
      : Number.isFinite(parsedPointsAmount)
        ? parsedPointsAmount
        : 0
  const exceedsProgramBalance =
    Boolean(selectedProgram) &&
    requestedPointsAmount > 0 &&
    requestedPointsAmount > selectedProgramAvailablePoints
  const canContinueFromProgram = Boolean(selectedProgram)
  const canContinueFromDetails =
    Boolean(selectedProgram) &&
    (requestType === 'reward'
      ? Boolean(rewardItemId) && !exceedsProgramBalance
      : Number.isFinite(parsedPointsAmount) &&
        parsedPointsAmount > 0 &&
        !exceedsProgramBalance)

  if (exchangesQuery.isPending) {
    return <ExchangesPageSkeleton isAgentView={isAgentView} />
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
        title={isAgentView ? 'My exchanges' : 'Exchange operations'}
        titleAddon={<Badge variant="secondary">{isAgentView ? 'Agent view' : 'Business view'}</Badge>}
        right={
          isAgentView && canCreate ? (
            <PageHeaderToolbar>
              <Button
                type="button"
                onClick={() => {
                  resetCreateDialog()
                  setIsCreateOpen(true)
                }}
              >
                <Plus className="mr-2 size-4" />
                New request
              </Button>
            </PageHeaderToolbar>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {isAgentView ? (
          <>
            <KpiCard
              title="Wallet"
              value={`${totalWalletPoints.toLocaleString('fr-FR')} pts`}
              description="Spendable points across all programs"
              badge={kpiSnapshotBadge('Total')}
              icon={WalletCards}
              tone="primary"
            />
            <KpiCard
              title="My requests"
              value={requests.length.toLocaleString('fr-FR')}
              description="Submitted exchange requests"
              badge={kpiSnapshotBadge('Workflow')}
              icon={Coins}
              tone="primary"
            />
            <KpiCard
              title="Pending approval"
              value={requestedCount.toLocaleString('fr-FR')}
              description="Waiting owner review"
              badge={kpiSnapshotBadge('Review')}
              icon={Clock3}
              tone="warning"
            />
            <KpiCard
              title="In fulfillment"
              value={inFulfillmentCount.toLocaleString('fr-FR')}
              description="Approved or processing"
              badge={kpiSnapshotBadge('Execution')}
              icon={Loader2}
              tone="info"
            />
            <KpiCard
              title="Completed"
              value={completedCount.toLocaleString('fr-FR')}
              description="Successfully fulfilled"
              badge={kpiSnapshotBadge('Fulfilled')}
              icon={CheckCircle2}
              tone="success"
            />
          </>
        ) : (
          <>
            <KpiCard
              title="Queue total"
              value={requests.length.toLocaleString('fr-FR')}
              description="Open and historical requests"
              badge={kpiSnapshotBadge('Workflow')}
              icon={WalletCards}
              tone="primary"
            />
            <KpiCard
              title="Available wallet"
              value={`${totalAvailablePoints.toLocaleString('fr-FR')} pts`}
              description="Spendable across affiliates"
              badge={kpiSnapshotBadge('Wallet')}
              icon={Coins}
              tone="primary"
            />
            <KpiCard
              title="Pending approval"
              value={requestedCount.toLocaleString('fr-FR')}
              description="Needs review now"
              badge={kpiSnapshotBadge('Review')}
              icon={Clock3}
              tone="warning"
            />
            <KpiCard
              title="In fulfillment"
              value={inFulfillmentCount.toLocaleString('fr-FR')}
              description="Approved or processing"
              badge={kpiSnapshotBadge('Execution')}
              icon={Loader2}
              tone="info"
            />
            <KpiCard
              title="Requested points"
              value={`${totalPointsRequested.toLocaleString('fr-FR')} pts`}
              description="Total points requested"
              badge={kpiSnapshotBadge('Liability')}
              icon={Coins}
              tone="primary"
            />
          </>
        )}
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader
          title={isAgentView ? 'My exchange requests' : 'Exchange operations queue'}
          description={
            isAgentView
              ? 'Track approval, fulfillment, and the requests you can still cancel.'
              : 'Review incoming requests, move them into fulfillment, and complete the lifecycle cleanly.'
          }
        />

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="relative w-full sm:max-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isAgentView ? 'Search my requests...' : 'Search the queue...'}
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as 'all' | ExchangeRequestStatus)}
          >
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(statusPresentation).map(([value, presentation]) => (
                  <SelectItem key={value} value={value}>
                    {presentation.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Program</SelectLabel>
                <SelectItem value="all">All programs</SelectItem>
                {programOptions.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {!isAgentView ? (
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All affiliates" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Affiliate</SelectLabel>
                  <SelectItem value="all">All affiliates</SelectItem>
                  {agentOptions.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
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
                {!isAgentView ? (
                  <SortableTableHead
                    sortKey="agent"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  >
                    Affiliate
                  </SortableTableHead>
                ) : null}
                <SortableTableHead
                  sortKey="program"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Program
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
                <TableHead>{isAgentView ? 'Cash / reward' : 'Reviewer / fulfillment'}</TableHead>
                <SortableTableHead
                  sortKey="requested"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                  align="right"
                >
                  Requested
                </SortableTableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageSlice.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAgentView ? 7 : 8}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    {isAgentView
                      ? canCreate
                        ? 'No requests match the current filters. Start a new exchange when you are ready.'
                        : 'No requests match the current filters.'
                      : 'No exchange requests match the current queue filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                pageSlice.map((record) => {
                  const status = statusPresentation[record.status]
                  const canCancel =
                    (record.requested_by_user_id === user?.id ||
                      record.agent_id === user?.agent_profile?.id) &&
                    ['requested', 'approved', 'processing'].includes(record.status)
                  const isBusy = activeActionId === record.id

                  return (
                    <TableRow key={record.id}>
                      <TableCell className="min-w-[220px]">
                        <div className="space-y-1">
                          <Link
                            to={`/payouts/${record.id}`}
                            className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-border transition hover:text-primary hover:decoration-primary"
                          >
                            {exchangeRequestTitle(record)}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {requestTypeLabel(record)} • {record.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.className}>{status.label}</Badge>
                      </TableCell>
                      {!isAgentView ? (
                        <TableCell className="min-w-[180px]">
                          {record.agent_id ? (
                            <Link
                              to={`/agents/${record.agent_id}`}
                              className="text-sm font-medium text-foreground underline underline-offset-4 decoration-border transition hover:text-primary hover:decoration-primary"
                            >
                              {record.agent_name ?? 'Affiliate'}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">No affiliate</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="min-w-[180px]">
                        {record.program_id ? (
                          <Link
                            to={`/programs/${record.program_id}`}
                            className="text-sm font-medium text-foreground underline underline-offset-4 decoration-border transition hover:text-primary hover:decoration-primary"
                          >
                            {record.program_name ?? 'Program'}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">No program</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-foreground">
                        {record.points_amount.toLocaleString('fr-FR')} pts
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {isAgentView ? requestValueLabel(record) : reviewerLabel(record)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isAgentView
                              ? record.request_type === 'reward'
                                ? 'Requested reward'
                                : record.cash_amount === null
                                  ? 'Cash conversion pending'
                                  : formatCurrency(record.cash_amount, record.currency_code)
                              : record.approved_by_name ?? 'No reviewer assigned'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDashboardDateTimeFr(record.requested_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider delayDuration={150}>
                          <div className="flex justify-end gap-2">
                            <div className="hidden items-center gap-2 md:flex">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="icon-sm"
                                    className="border border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                                  >
                                    <Link to={`/payouts/${record.id}`} aria-label="View request">
                                      <Eye className="size-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View request</TooltipContent>
                              </Tooltip>
                              {!isAgentView && record.status === 'requested' && canApprove ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={isBusy}
                                      className="border border-emerald-500/30 text-emerald-600 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-400"
                                      onClick={() => approveMutation.mutate(record.id)}
                                      aria-label="Approve request"
                                    >
                                      <CheckCircle2 className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Approve request</TooltipContent>
                                </Tooltip>
                              ) : null}
                              {!isAgentView && record.status === 'requested' && canReject ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={isBusy}
                                      className="border border-red-500/30 text-red-600 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 dark:text-red-400"
                                      onClick={() => rejectMutation.mutate(record.id)}
                                      aria-label="Reject request"
                                    >
                                      <X className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reject request</TooltipContent>
                                </Tooltip>
                              ) : null}
                              {!isAgentView && record.status === 'approved' && canApprove ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={isBusy}
                                      className="border border-amber-500/30 text-amber-600 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-500 dark:text-amber-400"
                                      onClick={() => processingMutation.mutate(record.id)}
                                      aria-label="Start fulfilment"
                                    >
                                      <Play className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Start fulfilment</TooltipContent>
                                </Tooltip>
                              ) : null}
                              {!isAgentView && record.status === 'processing' && canApprove ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={isBusy}
                                      className="border border-emerald-500/30 text-emerald-600 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-400"
                                      onClick={() => completeMutation.mutate(record.id)}
                                      aria-label="Complete request"
                                    >
                                      <CheckCircle2 className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Complete request</TooltipContent>
                                </Tooltip>
                              ) : null}
                              {isAgentView && canCancel ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={isBusy}
                                      className="border border-red-500/30 text-red-600 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 dark:text-red-400"
                                      onClick={() => cancelMutation.mutate(record.id)}
                                      aria-label="Cancel request"
                                    >
                                      <X className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Cancel request</TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={isBusy}
                                  className="md:hidden"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/payouts/${record.id}`}>
                                    <Eye className="size-4 text-primary" />
                                    <span>View request</span>
                                  </Link>
                                </DropdownMenuItem>
                                {!isAgentView && record.status === 'requested' && canApprove ? (
                                  <DropdownMenuItem
                                    className="text-emerald-600 focus:text-emerald-600 dark:text-emerald-400 dark:focus:text-emerald-400"
                                    onClick={() => approveMutation.mutate(record.id)}
                                  >
                                    <CheckCircle2 className="size-4 text-emerald-500" />
                                    <span>Approve</span>
                                  </DropdownMenuItem>
                                ) : null}
                                {!isAgentView && record.status === 'requested' && canReject ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => rejectMutation.mutate(record.id)}
                                  >
                                    <X className="size-4 text-destructive" />
                                    <span>Reject</span>
                                  </DropdownMenuItem>
                                ) : null}
                                {!isAgentView && record.status === 'approved' && canApprove ? (
                                  <DropdownMenuItem
                                    className="text-amber-600 focus:text-amber-600 dark:text-amber-400 dark:focus:text-amber-400"
                                    onClick={() => processingMutation.mutate(record.id)}
                                  >
                                    <Play className="size-4 text-amber-500" />
                                    <span>Start fulfilment</span>
                                  </DropdownMenuItem>
                                ) : null}
                                {!isAgentView &&
                                ['approved', 'processing'].includes(record.status) &&
                                canApprove ? (
                                  <DropdownMenuItem
                                    className="text-emerald-600 focus:text-emerald-600 dark:text-emerald-400 dark:focus:text-emerald-400"
                                    onClick={() => completeMutation.mutate(record.id)}
                                  >
                                    <CheckCircle2 className="size-4 text-emerald-500" />
                                    <span>Complete request</span>
                                  </DropdownMenuItem>
                                ) : null}
                                {isAgentView && canCancel ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => cancelMutation.mutate(record.id)}
                                    >
                                      <X className="size-4 text-destructive" />
                                      <span>Cancel request</span>
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <TablePaginationBar
          page={safePage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          className="mt-2"
        />
      </article>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) resetCreateDialog()
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New exchange request</DialogTitle>
            <DialogDescription>
              Build your request step by step from the program balance you want to use.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-0">
            {[
              { step: 1, title: 'Programme' },
              { step: 2, title: 'Demande' },
              { step: 3, title: 'Aperçu' },
            ].map((item, index, array) => {
              const isActive = createStep === item.step
              const isDone = createStep > item.step
              return (
                <div key={item.step} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        isDone
                          ? 'bg-primary text-primary-foreground'
                          : isActive
                            ? 'border-2 border-primary bg-primary/10 text-primary'
                            : 'border-2 border-border bg-background text-muted-foreground'
                      }`}
                    >
                      {item.step}
                    </div>
                    <span
                      className={`text-[10px] font-medium whitespace-nowrap ${
                        createStep >= item.step ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                  {index < array.length - 1 ? (
                    <div
                      className={`mx-2 mb-5 h-px w-12 transition-colors ${
                        createStep > item.step ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>

          {createStep === 1 ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Select a program</h3>
                <p className="text-sm text-muted-foreground">
                  Start from the program balance you want to use for this request.
                </p>
              </div>

              <div className="space-y-2">
                {selectablePrograms.length === 0 ? (
                  <div className="rounded-lg bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                    No program currently has points ready for an exchange request.
                  </div>
                ) : (
                  selectablePrograms.map((program) => {
                    const isSelected = selectedProgramId === program.program_id
                    return (
                      <button
                        key={program.program_id}
                        type="button"
                        className={`group flex w-full cursor-pointer items-center justify-between rounded-lg border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          isSelected
                            ? 'border-primary/40 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'
                            : 'border-border/60 bg-muted/20 hover:border-primary/20 hover:bg-muted/40'
                        }`}
                        onClick={() => {
                          setSelectedProgramId(program.program_id)
                          setRewardItemId('')
                          setFeedback(null)
                        }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-foreground">
                              {program.program_name ?? 'Program'}
                            </div>
                            {isSelected ? (
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {program.exchange_pack_name ?? 'Exchange catalog'} •{' '}
                            {program.exchange_mode === 'both'
                              ? 'Reward + cash'
                              : program.exchange_mode === 'cash'
                                ? 'Cash'
                                : 'Reward'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-foreground">
                            {program.available_points.toLocaleString('fr-FR')} pts
                          </div>
                          <div className="text-xs text-muted-foreground transition group-hover:text-foreground/80">
                            Click to use this balance
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : null}

          {createStep === 2 ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selectedProgram?.program_name ?? 'Program'}
                </span>{' '}
                •{' '}
                <span className="font-medium text-foreground">
                  {selectedProgram?.available_points.toLocaleString('fr-FR') ?? '0'} pts
                </span>{' '}
                available
              </div>

              {supportedRequestTypes.length === 0 ? (
                <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  This program has no active exchange option available right now.
                </div>
              ) : null}

              <div className="space-y-2">
                <FieldLabel>Request method</FieldLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {supportedRequestTypes.includes('reward') && canCreateReward ? (
                    <button
                      type="button"
                      className={`flex w-full items-start gap-3 rounded-lg border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        requestType === 'reward'
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-border/60 bg-muted/20 hover:border-primary/20 hover:bg-muted/40'
                      }`}
                      onClick={() => {
                        setRequestType('reward')
                        setFeedback(null)
                      }}
                    >
                      <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                        <Gift className="size-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-foreground">Reward</div>
                        <div className="text-xs text-muted-foreground">
                          Exchange points for a catalog reward.
                        </div>
                      </div>
                    </button>
                  ) : null}

                  {supportedRequestTypes.includes('cash') && canCreateCash ? (
                    <button
                      type="button"
                      className={`flex w-full items-start gap-3 rounded-lg border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        requestType === 'cash'
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-border/60 bg-muted/20 hover:border-primary/20 hover:bg-muted/40'
                      }`}
                      onClick={() => {
                        setRequestType('cash')
                        setRewardItemId('')
                        setFeedback(null)
                      }}
                    >
                      <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                        <Banknote className="size-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-foreground">Cash</div>
                        <div className="text-xs text-muted-foreground">
                          Convert points into a cash request.
                        </div>
                      </div>
                    </button>
                  ) : null}
                </div>
              </div>

              {requestType === 'reward' ? (
                <Field>
                  <FieldLabel>Reward</FieldLabel>
                  <Select value={rewardItemId} onValueChange={setRewardItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reward" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available rewards</SelectLabel>
                        {selectedPackItems.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            No reward available
                          </SelectItem>
                        ) : null}
                        {selectedPackItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.title} • {item.points_cost.toLocaleString('fr-FR')} pts
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <Field>
                  <FieldLabel>Points to convert</FieldLabel>
                  <Input
                    value={pointsAmount}
                    onChange={(event) => setPointsAmount(event.target.value)}
                    inputMode="numeric"
                    placeholder="100"
                  />
                </Field>
              )}

              {selectedProgram && exceedsProgramBalance ? (
                <div className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                  This request exceeds the selected program balance. You can use up to{' '}
                  <span className="font-semibold">
                    {selectedProgramAvailablePoints.toLocaleString('fr-FR')} pts
                  </span>
                  .
                </div>
              ) : null}
            </div>
          ) : null}

          {createStep === 3 ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 px-4 py-4 text-sm">
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Programme
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {selectedProgram?.program_name ?? 'Program'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Solde
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {selectedProgram?.available_points.toLocaleString('fr-FR') ?? '0'} pts
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Type
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {requestType === 'reward' ? 'Récompense' : 'Cash'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Sélection
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {requestType === 'reward'
                        ? selectedReward?.title ?? 'Aucune récompense'
                        : `${Number(pointsAmount || 0).toLocaleString('fr-FR')} pts`}
                    </div>
                  </div>
                </div>
              </div>

              <Field>
                <FieldLabel>Notes</FieldLabel>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional context for the owner..."
                />
              </Field>
            </div>
          ) : null}

          {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              {createStep > 1 ? (
                <Button type="button" variant="outline" onClick={() => setCreateStep((step) => step - 1)}>
                  Back
                </Button>
              ) : null}
            </div>

            {createStep < 3 ? (
              <Button
                type="button"
                onClick={() => setCreateStep((step) => step + 1)}
                disabled={createStep === 1 ? !canContinueFromProgram : !canContinueFromDetails}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !selectedProgramId || !canContinueFromDetails}
              >
                {createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Submit request
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

