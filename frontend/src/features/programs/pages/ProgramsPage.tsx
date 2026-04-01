import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import {
  createProgram,
  fetchExchangePacks,
  fetchPrograms,
  pauseProgram,
  reactivateProgram,
  updateProgram,
} from '../api'
import { ProgramFormDialog } from '../components/ProgramFormDialog'
import type {
  ProgramMutationPayload,
  ProgramRecord,
  ProgramStatus,
} from '../../../types/programs'

const programQueryKey = ['programs', 'list']
const exchangePackQueryKey = ['exchange-packs', 'list']

const statusPresentation: Record<ProgramStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  paused: { label: 'Paused', className: 'bg-amber-100 text-amber-700' },
  archived: { label: 'Archived', className: 'bg-rose-100 text-rose-700' },
}

function roleSummary(program: ProgramRecord) {
  if (program.commission_type === 'per-transaction') {
    return program.points_per_transaction === null
      ? 'Per transaction'
      : `${program.points_per_transaction.toLocaleString()} pts / transaction`
  }

  return 'Revenue tier'
}

function exchangeSummary(program: ProgramRecord) {
  const base =
    program.exchange_mode === 'both'
      ? 'Rewards + cash'
      : program.exchange_mode === 'reward'
        ? 'Rewards only'
        : 'Cash only'

  if (program.points_per_euro === null || program.exchange_mode === 'reward') {
    return base
  }

  return `${base} / ${program.points_per_euro} pts = 1 EUR`
}

export function ProgramsPage() {
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuthSession()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProgramStatus>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<ProgramRecord | null>(null)

  const programsQuery = useQuery({
    queryKey: programQueryKey,
    queryFn: fetchPrograms,
  })

  const packsQuery = useQuery({
    queryKey: exchangePackQueryKey,
    queryFn: fetchExchangePacks,
    enabled: hasPermission('exchange-pack.view'),
  })

  const createMutation = useMutation({
    mutationFn: createProgram,
    onSuccess: async () => {
      setDialogOpen(false)
      setEditingProgram(null)
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      programId,
      payload,
    }: {
      programId: string
      payload: ProgramMutationPayload
    }) => updateProgram(programId, payload),
    onSuccess: async () => {
      setDialogOpen(false)
      setEditingProgram(null)
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: pauseProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: reactivateProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const programs = programsQuery.data?.data ?? []
  const packs = packsQuery.data?.data ?? []
  const ownerCanCreate = hasPermission('program.create')
  const mutationError = (createMutation.error ?? updateMutation.error) as ApiError | null

  const filteredPrograms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return programs.filter((program) => {
      const matchesStatus = statusFilter === 'all' || program.status === statusFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        program.name.toLowerCase().includes(normalizedSearch) ||
        (program.business_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (program.description ?? '').toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [programs, search, statusFilter])

  if (programsQuery.isPending) {
    return (
      <article className="rounded-xl border border-border bg-card/90 p-6 text-sm text-muted-foreground">
        Loading program catalog...
      </article>
    )
  }

  if (programsQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(programsQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Tenant operations
          </p>
          <h1 className="app-page-title mt-2">
            Programs
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Referral rules, exchange mode, and assigned catalog from the live backend.
          </p>
        </article>

        <article className="rounded-xl border border-border bg-foreground p-6 text-background shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/70">
            Scope
          </p>
          <p className="app-stat-value mt-3 text-background">
            {user?.primary_business?.display_name ?? 'Global'}
          </p>
          <div className="mt-5 space-y-2 text-sm text-background/80">
            <p>Catalog: {programs.length}</p>
            <p>Reward packs: {packs.length}</p>
            <p>Mode: {ownerCanCreate ? 'Owner control' : 'Assigned agent view'}</p>
          </div>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Programs" value={programs.length.toString()} />
        <MetricCard label="Active" value={programs.filter((program) => program.status === 'active').length.toString()} />
        <MetricCard label="Paused" value={programs.filter((program) => program.status === 'paused').length.toString()} />
      </div>

      <article className="rounded-xl border border-border bg-card/90 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Search by program, business, or description..."
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | ProgramStatus)}
              className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              <option value="all">All states</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {ownerCanCreate ? (
            <button
              type="button"
              onClick={() => {
                setEditingProgram(null)
                setDialogOpen(true)
              }}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Create program
            </button>
          ) : null}
        </div>
      </article>

      {filteredPrograms.length === 0 ? (
        <article className="rounded-xl border border-dashed border-border bg-card/90 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Program inventory
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            No programs match the current filter.
          </h2>
        </article>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredPrograms.map((program) => {
            const statusChip = statusPresentation[program.status]
            const canEdit = program.actions.can_update
            const canPause = program.actions.can_pause
            const isPaused = program.status === 'paused'
            const isRevenueTier = program.commission_type === 'revenue-tier'

            return (
              <article
                key={program.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {program.business_name ?? 'Business'}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {program.name}
                    </h2>
                  </div>
                  <span className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusChip.className}`}>
                    {statusChip.label}
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  {program.description ?? 'No description available.'}
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <MiniPanel label="Earning rule" value={roleSummary(program)} meta={`Rule v${program.rule_version}`} />
                  <MiniPanel label="Exchange mode" value={exchangeSummary(program)} meta={`Pack: ${program.exchange_pack?.name ?? 'None'}`} />
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Eligibility
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {program.eligibility_criteria ?? 'No eligibility rules defined.'}
                  </p>
                </div>

                {program.exchange_pack?.items.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {program.exchange_pack.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-sm text-foreground"
                      >
                        {item.title} / {item.points_cost} pts
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Assigned agents: {program.assigned_agents_count ?? 0}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/programs/${program.id}`}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
                    >
                      Open
                    </Link>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProgram(program)
                          setDialogOpen(true)
                        }}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
                      >
                        Edit
                      </button>
                    ) : null}
                    {canPause ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (isPaused) {
                            reactivateMutation.mutate(program.id)
                            return
                          }

                          pauseMutation.mutate(program.id)
                        }}
                        disabled={
                          pauseMutation.isPending ||
                          reactivateMutation.isPending ||
                          (isPaused && isRevenueTier)
                        }
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPaused ? 'Reactivate' : 'Pause'}
                      </button>
                    ) : null}
                  </div>
                </div>

                {isPaused && isRevenueTier ? (
                  <p className="mt-4 text-sm text-amber-700">
                    Revenue-tier programs stay paused until tier rules are modeled in the backend.
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      <ProgramFormDialog
        open={dialogOpen}
        title={editingProgram ? 'Update program' : 'Create program'}
        submitLabel={editingProgram ? 'Save changes' : 'Create program'}
        packs={packs}
        initialProgram={editingProgram}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={mutationError}
        onClose={() => {
          setDialogOpen(false)
          setEditingProgram(null)
          createMutation.reset()
          updateMutation.reset()
        }}
        onSubmit={async (payload) => {
          try {
            if (editingProgram) {
              await updateMutation.mutateAsync({
                programId: editingProgram.id,
                payload,
              })
              return
            }

            await createMutation.mutateAsync(payload)
          } catch {
            // Mutation state already exposes the API error for inline rendering.
          }
        }}
      />
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </article>
  )
}

function MiniPanel({
  label,
  value,
  meta,
}: {
  label: string
  value: string
  meta: string
}) {
  return (
    <article className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
    </article>
  )
}
