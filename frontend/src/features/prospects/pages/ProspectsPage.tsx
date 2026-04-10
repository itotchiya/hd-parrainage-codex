import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { BadgeCheck, CheckSquare, Eye, FilterX, Flame, History, MoreHorizontal, Plus, ScanSearch, Search, Snowflake, Square, Thermometer, Trash2, User, XCircle } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { KpiCard, KpiCardSkeleton, type KpiTone } from '../../dashboard/components/KpiCard'
import { DashboardSectionHeader } from '../../dashboard/components/DashboardSectionHeader'
import { formatDashboardDateTimeFr } from '../../dashboard/utils/semanticBadges'
import { fetchPrograms } from '../../programs/api'
import { AddProspectMethodDialog } from '../components/AddProspectMethodDialog'
import { DeleteProspectDialog } from '../components/DeleteProspectDialog'
import { NewProspectDialog } from '../components/NewProspectDialog'
import {
  createProspect,
  deleteProspect,
  fetchDeletedProspects,
  fetchProspects,
} from '../api'
import { buildProspectDetailPath } from '../paths'
import { addLocalIacrmProspect } from '../../iacrm/prospectStore'
import { getIacrmConfig } from '../../iacrm/api'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  ProspectPipelineStage,
  ProspectRecord,
  ProspectSubmissionStatus,
} from '../../../types/prospects'

const prospectsQueryKey = ['prospects', 'list']
const deletedProspectsQueryKey = ['prospects', 'deleted']
const assignedProgramsQueryKey = ['programs', 'assigned-for-prospect']
type ProspectSortKey =
  | 'contact'
  | 'agent'
  | 'pipeline'
  | 'sync'
  | 'submitted'
  | 'history'
  | 'removed'

const pipelineSortOrder: Record<ProspectPipelineStage, number> = {
  suspect: 0,
  prospect_froid: 1,
  prospect_tiede: 2,
  prospect_chaud: 3,
}

const syncSortOrder: Record<ProspectSubmissionStatus, number> = {
  pending_sync: 0,
  sync_failed: 1,
  synced: 2,
  deleted: 3,
}

const stagePresentation: Record<
  ProspectPipelineStage,
  { className: string }
> = {
  suspect: { className: 'border-border bg-muted/40 text-foreground' },
  prospect_froid: {
    className: 'border-border bg-blue-500/10 text-blue-800 dark:text-blue-300',
  },
  prospect_tiede: {
    className: 'border-border bg-amber-500/10 text-amber-800 dark:text-amber-300',
  },
  prospect_chaud: {
    className: 'border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  },
}

function getStageLabel(t: (key: string) => string, stage: ProspectPipelineStage): string {
  const labels: Record<ProspectPipelineStage, string> = {
    suspect: t('prospects.stages.suspect'),
    prospect_froid: t('prospects.stages.prospect_froid'),
    prospect_tiede: t('prospects.stages.prospect_tiede'),
    prospect_chaud: t('prospects.stages.prospect_chaud'),
  }
  return labels[stage]
}

function getSubmissionLabel(t: (key: string) => string, status: ProspectSubmissionStatus): string {
  const labels: Record<ProspectSubmissionStatus, string> = {
    pending_sync: t('prospects.syncStatus.pending_sync'),
    synced: t('prospects.syncStatus.synced'),
    sync_failed: t('prospects.syncStatus.sync_failed'),
    deleted: t('prospects.syncStatus.deleted'),
  }
  return labels[status]
}

function submissionBadgeClass(status: ProspectSubmissionStatus): string {
  switch (status) {
    case 'synced':
      return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'pending_sync':
      return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
    case 'sync_failed':
      return 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    case 'deleted':
      return 'border-transparent bg-muted text-muted-foreground'
    default:
      return 'border-border bg-muted/30 text-muted-foreground'
  }
}

const stageKpiIcons: Record<ProspectPipelineStage, typeof ScanSearch> = {
  suspect: ScanSearch,
  prospect_froid: Snowflake,
  prospect_tiede: Thermometer,
  prospect_chaud: Flame,
}

const stageKpiTones: Record<ProspectPipelineStage, KpiTone> = {
  suspect: 'info',
  prospect_froid: 'primary',
  prospect_tiede: 'warning',
  prospect_chaud: 'success',
}

function prospectTime(value: string | null) {
  return new Date(value ?? 0).getTime()
}

function prospectPipelineRank(prospect: ProspectRecord) {
  if (prospect.conversion_status === 'converted') return 4
  if (prospect.conversion_status === 'lost') return 5
  return pipelineSortOrder[prospect.pipeline_stage]
}

function prospectPipelinePresentation(t: (key: string) => string, prospect: ProspectRecord) {
  if (prospect.conversion_status === 'converted') {
    return {
      label: t('prospects.stages.converted'),
      className: 'border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
    }
  }
  if (prospect.conversion_status === 'lost') {
    return {
      label: t('prospects.stages.lost'),
      className: 'border-border bg-rose-500/10 text-rose-800 dark:text-rose-300',
    }
  }

  return {
    label: getStageLabel(t, prospect.pipeline_stage),
    className: stagePresentation[prospect.pipeline_stage].className,
  }
}

function compareProspects(left: ProspectRecord, right: ProspectRecord, key: ProspectSortKey, direction: SortDirection) {
  const modifier = direction === 'asc' ? 1 : -1
  const result =
    key === 'submitted'
      ? prospectTime(left.submitted_at) - prospectTime(right.submitted_at)
      : key === 'removed'
        ? prospectTime(left.deleted_at) - prospectTime(right.deleted_at)
        : key === 'history'
          ? (left.history_count ?? 0) - (right.history_count ?? 0)
          : key === 'pipeline'
            ? prospectPipelineRank(left) - prospectPipelineRank(right)
            : key === 'sync'
              ? syncSortOrder[left.submission_status] - syncSortOrder[right.submission_status]
              : key === 'agent'
                ? (left.agent_name ?? '').localeCompare(right.agent_name ?? '')
                : left.contact_name.localeCompare(right.contact_name)

  return result * modifier
}

function ProspectsPageSkeleton() {
  return (
    <section className="app-section">
      <PageHeader
        title={<Skeleton className="h-6 w-24" />}
        right={<Skeleton className="h-9 w-28 rounded-md" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Skeleton className="h-9 w-full sm:w-[240px]" />
            <Skeleton className="h-9 w-full sm:w-[170px]" />
            <Skeleton className="h-9 w-full sm:w-[170px]" />
            <Skeleton className="h-9 w-full sm:w-[170px]" />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg bg-background/40">
          <div className="h-11 bg-muted/30" />
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-16 border-t border-border/50 bg-card/70 first:border-t-0" />
          ))}
        </div>
      </article>
    </section>
  )
}

export function ProspectsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuthSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<'all' | ProspectPipelineStage | 'converted' | 'lost'>('all')
  const [selectedAgentId, setSelectedAgentId] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<ProspectSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const queryWantsCreate = searchParams.get('create') === 'true'
  const queryProgramId = searchParams.get('programId')
  const [methodDialogOpen, setMethodDialogOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(queryWantsCreate)
  const [deleteTarget, setDeleteTarget] = useState<ProspectRecord | null>(null)
  const isAgentView = user?.agent_profile !== null && user?.agent_profile !== undefined
  const canSubmitProspects = isAgentView && hasPermission('prospect.submit')

  const prospectsQuery = useQuery({
    queryKey: prospectsQueryKey,
    queryFn: fetchProspects,
    refetchInterval: 30_000,
  })

  const deletedProspectsQuery = useQuery({
    queryKey: deletedProspectsQueryKey,
    queryFn: fetchDeletedProspects,
    enabled: showDeleted,
  })

  const assignedProgramsQuery = useQuery({
    queryKey: assignedProgramsQueryKey,
    queryFn: fetchPrograms,
    enabled: canSubmitProspects,
  })

  const createMutation = useMutation({
    mutationFn: createProspect,
    onSuccess: async (_, variables) => {
      setCreateOpen(false)
      await queryClient.invalidateQueries({ queryKey: prospectsQueryKey })
      await queryClient.invalidateQueries({ queryKey: deletedProspectsQueryKey })
      // Mirror new prospect into the IACRM local store when IACRM is configured
      const iacrmConfig = getIacrmConfig()
      if (iacrmConfig?.base_url) {
        addLocalIacrmProspect({
          iacrm_id: `local_${crypto.randomUUID()}`,
          contact_name: variables.contact_name,
          company_name: variables.company_name ?? null,
          stage: 'suspect',
          progression_status: 'active',
          assigned_agent: user?.display_name ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({
      prospectId,
      reason,
    }: {
      prospectId: string
      reason: string
    }) => deleteProspect(prospectId, { reason }),
    onSuccess: async () => {
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: prospectsQueryKey })
      await queryClient.invalidateQueries({ queryKey: deletedProspectsQueryKey })
    },
  })

  const sourceQuery = showDeleted ? deletedProspectsQuery : prospectsQuery
  const prospects = sourceQuery.data?.data ?? []
  const kpiProspects = prospectsQuery.data?.data ?? []
  const assignedPrograms = assignedProgramsQuery.data?.data ?? []
  const eligiblePrograms = assignedPrograms.filter((program) => program.status === 'active')
  const createError = createMutation.error as ApiError | null
  const deleteError = deleteMutation.error as ApiError | null

  const hasActiveFilters = search.trim() !== '' || stageFilter !== 'all' || selectedAgentId !== 'all' || showDeleted

  useEffect(() => {
    if (!queryWantsCreate) {
      return
    }

    if (!canSubmitProspects || eligiblePrograms.length === 0) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('create')
      nextParams.delete('programId')
      setSearchParams(nextParams, { replace: true })
      return
    }

    setCreateOpen(true)
  }, [canSubmitProspects, eligiblePrograms.length, queryWantsCreate, searchParams, setSearchParams])

  const agentOptions = useMemo(() => {
    return Array.from(
      new Map(
        prospects
          .filter((prospect) => prospect.agent_id !== null)
          .map((prospect) => [
            prospect.agent_id,
            {
              id: prospect.agent_id,
              name: prospect.agent_name ?? 'Unknown agent',
            },
          ]),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name))
  }, [prospects])

  const filteredProspects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return prospects.filter((prospect) => {
      const matchesStage =
        stageFilter === 'all' ||
        (stageFilter === 'converted' ? prospect.conversion_status === 'converted' :
        stageFilter === 'lost' ? prospect.conversion_status === 'lost' :
        prospect.conversion_status === 'open' && prospect.pipeline_stage === stageFilter)
      const matchesAgent = selectedAgentId === 'all' || prospect.agent_id === selectedAgentId
      const matchesSearch =
        normalizedSearch.length === 0 ||
        prospect.contact_name.toLowerCase().includes(normalizedSearch) ||
        (prospect.company_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (prospect.program_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (prospect.agent_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (prospect.contact_email ?? '').toLowerCase().includes(normalizedSearch) ||
        (prospect.contact_phone_raw ?? '').toLowerCase().includes(normalizedSearch)

      return matchesStage && matchesAgent && matchesSearch
    })
  }, [prospects, search, selectedAgentId, stageFilter])

  const sortedProspects = useMemo(() => {
    if (!sortKey) return filteredProspects
    return [...filteredProspects].sort((left, right) =>
      compareProspects(left, right, sortKey, sortDirection),
    )
  }, [filteredProspects, sortDirection, sortKey])

  function handleSort(nextKey: ProspectSortKey) {
    setPage(1)
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection(['submitted', 'removed', 'history'].includes(nextKey) ? 'desc' : 'asc')
  }

  useEffect(() => {
    setPage(1)
  }, [search, stageFilter, selectedAgentId, showDeleted])

  useEffect(() => {
    if (!showDeleted && sortKey === 'removed') {
      setSortKey(null)
      setSortDirection('asc')
    }
  }, [showDeleted, sortKey])

  const totalFiltered = sortedProspects.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const pageSafe = Math.min(page, totalPages)

  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    return sortedProspects.slice(start, start + pageSize)
  }, [sortedProspects, pageSafe, pageSize])

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

  const kpiProspectsByAgent = useMemo(() => {
    return kpiProspects.filter((prospect) => {
      return selectedAgentId === 'all' || prospect.agent_id === selectedAgentId
    })
  }, [kpiProspects, selectedAgentId])

  const activeProspects = kpiProspectsByAgent.filter((prospect) => prospect.deleted_at === null)
  const convertedProspectCount = activeProspects.filter(
    (prospect) => prospect.conversion_status === 'converted',
  ).length
  const lostProspectCount = activeProspects.filter(
    (prospect) => prospect.conversion_status === 'lost',
  ).length
  const stageCards = (['suspect', 'prospect_froid', 'prospect_tiede', 'prospect_chaud'] as ProspectPipelineStage[]).map((key) => ({
    key,
    label: getStageLabel(t, key),
    className: stagePresentation[key].className,
    count: activeProspects.filter(
      (prospect) => prospect.conversion_status === 'open' && prospect.pipeline_stage === key,
    ).length,
  }))

  const isKpiLoading = prospectsQuery.isFetching && prospectsQuery.isPlaceholderData

  if (sourceQuery.isPending) {
    return <ProspectsPageSkeleton />
  }

  if (sourceQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(sourceQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Prospects"
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
                        setStageFilter('all')
                        setSelectedAgentId('all')
                        setShowDeleted(false)
                      }}
                      aria-aria-label={t('common.clearFilters')}
                    >
                      <FilterX className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.clearFilters')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}

            <Field className="w-full sm:w-[240px] shrink-0">
              <FieldLabel htmlFor="prospects-search" className="sr-only">
                {t('prospects.searchPlaceholder')}
              </FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="prospects-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('prospects.searchPlaceholder')}
                  className="pl-9"
                />
              </div>
            </Field>

            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as 'all' | ProspectPipelineStage | 'converted' | 'lost')}
            >
              <SelectTrigger className="w-full sm:w-[160px] shrink-0">
                <SelectValue placeholder={t('prospects.filters.pipelineStage')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t('prospects.filters.pipelineStage')}</SelectLabel>
                  <SelectItem value="all">{t('prospects.filters.allStatuses')}</SelectItem>
                  {(['suspect', 'prospect_froid', 'prospect_tiede', 'prospect_chaud'] as ProspectPipelineStage[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {getStageLabel(t, key)}
                    </SelectItem>
                  ))}
                  <SelectItem value="converted">{t('prospects.stages.converted')}</SelectItem>
                  <SelectItem value="lost">{t('prospects.stages.lost')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {hasPermission('prospect.view') && user?.agent_profile === null ? (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="w-full sm:w-[180px] shrink-0">
                  <SelectValue placeholder={t('prospects.filters.agent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{t('prospects.filters.agent')}</SelectLabel>
                    <SelectItem value="all">{t('prospects.filters.allAgents')}</SelectItem>
                    {agentOptions.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleted((c) => !c)}
              className={`shrink-0 ${showDeleted ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15' : ''}`}
              aria-pressed={showDeleted}
            >
              {showDeleted ? <CheckSquare className="size-4" aria-hidden /> : <Square className="size-4" aria-hidden />}
              {t('prospects.filters.showDeleted')}
            </Button>

            {canSubmitProspects ? (
              <Button
                type="button"
                className="gap-2 shrink-0"
                onClick={() => setMethodDialogOpen(true)}
                disabled={eligiblePrograms.length === 0}
              >
                <Plus className="size-4" aria-hidden />
                {t('prospects.newProspect')}
              </Button>
            ) : null}
          </PageHeaderToolbar>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {stageCards.map((stage) => {
          const stageKey = stage.key as ProspectPipelineStage
          return (
            <KpiCard
              key={stage.key}
              title={stage.label}
              value={stage.count.toString()}
              description={t('prospects.kpis.stageDescription')}
              icon={stageKpiIcons[stageKey]}
              tone={stageKpiTones[stageKey]}
              isLoading={isKpiLoading}
            />
          )
        })}
        <KpiCard
          title={t('prospects.stages.converted')}
          value={convertedProspectCount.toLocaleString('fr-FR')}
          description={t('prospects.kpis.convertedDescription')}
          icon={BadgeCheck}
          tone="success"
          isLoading={isKpiLoading}
        />
        <KpiCard
          title={t('prospects.stages.lost')}
          value={lostProspectCount.toLocaleString('fr-FR')}
          description={t('prospects.kpis.lostDescription')}
          icon={XCircle}
          tone="danger"
          isLoading={isKpiLoading}
        />
      </div>

      {filteredProspects.length === 0 ? (
        <article className="rounded-lg bg-card p-3 sm:p-4">
          <DashboardSectionHeader
            title={isAgentView ? t('prospects.myProspects') : t('prospects.allProspects')}
          />
          <article className="rounded-lg border border-dashed border-border bg-muted/15 app-card-padding">
            <p className="app-eyebrow">Liste des filleuls</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">
              {t('prospects.table.noResults')}
            </h2>
          </article>
        </article>
      ) : (
        <article className="rounded-lg bg-card p-3 sm:p-4">
          <DashboardSectionHeader
            title={isAgentView ? 'Mes prospects' : 'Tous les prospects'}
          />
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <SortableTableHead
                      sortKey="contact"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="min-w-[11rem]"
                    >
                      Contact
                    </SortableTableHead>
                    <TableHead className="hidden min-w-[11rem] sm:table-cell">{t('prospects.table.contacts')}</TableHead>
                    {isAgentView ? (
                      <TableHead className="hidden min-w-[10rem] lg:table-cell">{t('prospects.table.program')}</TableHead>
                    ) : (
                      <SortableTableHead
                        sortKey="agent"
                        activeKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                        className="hidden min-w-[8rem] lg:table-cell"
                      >
                        Agent
                      </SortableTableHead>
                    )}
                    <SortableTableHead
                      sortKey="pipeline"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="min-w-[7.5rem]"
                    >
                      {isAgentView ? t('common.status') : t('prospects.table.pipeline')}
                    </SortableTableHead>
                    {!isAgentView ? (
                      <SortableTableHead
                        sortKey="sync"
                        activeKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                        className="min-w-[8.5rem]"
                      >
                        {t('prospects.table.sync')}
                      </SortableTableHead>
                    ) : null}
                    <SortableTableHead
                      sortKey="submitted"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden min-w-[7rem] xl:table-cell"
                    >
                      {t('prospects.table.submitted')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="history"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden min-w-[5.5rem] lg:table-cell"
                    >
                      {t('prospects.table.history')}
                    </SortableTableHead>
                    {showDeleted ? (
                      <SortableTableHead
                        sortKey="removed"
                        activeKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                        className="hidden min-w-[7rem] xl:table-cell"
                      >
                        {t('prospects.table.removed')}
                      </SortableTableHead>
                    ) : null}
                    <TableHead className="w-10 pe-2 text-end">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {pageSlice.map((prospect, index) => {
                  const stage = prospectPipelinePresentation(t, prospect)
                  const rank = (pageSafe - 1) * pageSize + index + 1
                  const busy = deleteMutation.isPending
                  return (
                    <TableRow
                      key={prospect.id}
                      className={prospect.deleted_at ? 'opacity-90' : undefined}
                    >
                      <TableCell className="text-center text-muted-foreground">{rank}</TableCell>
                      <TableCell className="min-w-0">
                        <Link
                          to={buildProspectDetailPath({
                            prospectId: prospect.id,
                            agentId: prospect.agent_id,
                          })}
                          className="group -m-1 block rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <p className="truncate font-medium text-primary underline underline-offset-4 decoration-border group-hover:decoration-primary">
                            {prospect.contact_name}
                          </p>
                          {prospect.company_name ? (
                            <p className="truncate text-xs text-muted-foreground">{prospect.company_name}</p>
                          ) : null}
                          <p className="mt-0.5 text-[11px] text-muted-foreground sm:hidden">
                            Submitted {formatDashboardDateTimeFr(prospect.submitted_at)}
                          </p>
                          {prospect.deleted_at ? (
                            <p
                              className="mt-1 truncate text-[11px] text-destructive"
                              title={
                                prospect.soft_delete_reason
                                  ? `${prospect.deleted_by_user?.display_name ?? 'Unknown'} — ${prospect.soft_delete_reason}`
                                  : undefined
                              }
                            >
                              Deleted {formatDashboardDateTimeFr(prospect.deleted_at)}
                            </p>
                          ) : null}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden max-w-[13rem] text-sm sm:table-cell">
                        <div className="flex min-w-0 flex-col gap-1">
                          {prospect.contact_email ? (
                            <a
                              href={`mailto:${prospect.contact_email}`}
                              className="truncate text-primary underline underline-offset-4 decoration-border hover:decoration-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {prospect.contact_email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">{t('prospects.contact.noEmail')}</span>
                          )}
                          {prospect.contact_phone_raw ? (
                            <a
                              href={`tel:${prospect.contact_phone_e164 ?? prospect.contact_phone_raw}`}
                              className="truncate text-muted-foreground underline underline-offset-4 decoration-border hover:text-primary hover:decoration-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {prospect.contact_phone_raw}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">{t('prospects.contact.noPhone')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-[10rem] truncate text-sm text-muted-foreground lg:table-cell">
                        {isAgentView ? (
                          prospect.program_id && prospect.program_name ? (
                            <Link
                              to={`/programs/${prospect.program_id}`}
                              className="text-primary underline underline-offset-4 decoration-border hover:decoration-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {prospect.program_name}
                            </Link>
                          ) : (
                            prospect.program_name ?? '—'
                          )
                        ) : prospect.agent_id ? (
                          <Link
                            to={`/agents/${prospect.agent_id}`}
                            className="text-primary underline underline-offset-4 decoration-border hover:decoration-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {prospect.agent_name ?? '—'}
                          </Link>
                        ) : (
                          prospect.agent_name ?? '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`w-fit text-xs capitalize ${stage.className}`}>
                          {stage.label}
                        </Badge>
                      </TableCell>
                      {!isAgentView ? (
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className={`w-fit text-xs capitalize ${submissionBadgeClass(prospect.submission_status)}`}
                            >
                              {getSubmissionLabel(t, prospect.submission_status).replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDashboardDateTimeFr(prospect.last_synced_at)}
                            </span>
                            {prospect.sync_error_message ? (
                              <span
                                className="line-clamp-2 text-[11px] text-amber-700 dark:text-amber-300"
                                title={prospect.sync_error_message}
                              >
                                {prospect.sync_error_message}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
                      <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                        {formatDashboardDateTimeFr(prospect.submitted_at)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm tabular-nums text-foreground">
                            {(prospect.history_count ?? 0).toLocaleString('fr-FR')} events
                          </span>
                          <Link
                            to={buildProspectDetailPath({
                              prospectId: prospect.id,
                              agentId: prospect.agent_id,
                              hash: '#prospect-history',
                            })}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4 decoration-border hover:decoration-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <History className="size-3.5 shrink-0" aria-hidden />
                            Timeline
                          </Link>
                        </div>
                      </TableCell>
                      {showDeleted ? (
                        <TableCell className="hidden max-w-[10rem] text-xs text-muted-foreground xl:table-cell">
                          {formatDashboardDateTimeFr(prospect.deleted_at)}
                          {prospect.deleted_by_user ? (
                            <p className="mt-1 truncate" title={prospect.soft_delete_reason ?? undefined}>
                              {prospect.deleted_by_user.display_name}
                            </p>
                          ) : null}
                        </TableCell>
                      ) : null}
                      <TableCell className="pe-2 text-end">
                        <TooltipProvider delayDuration={150}>
                          <div className="flex justify-end gap-2">
                            <div className="hidden items-center justify-end gap-2 md:flex">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="icon-sm"
                                    className="border border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                                  >
                                    <Link
                                      to={buildProspectDetailPath({
                                        prospectId: prospect.id,
                                        agentId: prospect.agent_id,
                                      })}
                                      aria-label={t('prospects.table.actions.open')}
                                    >
                                      <Eye className="size-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('prospects.table.actions.open')}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="icon-sm"
                                    className="border border-blue-500/30 text-blue-600 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500 dark:text-blue-400"
                                  >
                                    <Link
                                      to={buildProspectDetailPath({
                                        prospectId: prospect.id,
                                        agentId: prospect.agent_id,
                                        hash: '#prospect-history',
                                      })}
                                      aria-label={t('prospects.table.actions.viewHistory')}
                                    >
                                      <History className="size-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('prospects.table.actions.viewHistory')}</TooltipContent>
                              </Tooltip>
                              {prospect.agent_id ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      asChild
                                      variant="ghost"
                                      size="icon-sm"
                                      className="border border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                                    >
                                      <Link to={`/agents/${prospect.agent_id}`} aria-label={t('prospects.table.actions.viewAgent')}>
                                        <User className="size-4" />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('prospects.table.actions.viewAgent')}</TooltipContent>
                                </Tooltip>
                              ) : null}
                              {prospect.actions.can_delete ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={busy}
                                      className="border border-red-500/30 text-red-600 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 dark:text-red-400"
                                      onClick={() => setDeleteTarget(prospect)}
                                      aria-label={t('prospects.table.actions.delete')}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('prospects.table.actions.delete')}</TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-muted-foreground md:hidden"
                                  aria-label={`Actions for ${prospect.contact_name}`}
                                >
                                  <MoreHorizontal className="size-4" aria-hidden />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[10rem]">
                                <DropdownMenuItem asChild>
                                  <Link
                                    to={buildProspectDetailPath({
                                      prospectId: prospect.id,
                                      agentId: prospect.agent_id,
                                    })}
                                  >
                                    <Eye className="size-4 text-primary" />
                                    <span>{t('common.details')}</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    to={buildProspectDetailPath({
                                      prospectId: prospect.id,
                                      agentId: prospect.agent_id,
                                      hash: '#prospect-history',
                                    })}
                                  >
                                    <History className="size-4 text-blue-500" />
                                    <span>Timeline</span>
                                  </Link>
                                </DropdownMenuItem>
                                {prospect.agent_id ? (
                                  <DropdownMenuItem asChild>
                                    <Link to={`/agents/${prospect.agent_id}`}>
                                      <User className="size-4 text-primary" />
                                      <span>{t('common.open')} {t('prospects.table.agent')}</span>
                                    </Link>
                                  </DropdownMenuItem>
                                ) : null}
                                {prospect.actions.can_delete ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      disabled={busy}
                                      onClick={() => setDeleteTarget(prospect)}
                                    >
                                      <Trash2 className="size-4 text-destructive" />
                                      <span>{t('common.delete')}</span>
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

      <AddProspectMethodDialog
        open={methodDialogOpen}
        agentCode={user?.agent_profile?.agent_code ?? ''}
        programs={eligiblePrograms}
        onClose={() => setMethodDialogOpen(false)}
        onSelectForm={() => {
          setMethodDialogOpen(false)
          setCreateOpen(true)
        }}
      />

      <NewProspectDialog
        open={createOpen}
        programs={eligiblePrograms}
        defaultProgramId={queryProgramId}
        isSubmitting={createMutation.isPending}
        error={createError}
        onClose={() => {
          setCreateOpen(false)
          if (queryWantsCreate || queryProgramId) {
            const nextParams = new URLSearchParams(searchParams)
            nextParams.delete('create')
            nextParams.delete('programId')
            setSearchParams(nextParams, { replace: true })
          }
          createMutation.reset()
        }}
        onSubmit={async (payload) => {
          try {
            await createMutation.mutateAsync(payload)
          } catch {
            // Mutation state already exposes inline validation details.
          }
        }}
      />

      <DeleteProspectDialog
        open={deleteTarget !== null}
        prospect={deleteTarget}
        isSubmitting={deleteMutation.isPending}
        error={deleteError}
        onClose={() => {
          setDeleteTarget(null)
          deleteMutation.reset()
        }}
        onSubmit={async (reason) => {
          if (deleteTarget === null) {
            return
          }

          try {
            await deleteMutation.mutateAsync({
              prospectId: deleteTarget.id,
              reason,
            })
          } catch {
            // Mutation state already exposes inline validation details.
          }
        }}
      />
    </section>
  )
}
