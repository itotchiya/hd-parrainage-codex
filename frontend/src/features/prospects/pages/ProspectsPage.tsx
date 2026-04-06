import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Flame, History, MoreHorizontal, Plus, ScanSearch, Search, Snowflake, Thermometer } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { KpiCard, kpiSnapshotBadge, type KpiTone } from '../../dashboard/components/KpiCard'
import { DashboardSectionHeader } from '../../dashboard/components/DashboardSectionHeader'
import { formatDashboardDateFr } from '../../dashboard/utils/semanticBadges'
import { fetchPrograms } from '../../programs/api'
import { DeleteProspectDialog } from '../components/DeleteProspectDialog'
import { NewProspectDialog } from '../components/NewProspectDialog'
import {
  createProspect,
  deleteProspect,
  fetchDeletedProspects,
  fetchProspects,
} from '../api'
import { PageHeader } from '@/components/app/PageHeader'
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
import type {
  ProspectConversionStatus,
  ProspectPipelineStage,
  ProspectRecord,
  ProspectSubmissionStatus,
} from '../../../types/prospects'

const prospectsQueryKey = ['prospects', 'list']
const deletedProspectsQueryKey = ['prospects', 'deleted']
const assignedProgramsQueryKey = ['programs', 'assigned-for-prospect']

const stagePresentation: Record<
  ProspectPipelineStage,
  { label: string; className: string }
> = {
  suspect: { label: 'Suspect', className: 'border-border bg-muted/40 text-foreground' },
  prospect_froid: {
    label: 'Prospect Froid',
    className: 'border-border bg-blue-500/10 text-blue-800 dark:text-blue-300',
  },
  prospect_tiede: {
    label: 'Prospect Tiede',
    className: 'border-border bg-amber-500/10 text-amber-800 dark:text-amber-300',
  },
  prospect_chaud: {
    label: 'Prospect Chaud',
    className: 'border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  },
}

const submissionPresentation: Record<ProspectSubmissionStatus, string> = {
  pending_sync: 'Pending sync',
  synced: 'Synced',
  sync_failed: 'Sync failed',
  deleted: 'Deleted',
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

const conversionPresentation: Record<ProspectConversionStatus, string> = {
  open: 'Open',
  converted: 'Converted',
  lost: 'Lost',
  locked: 'Locked',
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

export function ProspectsPage() {
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuthSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<'all' | ProspectPipelineStage>('all')
  const [selectedAgentId, setSelectedAgentId] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const queryWantsCreate = searchParams.get('create') === 'true'
  const queryProgramId = searchParams.get('programId')
  const [createOpen, setCreateOpen] = useState(queryWantsCreate)
  const [deleteTarget, setDeleteTarget] = useState<ProspectRecord | null>(null)

  const prospectsQuery = useQuery({
    queryKey: prospectsQueryKey,
    queryFn: fetchProspects,
  })

  const deletedProspectsQuery = useQuery({
    queryKey: deletedProspectsQueryKey,
    queryFn: fetchDeletedProspects,
    enabled: showDeleted,
  })

  const assignedProgramsQuery = useQuery({
    queryKey: assignedProgramsQueryKey,
    queryFn: fetchPrograms,
    enabled: hasPermission('prospect.submit'),
  })

  const createMutation = useMutation({
    mutationFn: createProspect,
    onSuccess: async () => {
      setCreateOpen(false)
      await queryClient.invalidateQueries({ queryKey: prospectsQueryKey })
      await queryClient.invalidateQueries({ queryKey: deletedProspectsQueryKey })
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
  const assignedPrograms = assignedProgramsQuery.data?.data ?? []
  const eligiblePrograms = assignedPrograms.filter((program) => program.status === 'active')
  const canSubmitProspects = hasPermission('prospect.submit')
  const createError = createMutation.error as ApiError | null
  const deleteError = deleteMutation.error as ApiError | null

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
      const matchesStage = stageFilter === 'all' || prospect.pipeline_stage === stageFilter
      const matchesAgent = selectedAgentId === 'all' || prospect.agent_id === selectedAgentId
      const matchesSearch =
        normalizedSearch.length === 0 ||
        prospect.contact_name.toLowerCase().includes(normalizedSearch) ||
        (prospect.company_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (prospect.program_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (prospect.agent_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (prospect.contact_email ?? '').toLowerCase().includes(normalizedSearch) ||
        (prospect.contact_phone_raw ?? '').toLowerCase().includes(normalizedSearch) ||
        (prospect.iacrm_prospect_id ?? '').toLowerCase().includes(normalizedSearch)

      return matchesStage && matchesAgent && matchesSearch
    })
  }, [prospects, search, selectedAgentId, stageFilter])

  useEffect(() => {
    setPage(1)
  }, [search, stageFilter, selectedAgentId, showDeleted])

  const totalFiltered = filteredProspects.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const pageSafe = Math.min(page, totalPages)

  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    return filteredProspects.slice(start, start + pageSize)
  }, [filteredProspects, pageSafe, pageSize])

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

  const openProspects = prospects.filter((prospect) => prospect.deleted_at === null)
  const stageCards = !showDeleted
    ? Object.entries(stagePresentation).map(([key, value]) => ({
        key,
        ...value,
        count: openProspects.filter((prospect) => prospect.pipeline_stage === key).length,
      }))
    : []

  if (sourceQuery.isPending) {
    return (
      <article className="app-panel text-sm text-muted-foreground">Loading prospects...</article>
    )
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
      <PageHeader title="Prospects" />

      {!showDeleted ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {stageCards.map((stage) => {
            const stageKey = stage.key as ProspectPipelineStage
            return (
              <KpiCard
                key={stage.key}
                title={stage.label}
                value={stage.count.toString()}
                description="Prospects in this funnel stage"
                badge={kpiSnapshotBadge('Pipeline')}
                icon={stageKpiIcons[stageKey]}
                tone={stageKpiTones[stageKey]}
              />
            )
          })}
        </div>
      ) : (
        <article className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-4 text-sm text-muted-foreground">
          Deleted records stay visible for audit and correction history.
        </article>
      )}

      {filteredProspects.length === 0 ? (
        <article className="rounded-lg bg-card p-3 sm:p-4">
          <DashboardSectionHeader
            title={showDeleted ? 'Deleted prospects' : 'Prospect inventory'}
            actions={
              <>
                <Field className="w-full sm:min-w-[180px] sm:max-w-[280px] sm:flex-1">
                  <FieldLabel htmlFor="prospects-search" className="sr-only">
                    Search prospects
                  </FieldLabel>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="prospects-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Contact, company, program, agent, IACRM ref..."
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Select
                  value={stageFilter}
                  onValueChange={(value) => setStageFilter(value as 'all' | ProspectPipelineStage)}
                  disabled={showDeleted}
                >
                  <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[140px] sm:shrink-0">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Pipeline stage</SelectLabel>
                      <SelectItem value="all">All stages</SelectItem>
                      {Object.entries(stagePresentation).map(([key, stage]) => (
                        <SelectItem key={key} value={key}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {hasPermission('prospect.view') && user?.agent_profile === null ? (
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[140px] sm:shrink-0">
                      <SelectValue placeholder="Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Agent</SelectLabel>
                        <SelectItem value="all">All agents</SelectItem>
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
                  size="sm"
                  onClick={() => setShowDeleted((c) => !c)}
                >
                  {showDeleted ? 'Active prospects' : 'Deleted history'}
                </Button>

                {canSubmitProspects ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 sm:shrink-0"
                    onClick={() => setCreateOpen(true)}
                    disabled={eligiblePrograms.length === 0}
                  >
                    <Plus className="size-4" aria-hidden />
                    New prospect
                  </Button>
                ) : null}
              </>
            }
          />
          <article className="rounded-lg border border-dashed border-border bg-muted/15 app-card-padding">
            <p className="app-eyebrow">Prospect inventory</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">
              No prospects match the current filter.
            </h2>
          </article>
        </article>
      ) : (
        <article className="rounded-lg bg-card p-3 sm:p-4">
          <DashboardSectionHeader
            title={showDeleted ? 'Deleted prospects' : 'Prospect inventory'}
            actions={
              <>
                <Field className="w-full sm:min-w-[180px] sm:max-w-[280px] sm:flex-1">
                  <FieldLabel htmlFor="prospects-search" className="sr-only">
                    Search prospects
                  </FieldLabel>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="prospects-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Contact, company, program, agent, IACRM ref..."
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Select
                  value={stageFilter}
                  onValueChange={(value) => setStageFilter(value as 'all' | ProspectPipelineStage)}
                  disabled={showDeleted}
                >
                  <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[140px] sm:shrink-0">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Pipeline stage</SelectLabel>
                      <SelectItem value="all">All stages</SelectItem>
                      {Object.entries(stagePresentation).map(([key, stage]) => (
                        <SelectItem key={key} value={key}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {hasPermission('prospect.view') && user?.agent_profile === null ? (
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[140px] sm:shrink-0">
                      <SelectValue placeholder="Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Agent</SelectLabel>
                        <SelectItem value="all">All agents</SelectItem>
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
                  size="sm"
                  onClick={() => setShowDeleted((c) => !c)}
                >
                  {showDeleted ? 'Active prospects' : 'Deleted history'}
                </Button>

                {canSubmitProspects ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 sm:shrink-0"
                    onClick={() => setCreateOpen(true)}
                    disabled={eligiblePrograms.length === 0}
                  >
                    <Plus className="size-4" aria-hidden />
                    New prospect
                  </Button>
                ) : null}
              </>
            }
          />
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="min-w-[11rem]">Contact</TableHead>
                  <TableHead className="hidden min-w-[9rem] sm:table-cell">Email</TableHead>
                  <TableHead className="hidden min-w-[7rem] md:table-cell">Phone</TableHead>
                  <TableHead className="hidden min-w-[8rem] lg:table-cell">Agent</TableHead>
                  <TableHead className="min-w-[7.5rem]">Pipeline</TableHead>
                  <TableHead className="min-w-[8.5rem]">Sync</TableHead>
                  <TableHead className="hidden min-w-[8rem] md:table-cell">IACRM</TableHead>
                  <TableHead className="hidden min-w-[7rem] xl:table-cell">Submitted</TableHead>
                  <TableHead className="hidden min-w-[5.5rem] lg:table-cell">History</TableHead>
                  {showDeleted ? (
                    <TableHead className="hidden min-w-[7rem] xl:table-cell">Removed</TableHead>
                  ) : null}
                  <TableHead className="w-10 pe-2 text-end">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageSlice.map((prospect, index) => {
                  const stage = stagePresentation[prospect.pipeline_stage]
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
                          to={`/prospects/${prospect.id}`}
                          className="group -m-1 block rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                            {prospect.contact_name}
                          </p>
                          {prospect.company_name ? (
                            <p className="truncate text-xs text-muted-foreground">{prospect.company_name}</p>
                          ) : null}
                          <p className="truncate text-[11px] text-muted-foreground">
                            {(prospect.program_name ?? '—') +
                              (prospect.business_name ? ` · ${prospect.business_name}` : '')}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground sm:hidden">
                            Submitted {formatDashboardDateFr(prospect.submitted_at)}
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
                              Deleted {formatDashboardDateFr(prospect.deleted_at)}
                            </p>
                          ) : null}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden max-w-[11rem] truncate text-sm sm:table-cell">
                        {prospect.contact_email ? (
                          <a
                            href={`mailto:${prospect.contact_email}`}
                            className="text-primary underline-offset-2 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {prospect.contact_email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-[9rem] truncate text-sm md:table-cell">
                        {prospect.contact_phone_raw ? (
                          <a
                            href={`tel:${prospect.contact_phone_e164 ?? prospect.contact_phone_raw}`}
                            className="text-primary underline-offset-2 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {prospect.contact_phone_raw}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-[10rem] truncate text-sm text-muted-foreground lg:table-cell">
                        {prospect.agent_id ? (
                          <Link
                            to={`/agents/${prospect.agent_id}`}
                            className="text-primary underline-offset-2 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {prospect.agent_name ?? '—'}
                          </Link>
                        ) : (
                          prospect.agent_name ?? '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={`w-fit text-xs capitalize ${stage.className}`}>
                            {stage.label}
                          </Badge>
                          <span className="text-[11px] font-medium capitalize text-muted-foreground">
                            {conversionPresentation[prospect.conversion_status]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant="outline"
                            className={`w-fit text-xs capitalize ${submissionBadgeClass(prospect.submission_status)}`}
                          >
                            {submissionPresentation[prospect.submission_status].replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDashboardDateFr(prospect.last_synced_at)}
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
                      <TableCell className="hidden max-w-[11rem] md:table-cell">
                        <p className="truncate font-mono text-[11px] text-foreground">
                          {prospect.iacrm_prospect_id ?? '—'}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {prospect.iacrm_status_label ?? prospect.iacrm_status_code ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                        {formatDashboardDateFr(prospect.submitted_at)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm tabular-nums text-foreground">
                            {(prospect.history_count ?? 0).toLocaleString('fr-FR')} events
                          </span>
                          <Link
                            to={`/prospects/${prospect.id}#prospect-timeline`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <History className="size-3.5 shrink-0" aria-hidden />
                            Timeline
                          </Link>
                        </div>
                      </TableCell>
                      {showDeleted ? (
                        <TableCell className="hidden max-w-[10rem] text-xs text-muted-foreground xl:table-cell">
                          {formatDashboardDateFr(prospect.deleted_at)}
                          {prospect.deleted_by_user ? (
                            <p className="mt-1 truncate" title={prospect.soft_delete_reason ?? undefined}>
                              {prospect.deleted_by_user.display_name}
                            </p>
                          ) : null}
                        </TableCell>
                      ) : null}
                      <TableCell className="pe-2 text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              aria-label={`Actions for ${prospect.contact_name}`}
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[10rem]">
                            <DropdownMenuItem asChild>
                              <Link to={`/prospects/${prospect.id}`}>Open detail</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/prospects/${prospect.id}#prospect-timeline`}>
                                View timeline
                              </Link>
                            </DropdownMenuItem>
                            {prospect.agent_id ? (
                              <DropdownMenuItem asChild>
                                <Link to={`/agents/${prospect.agent_id}`}>Open agent</Link>
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
                                  Delete
                                </DropdownMenuItem>
                              </>
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
        </article>
      )}

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
