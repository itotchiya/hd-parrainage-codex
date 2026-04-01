import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { fetchAgent } from '../api'

function formatDate(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()

  const query = useQuery({
    queryKey: ['agents', 'detail', agentId],
    queryFn: () => fetchAgent(agentId ?? ''),
    enabled: Boolean(agentId),
  })

  if (!agentId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Agent identifier is missing.
      </article>
    )
  }

  if (query.isPending) {
    return (
      <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading agent profile...
      </article>
    )
  }

  if (query.isError || !query.data) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(query.error as ApiError).message}
      </article>
    )
  }

  const agent = query.data.data

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Agent
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {agent.display_name ?? 'Unnamed agent'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{agent.email ?? 'No email available'}</p>
            </div>
          </div>

          <Link
            to="/agents"
            className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Back to agents
          </Link>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Identity
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DataCell label="Code" value={agent.agent_code ?? 'Not assigned'} />
            <DataCell label="Status" value={agent.status} />
            <DataCell label="Invited" value={formatDate(agent.invited_at)} />
            <DataCell label="Activated" value={formatDate(agent.activated_at)} />
            <DataCell label="Suspended" value={formatDate(agent.suspended_at)} />
            <DataCell label="Last activity" value={formatDate(agent.last_activity_at)} />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Notes
          </p>
          <div className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-4 text-sm leading-6 text-muted-foreground">
            {agent.notes ?? 'No notes recorded for this agent.'}
          </div>
        </article>
      </div>
    </section>
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
