import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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
import type { ProspectPipelineStage, ProspectRecord } from '../../../types/prospects'

const prospectsQueryKey = ['prospects', 'list']
const deletedProspectsQueryKey = ['prospects', 'deleted']
const assignedProgramsQueryKey = ['programs', 'assigned-for-prospect']

const stagePresentation: Record<
  ProspectPipelineStage,
  { label: string; className: string }
> = {
  suspect: { label: 'Suspect', className: 'bg-slate-100 text-slate-700' },
  prospect_froid: { label: 'Prospect Froid', className: 'bg-blue-100 text-blue-700' },
  prospect_tiede: { label: 'Prospect Tiede', className: 'bg-amber-100 text-amber-700' },
  prospect_chaud: { label: 'Prospect Chaud', className: 'bg-emerald-100 text-emerald-700' },
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
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<'all' | ProspectPipelineStage>('all')
  const [selectedAgentId, setSelectedAgentId] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
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
  const createError = createMutation.error as ApiError | null
  const deleteError = deleteMutation.error as ApiError | null

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
      <article className="rounded-xl border border-slate-300/70 bg-white/90 p-6 text-sm text-slate-600">
        Loading prospects...
      </article>
    )
  }

  if (sourceQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(sourceQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-slate-300/70 bg-white p-6 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Funnel tracking
          </p>
          <h1 className="app-page-title mt-2 text-slate-950">
            Prospects
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Live prospect stages, deleted history, and scoped ownership from backend data.
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
            <p>Visible prospects: {prospects.length}</p>
            <p>Create rights: {hasPermission('prospect.submit') ? 'Enabled' : 'Read only'}</p>
            <p>Deleted view: {showDeleted ? 'Active' : 'Hidden'}</p>
          </div>
        </article>
      </div>

      {!showDeleted ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stageCards.map((stage) => (
            <article
              key={stage.key}
              className="rounded-lg border border-slate-300/70 bg-white px-5 py-4 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.16)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {stage.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {stage.count}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <article className="rounded-xl border border-dashed border-slate-300 bg-white/90 p-5 text-sm text-slate-600">
          Deleted records remain visible here for audit and correction history.
        </article>
      )}

      <article className="rounded-xl border border-slate-300/70 bg-white/90 p-4 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
              placeholder="Search by contact, company, program, or agent..."
            />
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value as 'all' | ProspectPipelineStage)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
              disabled={showDeleted}
            >
              <option value="all">All stages</option>
              {Object.entries(stagePresentation).map(([key, stage]) => (
                <option key={key} value={key}>
                  {stage.label}
                </option>
              ))}
            </select>
            {hasPermission('prospect.view') && user?.agent_profile === null ? (
              <select
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                <option value="all">All agents</option>
                {agentOptions.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowDeleted((current) => !current)}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              {showDeleted ? 'Active prospects' : 'Deleted history'}
            </button>
            {hasPermission('prospect.submit') ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                New prospect
              </button>
            ) : null}
          </div>
        </div>
      </article>

      {filteredProspects.length === 0 ? (
        <article className="rounded-xl border border-dashed border-slate-300 bg-white/90 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Prospect inventory
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            No prospects match the current filter.
          </h2>
        </article>
      ) : (
        <div className="space-y-4">
          {filteredProspects.map((prospect) => {
            const stage = stagePresentation[prospect.pipeline_stage]

            return (
              <article
                key={prospect.id}
                className="rounded-xl border border-slate-300/70 bg-white p-5 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.16)]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {prospect.business_name ?? 'Business'} / {prospect.program_name ?? 'Program'}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                        {prospect.contact_name}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${stage.className}`}>
                        {stage.label}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {submissionPresentation[prospect.submission_status]}
                      </span>
                    </div>
                    <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                      <p>Email: {prospect.contact_email ?? 'Not provided'}</p>
                      <p>Phone: {prospect.contact_phone_raw ?? 'Not provided'}</p>
                      <p>Agent: {prospect.agent_name ?? 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Link
                      to={`/prospects/${prospect.id}`}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      Open
                    </Link>
                    {prospect.actions.can_delete ? (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(prospect)}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Delete
                      </button>
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
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {prospect.sync_error_message}
                  </p>
                ) : null}

                {prospect.deleted_at ? (
                  <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Deleted on {formatDate(prospect.deleted_at)} by {prospect.deleted_by_user?.display_name ?? 'Unknown'}.
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
        programs={assignedPrograms}
        isSubmitting={createMutation.isPending}
        error={createError}
        onClose={() => {
          setCreateOpen(false)
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
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </article>
  )
}
