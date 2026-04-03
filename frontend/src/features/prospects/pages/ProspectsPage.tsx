import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchPrograms } from '../../programs/api'
import { DeleteProspectDialog } from '../components/DeleteProspectDialog'
import { NewProspectDialog } from '../components/NewProspectDialog'
import {
  createProspect,
  deleteProspect,
  fetchDeletedProspects,
  fetchProspects,
} from '../api'
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
import type { ProspectPipelineStage, ProspectRecord } from '../../../types/prospects'

const prospectsQueryKey = ['prospects', 'list']
const deletedProspectsQueryKey = ['prospects', 'deleted']
const assignedProgramsQueryKey = ['programs', 'assigned-for-prospect']

const stagePresentation: Record<
  ProspectPipelineStage,
  { label: string; className: string }
> = {
  suspect: { label: 'Suspect', className: 'border-border bg-muted/40 text-foreground' },
  prospect_froid: { label: 'Prospect Froid', className: 'border-border bg-blue-500/10 text-blue-800 dark:text-blue-300' },
  prospect_tiede: { label: 'Prospect Tiede', className: 'border-border bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  prospect_chaud: { label: 'Prospect Chaud', className: 'border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
}

const submissionPresentation = {
  pending_sync: 'Pending sync',
  synced: 'Synced',
  sync_failed: 'Sync failed',
  deleted: 'Deleted',
}

function formatDate(value: string | null) {
  if (value === null) {
    return 'Not available'
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function ProspectsPage() {
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuthSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<'all' | ProspectPipelineStage>('all')
  const [selectedAgentId, setSelectedAgentId] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false)
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
        (prospect.agent_name ?? '').toLowerCase().includes(normalizedSearch)

      return matchesStage && matchesAgent && matchesSearch
    })
  }, [prospects, search, selectedAgentId, stageFilter])

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
      <PageHeader
        title="Prospects"
        right={
          <PageHeaderToolbar>
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
                  placeholder="Contact, company, program, agent..."
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

            <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleted((c) => !c)}>
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
          </PageHeaderToolbar>
        }
      />
      <p className="app-copy text-muted-foreground">
        Funnel stages, sync status, and ownership from live data.
      </p>

      <div className="grid gap-3 lg:grid-cols-[1fr_minmax(220px,280px)]">
        <article className="rounded-lg border border-border bg-muted/15 px-4 py-3 md:px-5 md:py-4">
          <p className="app-eyebrow">Scope</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {user?.primary_business?.display_name ?? 'Global platform'}
          </p>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p>Visible: {prospects.length}</p>
            <p>Create: {hasPermission('prospect.submit') ? 'Enabled' : 'Read only'}</p>
            <p>Deleted view: {showDeleted ? 'On' : 'Off'}</p>
          </div>
        </article>
      </div>

      {!showDeleted ? (
        <div className="app-grid-tight sm:grid-cols-2 xl:grid-cols-4">
          {stageCards.map((stage) => (
            <article key={stage.key} className="rounded-lg border border-border bg-card px-4 py-3 md:px-5 md:py-4">
              <p className="app-eyebrow">{stage.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{stage.count}</p>
            </article>
          ))}
        </div>
      ) : (
        <article className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-4 text-sm text-muted-foreground">
          Deleted records stay visible for audit and correction history.
        </article>
      )}

      {filteredProspects.length === 0 ? (
        <article className="rounded-lg border border-dashed border-border bg-muted/15 app-card-padding">
          <p className="app-eyebrow">Prospect inventory</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">No prospects match the current filter.</h2>
        </article>
      ) : (
        <div className="app-section">
          {filteredProspects.map((prospect) => {
            const stage = stagePresentation[prospect.pipeline_stage]

            return (
              <article key={prospect.id} className="rounded-lg border border-border bg-card app-card-padding">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="app-eyebrow">
                        {prospect.business_name ?? 'Business'} / {prospect.program_name ?? 'Program'}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                        {prospect.contact_name}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${stage.className}`}
                      >
                        {stage.label}
                      </span>
                      <span className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {submissionPresentation[prospect.submission_status]}
                      </span>
                    </div>
                    <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                      <p>Email: {prospect.contact_email ?? 'Not provided'}</p>
                      <p>Phone: {prospect.contact_phone_raw ?? 'Not provided'}</p>
                      <p>Agent: {prospect.agent_name ?? 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/prospects/${prospect.id}`}>Open</Link>
                    </Button>
                    {prospect.actions.can_delete ? (
                      <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(prospect)}>
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <MiniMetric label="Submitted" value={formatDate(prospect.submitted_at)} />
                  <MiniMetric label="Latest sync" value={formatDate(prospect.last_synced_at)} />
                  <MiniMetric label="IACRM ref" value={prospect.iacrm_prospect_id ?? 'Pending'} />
                  <MiniMetric label="History" value={`${prospect.history_count ?? 0} events`} />
                </div>

                {prospect.sync_error_message ? (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    {prospect.sync_error_message}
                  </p>
                ) : null}

                {prospect.deleted_at ? (
                  <p className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Deleted on {formatDate(prospect.deleted_at)} by{' '}
                    {prospect.deleted_by_user?.display_name ?? 'Unknown'}.
                    {prospect.soft_delete_reason ? ` Reason: ${prospect.soft_delete_reason}` : ''}
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-muted/15 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </article>
  )
}
