import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { fetchProgram } from '../api'
import { useAuthSession } from '../../auth/session'

export function ProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>()
  const { hasPermission } = useAuthSession()

  const programQuery = useQuery({
    queryKey: ['programs', 'detail', programId],
    queryFn: async () => fetchProgram(programId ?? ''),
    enabled: Boolean(programId),
  })

  if (!programId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Program identifier is missing from the current route.
      </article>
    )
  }

  if (programQuery.isPending) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading program detail...
      </article>
    )
  }

  if (programQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(programQuery.error as ApiError).message}
      </article>
    )
  }

  const program = programQuery.data.data
  const canAssign = hasPermission('program.assign-agent')

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Program
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{program.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                {program.description ?? 'No program description is available yet.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {program.status}
            </span>
            <Link
              to="/programs"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Back
            </Link>
          </div>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Rules
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DataCell
              label="Commission"
              value={program.commission_type === 'per-transaction' ? 'Per transaction' : 'Revenue tier'}
            />
            <DataCell
              label="Exchange"
              value={
                program.exchange_mode === 'both'
                  ? 'Rewards + cash'
                  : program.exchange_mode === 'reward'
                    ? 'Rewards only'
                    : 'Cash only'
              }
            />
            <DataCell
              label="Points rule"
              value={
                program.points_per_transaction === null
                  ? 'Tier-based'
                  : `${program.points_per_transaction.toLocaleString()} pts`
              }
            />
            <DataCell
              label="Cash rule"
              value={program.points_per_euro === null ? 'No cash conversion' : `${program.points_per_euro} pts / EUR`}
            />
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Eligibility
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {program.eligibility_criteria ?? 'No eligibility rules have been defined yet.'}
            </p>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Reward pack
            </p>
            <span className="text-xs text-slate-500">
              {program.exchange_pack?.items.length ?? 0} items
            </span>
          </div>

          <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
            {program.exchange_pack?.name ?? 'No pack linked'}
          </h2>

          <div className="mt-4 space-y-3">
            {program.exchange_pack?.items.length ? (
              program.exchange_pack.items.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-base font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.points_cost} pts</p>
                </article>
              ))
            ) : (
              <EmptyState message="No reward items are linked to this program." />
            )}
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Assigned agents
          </p>
          <span className="text-xs text-slate-500">
            {program.assigned_agents?.length ?? 0} agents
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {program.assigned_agents && program.assigned_agents.length > 0 ? (
            program.assigned_agents.map((assignment) => (
              <article key={assignment.assignment_id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">
                      {assignment.agent?.display_name ?? 'Unknown agent'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {assignment.agent?.email ?? 'No email'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {assignment.agent?.agent_code ?? 'No code'}
                    </span>
                    <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {assignment.status}
                    </span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              message={
                canAssign
                  ? 'No active agents are assigned to this program yet.'
                  : 'Assigned agent details are owner-visible only in this release.'
              }
            />
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

function EmptyState({ message }: { message: string }) {
  return (
    <article className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
      {message}
    </article>
  )
}
