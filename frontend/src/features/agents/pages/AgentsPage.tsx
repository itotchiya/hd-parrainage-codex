import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Mail, MoreHorizontal, Plus, Search, UserCheck, UserX, Users } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchAgents, inviteAgent, reactivateAgent, suspendAgent } from '../api'
import { KpiCard, kpiSnapshotBadge } from '@/features/dashboard/components/KpiCard'
import { DashboardSectionHeader } from '@/features/dashboard/components/DashboardSectionHeader'
import { agentStatusBadgeClass, formatDashboardDateFr } from '@/features/dashboard/utils/semanticBadges'
import { PageHeader } from '@/components/app/PageHeader'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { AgentAvatarFallback, Avatar } from '@/components/ui/avatar'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function formatShortId(id: string) {
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}

function agentAffiliateSubline(agent: { id: string; agent_code: string | null }) {
  if (agent.agent_code?.trim()) return agent.agent_code
  return formatShortId(agent.id)
}

function normalizeAgentStatus(status: string) {
  return status.toLowerCase().replace(/\s+/g, '_')
}

export function AgentsPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthSession()
  const canInvite = hasPermission('agent.invite')
  const canSuspend = hasPermission('agent.suspend')
  const canReactivate = hasPermission('agent.reactivate')
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const listQuery = useQuery({
    queryKey: ['agents', 'list'],
    queryFn: fetchAgents,
  })

  const inviteMutation = useMutation({
    mutationFn: inviteAgent,
    onSuccess: async () => {
      setDisplayName('')
      setEmail('')
      setNotes('')
      setInviteOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
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

  const agentKpis = useMemo(() => {
    let active = 0
    let pendingInvite = 0
    let suspended = 0
    for (const a of records) {
      const s = normalizeAgentStatus(a.status)
      if (s === 'active') active += 1
      else if (s === 'invited' || s === 'pending' || s === 'pending_activation') pendingInvite += 1
      else if (s === 'suspended' || s === 'inactive') suspended += 1
    }
    return {
      total: records.length,
      active,
      pendingInvite,
      suspended,
    }
  }, [records])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return records
    return records.filter((item) =>
      [item.display_name ?? '', item.email ?? '', item.agent_code ?? ''].some((value) =>
        value.toLowerCase().includes(q),
      ),
    )
  }, [records, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const totalFiltered = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const pageSafe = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, pageSafe, pageSize])

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

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
    <Dialog
      open={inviteOpen}
      onOpenChange={(open) => {
        setInviteOpen(open)
        inviteMutation.reset()
      }}
    >
      <section className="app-section">
        <PageHeader
          title="Agents"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Affiliés"
            value={agentKpis.total.toLocaleString('fr-FR')}
            description="Nombre total d’affiliés enregistrés pour ce compte"
            badge={kpiSnapshotBadge('Total')}
            icon={Users}
            tone="primary"
          />
          <KpiCard
            title="Actifs"
            value={agentKpis.active.toLocaleString('fr-FR')}
            description="Comptes affiliés actifs et opérationnels"
            badge={kpiSnapshotBadge('Actif')}
            icon={UserCheck}
            tone="success"
          />
          <KpiCard
            title="Invitations en attente"
            value={agentKpis.pendingInvite.toLocaleString('fr-FR')}
            description="Invités ou en attente d’activation"
            badge={kpiSnapshotBadge('Invitation')}
            icon={Mail}
            tone="info"
          />
          <KpiCard
            title="Suspendus"
            value={agentKpis.suspended.toLocaleString('fr-FR')}
            description="Affiliés suspendus ou inactifs côté parrainage"
            badge={kpiSnapshotBadge('Suspendu')}
            icon={UserX}
            tone="warning"
          />
        </div>

        <DialogContent className="sm:max-w-md" showCloseButton>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              inviteMutation.mutate({
                display_name: displayName.trim(),
                email: email.trim(),
                notes: notes.trim() || undefined,
              })
            }}
          >
            <DialogHeader>
              <DialogTitle>Invite agent</DialogTitle>
              <DialogDescription>
                Send an invitation email. The recipient will receive steps to activate their affiliate account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <Field>
                <FieldLabel htmlFor="invite-display-name">Display name</FieldLabel>
                <Input
                  id="invite-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Display name"
                  autoComplete="name"
                  required
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
                  autoComplete="email"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-notes">Optional notes</FieldLabel>
                <Input
                  id="invite-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Internal note"
                />
              </Field>
              {inviteMutation.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  {(inviteMutation.error as ApiError).message}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Sending...' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>

        <article className="rounded-lg bg-card p-3 sm:p-4">
          <DashboardSectionHeader
            title="Affiliés"
            actions={
              <>
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
                {canInvite ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 sm:shrink-0"
                    onClick={() => setInviteOpen(true)}
                  >
                    <Plus className="size-4" aria-hidden />
                    Add agent
                  </Button>
                ) : null}
              </>
            }
          />

          {totalFiltered === 0 ? (
            <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
              No agents match the current filter.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>Affilié</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Statut</TableHead>
                  <TableHead>Adhésion</TableHead>
                  <TableHead className="w-10 pe-2 text-end">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageSlice.map((agent, index) => {
                  const displayName = agent.display_name ?? 'Affilié sans nom'
                  const joinedAt = agent.activated_at ?? agent.invited_at ?? agent.created_at ?? null
                  const actionsBusy = suspendMutation.isPending || reactivateMutation.isPending
                  const showSuspend = agent.status !== 'suspended' && canSuspend
                  const showReactivate = agent.status === 'suspended' && canReactivate
                  const rank = (pageSafe - 1) * pageSize + index + 1
                  return (
                    <TableRow key={agent.id}>
                      <TableCell className="text-center text-muted-foreground">{rank}</TableCell>
                      <TableCell>
                        <Link
                          to={`/agents/${agent.id}`}
                          className="group -m-1 flex min-w-0 items-center gap-2.5 rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={`Voir le profil de ${displayName}`}
                        >
                          <Avatar className="size-9 shrink-0">
                            <AgentAvatarFallback seed={agent.id} className="text-xs font-medium">
                              {initials(displayName)}
                            </AgentAvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                              {displayName}
                            </p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {agentAffiliateSubline(agent)}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden max-w-[12rem] truncate sm:table-cell">
                        {agent.email ?? '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {agent.status ? (
                          <Badge
                            variant="outline"
                            className={`capitalize ${agentStatusBadgeClass(agent.status)}`}
                          >
                            {agent.status.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDashboardDateFr(joinedAt)}
                      </TableCell>
                      <TableCell className="pe-2 text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              aria-label={`Actions pour ${displayName}`}
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[10rem]">
                            <DropdownMenuItem asChild>
                              <Link to={`/agents/${agent.id}`}>Voir le profil</Link>
                            </DropdownMenuItem>
                            {(showSuspend || showReactivate) && (
                              <DropdownMenuSeparator />
                            )}
                            {showSuspend ? (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={actionsBusy}
                                onClick={() => suspendMutation.mutate(agent.id)}
                              >
                                Suspendre
                              </DropdownMenuItem>
                            ) : null}
                            {showReactivate ? (
                              <DropdownMenuItem
                                disabled={actionsBusy}
                                onClick={() => reactivateMutation.mutate(agent.id)}
                              >
                                Réactiver
                              </DropdownMenuItem>
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
          )}
        </article>
      </section>
    </Dialog>
  )
}
