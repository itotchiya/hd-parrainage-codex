import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Coins,
  Eye,
  FilterX,
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
import { parseISO, startOfDay, endOfDay } from 'date-fns'

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
import { useTranslation } from 'react-i18next'
import { KpiCard, KpiCardSkeleton } from '@/features/dashboard/components/KpiCard'
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

function getStatusPresentation(t: (key: string) => string): Record<ExchangeRequestStatus, { label: string; className: string }> {
  return {
    requested: {
      label: t('exchanges.status.requested'),
      className:
        'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
    },
    approved: {
      label: t('exchanges.status.approved'),
      className:
        'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
    },
    rejected: {
      label: t('exchanges.status.rejected'),
      className:
        'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
    },
    processing: {
      label: t('exchanges.status.processing'),
      className:
        'border-transparent bg-indigo-500/15 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
    },
    completed: {
      label: t('exchanges.status.completed'),
      className:
        'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
    cancelled: {
      label: t('exchanges.status.cancelled'),
      className: 'border-transparent bg-muted text-muted-foreground',
    },
  }
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

function exchangeRequestTitle(record: ExchangeRequestRecord, t: (key: string) => string) {
  return record.request_type === 'reward'
    ? record.requested_reward_title ?? record.exchange_pack_item_title ?? t('exchanges.request.rewardDefault')
    : t('exchanges.request.cashDefault')
}

function requestTypeLabel(type: 'reward' | 'cash', t: (key: string) => string) {
  return type === 'reward' ? t('exchanges.requestType.reward') : t('exchanges.requestType.cash')
}

function requestValueLabel(record: ExchangeRequestRecord, t: (key: string) => string) {
  if (record.request_type === 'reward') {
    return record.requested_reward_title ?? record.exchange_pack_item_title ?? t('exchanges.value.catalogDefault')
  }

  return record.cash_amount === null
    ? t('exchanges.value.amountPending')
    : formatCurrency(record.cash_amount, record.currency_code)
}

function reviewerLabel(status: ExchangeRequestStatus, t: (key: string) => string) {
  if (status === 'requested') return t('exchanges.reviewer.requested')
  if (status === 'approved') return t('exchanges.reviewer.approved')
  if (status === 'processing') return t('exchanges.reviewer.processing')
  if (status === 'completed') return t('exchanges.reviewer.completed')
  if (status === 'rejected') return t('exchanges.reviewer.rejected')
  return t('exchanges.reviewer.cancelled')
}

function compareExchangeRequests(
  left: ExchangeRequestRecord,
  right: ExchangeRequestRecord,
  key: ExchangeSortKey,
  direction: SortDirection,
  t: (key: string) => string,
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
                ? `${left.approved_by_name ?? ''} ${reviewerLabel(left.status, t)}`.localeCompare(
                    `${right.approved_by_name ?? ''} ${reviewerLabel(right.status, t)}`,
                  )
                : `${exchangeRequestTitle(left, t)} ${left.id}`.localeCompare(
                    `${exchangeRequestTitle(right, t)} ${right.id}`,
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
  const { t } = useTranslation()
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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<ExchangeSortKey>('requested')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const hasActiveFilters = search !== '' || statusFilter !== 'all' || programFilter !== 'all' || agentFilter !== 'all' || dateFrom !== '' || dateTo !== ''

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!canCreateReward && canCreateCash) setRequestType('cash')
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        throw new ApiError(422, { message: t('exchanges.errors.selectProgram') })
      }

      if (requestType === 'reward') {
        if (!rewardItemId) {
          throw new ApiError(422, { message: t('exchanges.errors.selectReward') })
        }

        return createRewardExchangeRequest({
          program_id: selectedProgramId,
          exchange_pack_item_id: rewardItemId,
          notes: notes.trim() || undefined,
        })
      }

      const parsedPoints = Number(pointsAmount)
      if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
        throw new ApiError(422, { message: t('exchanges.errors.pointsPositive') })
      }

      if (selectedProgram && parsedPoints > selectedProgram.available_points) {
        throw new ApiError(422, {
          message: t('exchanges.errors.pointsExceed', { max: selectedProgram.available_points.toLocaleString('fr-FR') }),
        })
      }

      return createCashExchangeRequest({
        program_id: selectedProgramId,
        points_amount: parsedPoints,
        notes: notes.trim() || undefined,
      })
    },
    onSuccess: async () => {
      setFeedback(t('exchanges.feedback.requestSent'))
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

  const requests = useMemo(() => exchangesQuery.data?.data ?? [], [exchangesQuery.data])
  const programBalances = useMemo(() => programBalancesQuery.data?.data ?? [], [programBalancesQuery.data])
  const pointsSummary = pointsSummaryQuery.data?.data

  const resetCreateDialog = useCallback(() => {
    setCreateStep(1)
    setRequestType(canCreateReward ? 'reward' : 'cash')
    setSelectedProgramId('')
    setRewardItemId('')
    setNotes('')
    setPointsAmount('100')
    setFeedback(null)
  }, [canCreateReward])

  const kpiFilteredRequests = useMemo(() => {
    return requests.filter((record) => {
      const matchesProgram = programFilter === 'all' || record.program_id === programFilter
      const matchesAgent = isAgentView || agentFilter === 'all' || record.agent_id === agentFilter
      return matchesProgram && matchesAgent
    })
  }, [agentFilter, isAgentView, programFilter, requests])

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((record) => {
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter
      const matchesProgram = programFilter === 'all' || record.program_id === programFilter
      const matchesAgent = isAgentView || agentFilter === 'all' || record.agent_id === agentFilter
      
      const d = record.created_at ? parseISO(record.created_at) : null
      const matchesDateFrom = !dateFrom || (d && d >= startOfDay(parseISO(dateFrom)))
      const matchesDateTo = !dateTo || (d && d <= endOfDay(parseISO(dateTo)))

      const matchesSearch =
        q.length === 0 ||
        exchangeRequestTitle(record, t).toLowerCase().includes(q) ||
        (record.program_name ?? '').toLowerCase().includes(q) ||
        (record.agent_name ?? '').toLowerCase().includes(q) ||
        (record.business_name ?? '').toLowerCase().includes(q) ||
        (record.requested_reward_title ?? '').toLowerCase().includes(q)

      return matchesStatus && matchesProgram && matchesAgent && matchesDateFrom && matchesDateTo && matchesSearch
    })
  }, [agentFilter, isAgentView, programFilter, requests, search, statusFilter, dateFrom, dateTo])

  const sortedRequests = useMemo(
    () =>
      [...filteredRequests].sort((left, right) =>
        compareExchangeRequests(left, right, sortKey, sortDirection, t),
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [search, statusFilter, programFilter, agentFilter, dateFrom, dateTo])

  const totalItems = sortedRequests.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedRequests.slice(start, start + pageSize)
  }, [pageSize, safePage, sortedRequests])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetCreateDialog()
    }
  }, [isCreateOpen, resetCreateDialog])

  useEffect(() => {
    if (!selectedProgram) return
    if (supportedRequestTypes.length === 0) return
    if (!supportedRequestTypes.includes(requestType)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRequestType(supportedRequestTypes[0])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRewardItemId('')
    }
  }, [requestType, selectedProgram, supportedRequestTypes])

  const programOptions = useMemo(
    () =>
      Array.from(
        new Map(
          requests
            .filter((record) => record.program_id && record.program_name)
            .map((record) => [record.program_id, { id: record.program_id!, name: record.program_name ?? t('exchanges.table.program') }]),
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
            .map((record) => [record.agent_id, { id: record.agent_id, name: record.agent_name ?? t('exchanges.table.affiliate') }]),
        ).values(),
      ).sort((left, right) => left.name.localeCompare(right.name)),
    [requests],
  )

  const requestedCount = kpiFilteredRequests.filter((record) => record.status === 'requested').length
  const inFulfillmentCount = kpiFilteredRequests.filter((record) =>
    ['approved', 'processing'].includes(record.status),
  ).length
  const totalPointsRequested = kpiFilteredRequests.reduce((sum, record) => sum + record.points_amount, 0)
  
  // Wallet value calculation dynamically tracking the filter
  const fetchWalletPoints = () => {
    if (programFilter === 'all') return pointsSummary?.available_points ?? 0
    return programBalances.find(p => p.program_id === programFilter)?.available_points ?? 0
  }
  
  const totalWalletPoints = isAgentView ? fetchWalletPoints() : 0
  const totalAvailablePoints = !isAgentView ? fetchWalletPoints() : 0
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
        title={isAgentView ? t('exchanges.pageTitle.agent') : t('exchanges.pageTitle.owner')}
        right={
          <PageHeaderToolbar>
            {hasActiveFilters ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setSearch('')
                        setStatusFilter('all')
                        setProgramFilter('all')
                        setAgentFilter('all')
                        setDateFrom('')
                        setDateTo('')
                      }}
                      aria-label={t('exchanges.filters.clearFilters')}
                    >
                      <FilterX className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('exchanges.filters.clearFilters')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}

            <div className="relative w-full sm:w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isAgentView ? t('exchanges.filters.searchAgentPlaceholder') : t('exchanges.filters.searchOwnerPlaceholder')}
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | ExchangeRequestStatus)}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t('exchanges.filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t('exchanges.filters.status')}</SelectLabel>
                  <SelectItem value="all">{t('exchanges.filters.allStatuses')}</SelectItem>
                  {Object.entries(getStatusPresentation(t)).map(([value, presentation]) => (
                    <SelectItem key={value} value={value}>
                      {presentation.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('exchanges.filters.allPrograms')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t('exchanges.filters.program')}</SelectLabel>
                  <SelectItem value="all">{t('exchanges.filters.allPrograms')}</SelectItem>
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
                  <SelectValue placeholder={t('exchanges.filters.allAffiliates')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{t('exchanges.filters.affiliate')}</SelectLabel>
                    <SelectItem value="all">{t('exchanges.filters.allAffiliates')}</SelectItem>
                    {agentOptions.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full sm:w-[148px]"
              aria-label={t('exchanges.filters.startDate')}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full sm:w-[148px]"
              aria-label={t('exchanges.filters.endDate')}
            />

            {isAgentView && canCreate ? (
              <Button
                type="button"
                onClick={() => {
                  resetCreateDialog()
                  setIsCreateOpen(true)
                }}
              >
                <Plus className="mr-2 size-4" />
                {t('exchanges.filters.newRequest')}
              </Button>
            ) : null}
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {isAgentView ? (
          <>
            <KpiCard
              title={t('exchanges.kpi.availableWallet.title')}
              value={`${totalWalletPoints.toLocaleString('fr-FR')} pts`}
              description={t('exchanges.kpi.availableWallet.descriptionAgent')}
              icon={WalletCards}
              tone="success"
              variant="solid"
              className="xl:col-span-3"
              isLoading={pointsSummaryQuery.isFetching && !totalWalletPoints}
            />
            <KpiCard
              title={t('exchanges.kpi.requestedPoints.title')}
              value={`${totalPointsRequested.toLocaleString('fr-FR')} pts`}
              description={t('exchanges.kpi.requestedPoints.descriptionAgent')}
              icon={Coins}
              tone="warning"
              variant="solid"
              className="xl:col-span-3"
              isLoading={exchangesQuery.isFetching && exchangesQuery.isPlaceholderData}
            />
            <KpiCard
              title={t('exchanges.kpi.queueTotal.title')}
              value={kpiFilteredRequests.length.toLocaleString('fr-FR')}
              description={t('exchanges.kpi.queueTotal.descriptionAgent')}
              icon={WalletCards}
              tone="primary"
              className="xl:col-span-2"
              isLoading={exchangesQuery.isFetching && exchangesQuery.isPlaceholderData}
            />
            <KpiCard
              title={t('exchanges.kpi.pendingApproval.title')}
              value={requestedCount.toLocaleString('fr-FR')}
              description={t('exchanges.kpi.pendingApproval.descriptionAgent')}
              icon={Clock3}
              tone="warning"
              className="xl:col-span-2"
              isLoading={exchangesQuery.isFetching && exchangesQuery.isPlaceholderData}
            />
            <KpiCard
              title={t('exchanges.kpi.inFulfillment.title')}
              value={inFulfillmentCount.toLocaleString('fr-FR')}
              description={t('exchanges.kpi.inFulfillment.description')}
              icon={Loader2}
              tone="info"
              className="xl:col-span-2"
              isLoading={exchangesQuery.isFetching && exchangesQuery.isPlaceholderData}
            />
          </>
        ) : (
          <>
            <KpiCard
              title={t('exchanges.kpi.availableWallet.title')}
              value={`${totalAvailablePoints.toLocaleString('fr-FR')} pts`}
              description={t('exchanges.kpi.availableWallet.descriptionOwner')}
              icon={Coins}
              tone="success"
              variant="solid"
              className="xl:col-span-3"
              isLoading={pointsSummaryQuery.isFetching && !totalAvailablePoints}
            />
            <KpiCard
              title={t('exchanges.kpi.requestedPoints.title')}
              value={`${totalPointsRequested.toLocaleString('fr-FR')} pts`}
              description={t('exchanges.kpi.requestedPoints.descriptionOwner')}
              icon={Coins}
              tone="warning"
              variant="solid"
              className="xl:col-span-3"
              isLoading={exchangesQuery.isFetching && exchangesQuery.isPlaceholderData}
            />
            <KpiCard
              title={t('exchanges.kpi.queueTotal.title')}
              value={kpiFilteredRequests.length.toLocaleString('fr-FR')}
              description={t('exchanges.kpi.queueTotal.descriptionOwner')}
              icon={WalletCards}
              tone="primary"
              className="xl:col-span-2"
              isLoading={exchangesQuery.isFetching && exchangesQuery.isPlaceholderData}
            />
            <KpiCard
              title={t('exchanges.kpi.pendingApproval.title')}
              value={requestedCount.toLocaleString('fr-FR')}
              description={t('exchanges.kpi.pendingApproval.descriptionOwner')}
              icon={Clock3}
              tone="warning"
              className="xl:col-span-2"
              isLoading={exchangesQuery.isFetching && exchangesQuery.isPlaceholderData}
            />
            <KpiCard
              title={t('exchanges.kpi.inFulfillment.title')}
              value={inFulfillmentCount.toLocaleString('fr-FR')}
              description={t('exchanges.kpi.inFulfillment.description')}
              icon={Loader2}
              tone="info"
              className="xl:col-span-2"
              isLoading={exchangesQuery.isFetching && exchangesQuery.isPlaceholderData}
            />
          </>
        )}
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader
          title={isAgentView ? t('exchanges.section.agent') : t('exchanges.section.owner')}
        />

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
                  {t('exchanges.table.request')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="status"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  {t('exchanges.table.status')}
                </SortableTableHead>
                {!isAgentView ? (
                  <SortableTableHead
                    sortKey="agent"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  >
                    {t('exchanges.table.affiliate')}
                  </SortableTableHead>
                ) : null}
                <SortableTableHead
                  sortKey="program"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  {t('exchanges.table.program')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="points"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                  align="right"
                >
                  {t('exchanges.table.points')}
                </SortableTableHead>
                <TableHead>{isAgentView ? t('exchanges.table.cashReward') : t('exchanges.table.reviewerFulfillment')}</TableHead>
                <SortableTableHead
                  sortKey="requested"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                  align="right"
                >
                  {t('exchanges.table.requested')}
                </SortableTableHead>
                <TableHead className="text-right">{t('exchanges.table.actions')}</TableHead>
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
                        ? t('exchanges.empty.agentCanCreate')
                        : t('exchanges.empty.agentCannotCreate')
                      : t('exchanges.empty.owner')}
                  </TableCell>
                </TableRow>
              ) : (
                pageSlice.map((record) => {
                  const status = getStatusPresentation(t)[record.status]
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
                            {exchangeRequestTitle(record, t)}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {requestTypeLabel(record.request_type, t)} • {record.id.slice(0, 8).toUpperCase()}
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
                              {record.agent_name ?? t('exchanges.table.affiliate')}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t('exchanges.fallback.noAffiliate')}</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="min-w-[180px]">
                        {record.program_id ? (
                          <Link
                            to={`/programs/${record.program_id}`}
                            className="text-sm font-medium text-foreground underline underline-offset-4 decoration-border transition hover:text-primary hover:decoration-primary"
                          >
                            {record.program_name ?? t('exchanges.table.program')}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t('exchanges.fallback.noProgram')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-foreground">
                        {record.points_amount.toLocaleString('fr-FR')} pts
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {isAgentView ? requestValueLabel(record, t) : reviewerLabel(record.status, t)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isAgentView
                              ? record.request_type === 'reward'
                                ? t('exchanges.fallback.requestedReward')
                                : record.cash_amount === null
                                  ? t('exchanges.fallback.cashPending')
                                  : formatCurrency(record.cash_amount, record.currency_code)
                              : record.approved_by_name ?? t('exchanges.fallback.noReviewer')}
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
                                    <Link to={`/payouts/${record.id}`} aria-label={t('exchanges.actions.viewRequest')}>
                                      <Eye className="size-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('exchanges.actions.viewRequest')}</TooltipContent>
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
                                      aria-label={t('exchanges.actions.approve')}
                                    >
                                      <CheckCircle2 className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('exchanges.actions.approve')}</TooltipContent>
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
                                      aria-label={t('exchanges.actions.reject')}
                                    >
                                      <X className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('exchanges.actions.reject')}</TooltipContent>
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
                                      aria-label={t('exchanges.actions.startFulfilment')}
                                    >
                                      <Play className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('exchanges.actions.startFulfilment')}</TooltipContent>
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
                                      aria-label={t('exchanges.actions.complete')}
                                    >
                                      <CheckCircle2 className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('exchanges.actions.complete')}</TooltipContent>
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
                                      aria-label={t('exchanges.actions.cancel')}
                                    >
                                      <X className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('exchanges.actions.cancel')}</TooltipContent>
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
                                    <span>{t('exchanges.dropdown.viewRequest')}</span>
                                  </Link>
                                </DropdownMenuItem>
                                {!isAgentView && record.status === 'requested' && canApprove ? (
                                  <DropdownMenuItem
                                    className="text-emerald-600 focus:text-emerald-600 dark:text-emerald-400 dark:focus:text-emerald-400"
                                    onClick={() => approveMutation.mutate(record.id)}
                                  >
                                    <CheckCircle2 className="size-4 text-emerald-500" />
                                    <span>{t('exchanges.dropdown.approve')}</span>
                                  </DropdownMenuItem>
                                ) : null}
                                {!isAgentView && record.status === 'requested' && canReject ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => rejectMutation.mutate(record.id)}
                                  >
                                    <X className="size-4 text-destructive" />
                                    <span>{t('exchanges.dropdown.reject')}</span>
                                  </DropdownMenuItem>
                                ) : null}
                                {!isAgentView && record.status === 'approved' && canApprove ? (
                                  <DropdownMenuItem
                                    className="text-amber-600 focus:text-amber-600 dark:text-amber-400 dark:focus:text-amber-400"
                                    onClick={() => processingMutation.mutate(record.id)}
                                  >
                                    <Play className="size-4 text-amber-500" />
                                    <span>{t('exchanges.dropdown.startFulfilment')}</span>
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
                                    <span>{t('exchanges.dropdown.complete')}</span>
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
                                      <span>{t('exchanges.dropdown.cancel')}</span>
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
            <DialogTitle>{t('exchanges.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('exchanges.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-0">
            {[
              { step: 1, title: t('exchanges.dialog.stepProgram') },
              { step: 2, title: t('exchanges.dialog.stepRequest') },
              { step: 3, title: t('exchanges.dialog.stepPreview') },
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
                <h3 className="text-sm font-semibold text-foreground">{t('exchanges.dialog.selectProgram')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('exchanges.dialog.selectProgramHint')}
                </p>
              </div>

              <div className="space-y-2">
                {selectablePrograms.length === 0 ? (
                  <div className="rounded-lg bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                    {t('exchanges.dialog.noPrograms')}
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
                              {program.program_name ?? t('exchanges.dialog.preview.program')}
                            </div>
                            {isSelected ? (
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                                {t('exchanges.dialog.programSelected')}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {program.exchange_pack_name ?? t('exchanges.value.catalogDefault')} •{' '}
                            {program.exchange_mode === 'both'
                              ? `${t('exchanges.requestType.reward')} + ${t('exchanges.requestType.cash')}`
                              : program.exchange_mode === 'cash'
                                ? t('exchanges.requestType.cash')
                                : t('exchanges.requestType.reward')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-foreground">
                            {program.available_points.toLocaleString('fr-FR')} pts
                          </div>
                          <div className="text-xs text-muted-foreground transition group-hover:text-foreground/80">
                            {t('exchanges.dialog.clickToUse')}
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
                  {selectedProgram?.program_name ?? t('exchanges.dialog.preview.program')}
                </span>{' '}
                •{' '}
                <span className="font-medium text-foreground">
                  {selectedProgram?.available_points.toLocaleString('fr-FR') ?? '0'} pts
                </span>{' '}
                {t('exchanges.value.catalogDefault')}
              </div>

              {supportedRequestTypes.length === 0 ? (
                <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  {t('exchanges.dialog.noExchangeOptions')}
                </div>
              ) : null}

              <div className="space-y-2">
                <FieldLabel>{t('exchanges.dialog.requestMethod')}</FieldLabel>
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
                        <div className="text-sm font-semibold text-foreground">{t('exchanges.dialog.rewardTitle')}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('exchanges.dialog.rewardDescription')}
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
                        <div className="text-sm font-semibold text-foreground">{t('exchanges.dialog.cashTitle')}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('exchanges.dialog.cashDescription')}
                        </div>
                      </div>
                    </button>
                  ) : null}
                </div>
              </div>

              {requestType === 'reward' ? (
                <Field>
                  <FieldLabel>{t('exchanges.dialog.rewardLabel')}</FieldLabel>
                  <Select value={rewardItemId} onValueChange={setRewardItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('exchanges.dialog.selectReward')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{t('exchanges.dialog.selectReward')}</SelectLabel>
                        {selectedPackItems.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            {t('exchanges.dialog.noRewards')}
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
                  <FieldLabel>{t('exchanges.dialog.pointsLabel')}</FieldLabel>
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
                  {t('exchanges.dialog.exceedsBalance', { max: selectedProgramAvailablePoints.toLocaleString('fr-FR') })}
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
                      {t('exchanges.dialog.preview.program')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {selectedProgram?.program_name ?? t('exchanges.dialog.preview.program')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {t('exchanges.dialog.preview.balance')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {selectedProgram?.available_points.toLocaleString('fr-FR') ?? '0'} pts
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {t('exchanges.dialog.preview.type')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {requestType === 'reward' ? t('exchanges.requestType.reward') : t('exchanges.requestType.cash')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {t('exchanges.dialog.preview.selection')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {requestType === 'reward'
                        ? selectedReward?.title ?? t('exchanges.dialog.preview.noReward')
                        : `${Number(pointsAmount || 0).toLocaleString('fr-FR')} pts`}
                    </div>
                  </div>
                </div>
              </div>

              <Field>
                <FieldLabel>{t('exchanges.dialog.notesLabel')}</FieldLabel>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t('exchanges.dialog.notesPlaceholder')}
                  rows={3}
                  className="resize-none"
                />
              </Field>
            </div>
          ) : null}

          {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('exchanges.dialog.cancel')}
              </Button>
              {createStep > 1 ? (
                <Button type="button" variant="outline" onClick={() => setCreateStep((step) => step - 1)}>
                  {t('exchanges.dialog.back')}
                </Button>
              ) : null}
            </div>

            {createStep < 3 ? (
              <Button
                type="button"
                onClick={() => setCreateStep((step) => step + 1)}
                disabled={createStep === 1 ? !canContinueFromProgram : !canContinueFromDetails}
              >
                {t('exchanges.dialog.continue')}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !selectedProgramId || !canContinueFromDetails}
              >
                {createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {t('exchanges.dialog.submit')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

