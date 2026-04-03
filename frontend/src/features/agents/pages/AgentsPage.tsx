import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchAgents, inviteAgent, reactivateAgent, suspendAgent } from '../api'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
    return <article className="app-panel text-sm text-muted-foreground">Loading agents...</article>
  }

  if (listQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(listQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Agents"
        right={
          <PageHeaderToolbar>
            <Field className="w-full sm:min-w-[200px] sm:max-w-[360px] sm:flex-1">
              <FieldLabel htmlFor="agents-search" className="sr-only">
                Search agents
              </FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="agents-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, or code..."
                  className="pl-9"
                />
              </div>
            </Field>
          </PageHeaderToolbar>
        }
      />
      <p className="app-copy text-muted-foreground">
        Invitation, status control, and detail access in one view.
      </p>

      {canInvite ? (
        <article className="rounded-lg border border-border bg-card app-card-padding">
          <p className="app-eyebrow">Invite agent</p>
          <h3 className="mt-2 text-base font-semibold text-foreground">Send a new invitation</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="invite-display-name">Display name</FieldLabel>
              <Input
                id="invite-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Display name"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="invite-notes">Optional notes</FieldLabel>
              <Input
                id="invite-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes"
              />
            </Field>
          </div>
          {feedback ? <p className="mt-3 text-sm text-foreground">{feedback}</p> : null}
          <Button
            type="button"
            size="sm"
            className="mt-4 gap-2"
            disabled={inviteMutation.isPending}
            onClick={() =>
              inviteMutation.mutate({
                display_name: displayName.trim(),
                email: email.trim(),
                notes: notes.trim() || undefined,
              })
            }
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send invite'}
          </Button>
        </article>
      ) : null}

      <div className="app-section">
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
    <article className="rounded-lg border border-border bg-card app-card-padding">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="app-eyebrow">{agent.agent_code ?? 'No code'}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {agent.display_name ?? 'Unnamed agent'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{agent.email ?? 'No email'}</p>
          <p className="mt-1 text-sm text-muted-foreground">Status: {agent.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/agents/${agent.id}`}>Open details</Link>
          </Button>
          {agent.status !== 'suspended' && canSuspend ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionPending}
              onClick={() => onSuspend(agent.id)}
            >
              Suspend
            </Button>
          ) : null}
          {agent.status === 'suspended' && canReactivate ? (
            <Button type="button" size="sm" disabled={actionPending} onClick={() => onReactivate(agent.id)}>
              Reactivate
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
