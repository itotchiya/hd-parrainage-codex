import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchAgents, inviteAgent, reactivateAgent, suspendAgent } from '../api'
import type { AgentRecord } from '../../../types/agents'

export function AgentsPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthSession()
  const canInvite = hasPermission('agent.invite')
  const canSuspend = hasPermission('agent.suspend')
  const canReactivate = hasPermission('agent.reactivate')
  const [search, setSearch] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['agents', 'list'],
    queryFn: fetchAgents,
  })

  const inviteMutation = useMutation({
    mutationFn: inviteAgent,
    onSuccess: async (response) => {
      setFeedback(
        response.meta?.invitation_token
          ? `Invite created. Local token: ${response.meta.invitation_token}`
          : 'Invite created.',
      )
      setDisplayName('')
      setEmail('')
      setNotes('')
      await queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: (error) => setFeedback((error as ApiError).message),
  })

  const suspendMutation = useMutation({
    mutationFn: suspendAgent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: reactivateAgent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })

  const records = listQuery.data?.data ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return records
    return records.filter((item) =>
      [item.display_name ?? '', item.email ?? '', item.agent_code ?? ''].some((value) =>
        value.toLowerCase().includes(q),
      ),
    )
  }, [records, search])

  if (listQuery.isPending) {
    return <article className="rounded-xl border border-border bg-card/90 p-6 text-sm text-muted-foreground">Loading agents...</article>
  }

  if (listQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(listQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="space-y-6">
      <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Affiliate management</p>
        <h1 className="app-page-title mt-2">
          Agents
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invitation, status control, and detail access in one compact view.
        </p>
      </article>

      {canInvite ? (
        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Invite agent
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Display name"
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Email"
            />
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 md:col-span-2"
              placeholder="Optional notes"
            />
          </div>
          {feedback ? <p className="mt-3 text-sm text-foreground">{feedback}</p> : null}
          <button
            type="button"
            disabled={inviteMutation.isPending}
            onClick={() => inviteMutation.mutate({ display_name: displayName.trim(), email: email.trim(), notes: notes.trim() || undefined })}
            className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send invite'}
          </button>
        </article>
      ) : null}

      <article className="rounded-xl border border-border bg-card/90 p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="Search by name, email, or code..."
        />
      </article>

      <div className="space-y-4">
        {filtered.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            canSuspend={canSuspend}
            canReactivate={canReactivate}
            onSuspend={(id) => suspendMutation.mutate(id)}
            onReactivate={(id) => reactivateMutation.mutate(id)}
            actionPending={suspendMutation.isPending || reactivateMutation.isPending}
          />
        ))}
      </div>
    </section>
  )
}

function AgentCard({
  agent,
  canSuspend,
  canReactivate,
  onSuspend,
  onReactivate,
  actionPending,
}: {
  agent: AgentRecord
  canSuspend: boolean
  canReactivate: boolean
  onSuspend: (agentId: string) => void
  onReactivate: (agentId: string) => void
  actionPending: boolean
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{agent.agent_code ?? 'No code'}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {agent.display_name ?? 'Unnamed agent'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{agent.email ?? 'No email'}</p>
          <p className="mt-1 text-sm text-muted-foreground">Status: {agent.status}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/agents/${agent.id}`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Open details
          </Link>
          {agent.status !== 'suspended' && canSuspend ? (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => onSuspend(agent.id)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
            >
              Suspend
            </button>
          ) : null}
          {agent.status === 'suspended' && canReactivate ? (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => onReactivate(agent.id)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Reactivate
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
