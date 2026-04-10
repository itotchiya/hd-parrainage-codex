import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, FilterX, Mail, MoreHorizontal, Plus, Search, UserCheck, UserX, Users } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchAgents, inviteAgent, reactivateAgent, suspendAgent } from '../api'
import { AddAgentDialog } from '../components/AddAgentDialog'
import { AgentLifecycleConfirmDialog, type AgentLifecycleAction } from '../components/AgentActionDialogs'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { KpiCard, KpiCardSkeleton } from '@/features/dashboard/components/KpiCard'
import { DashboardSectionHeader } from '@/features/dashboard/components/DashboardSectionHeader'
import {
  agentStatusBadgeClass,
  formatDashboardDateFr,
  programStatusBadgeClass,
} from '@/features/dashboard/utils/semanticBadges'
import { DetailEmptyState } from '@/components/app/DetailPageKit'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { AgentAvatarFallback, Avatar, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { AgentRecord } from '@/types/agents'

type AgentSortKey = 'agent' | 'status' | 'joined'

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

function agentJoinedTime(agent: AgentRecord) {
  return new Date(agent.activated_at ?? agent.invited_at ?? agent.created_at ?? 0).getTime()
}

function compareAgents(left: AgentRecord, right: AgentRecord, key: AgentSortKey, direction: SortDirection) {
  const modifier = direction === 'asc' ? 1 : -1
  const result =
    key === 'joined'
      ? agentJoinedTime(left) - agentJoinedTime(right)
      : key === 'status'
        ? normalizeAgentStatus(left.status).localeCompare(normalizeAgentStatus(right.status))
        : (left.display_name ?? left.email ?? '').localeCompare(right.display_name ?? right.email ?? '')

  return result * modifier
}

function AgentsPageSkeleton() {
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Skeleton className="h-9 w-full sm:w-[260px]" />
            <Skeleton className="h-9 w-full sm:w-[150px]" />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg bg-background/40">
          <div className="h-11 bg-muted/30" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 border-t border-border/50 bg-card/70 first:border-t-0" />
          ))}
        </div>
      </article>
    </section>
  )
}

export function AgentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthSession()
  const canInvite = hasPermission('agent.invite')
  const canSuspend = hasPermission('agent.suspend')
  const canReactivate = hasPermission('agent.reactivate')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [pendingLifecycleAction, setPendingLifecycleAction] = useState<{
    type: AgentLifecycleAction
    agent: AgentRecord
  } | null>(null)
  const [programsDialogAgent, setProgramsDialogAgent] = useState<AgentRecord | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<AgentSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const listQuery = useQuery({
    queryKey: ['agents', 'list'],
    queryFn: fetchAgents,
  })

  const inviteMutation = useMutation({
    mutationFn: inviteAgent,
    onSuccess: async () => {
      setInviteOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })

  const suspendMutation = useMutation({
    mutationFn: ({ agentId, reason }: { agentId: string; reason: string }) => suspendAgent(agentId, { reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agents'] })
      setPendingLifecycleAction(null)
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: ({ agentId }: { agentId: string }) => reactivateAgent(agentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agents'] })
      setPendingLifecycleAction(null)
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
    return records.filter((item) => {
      const matchSearch = !q || [item.display_name ?? '', item.email ?? '', item.agent_code ?? ''].some(value => value.toLowerCase().includes(q))
      
      const s = normalizeAgentStatus(item.status)
      let mappedStatus = s
      if (s === 'invited' || s === 'pending' || s === 'pending_activation') mappedStatus = 'pending'
      else if (s === 'inactive' || s === 'suspended') mappedStatus = 'suspended'
      
      const matchStatus = statusFilter === 'all' || mappedStatus === statusFilter
      return matchSearch && matchStatus
    })
  }, [records, search, statusFilter])

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== 'all'

  const sortedAgents = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((left, right) => compareAgents(left, right, sortKey, sortDirection))
  }, [filtered, sortDirection, sortKey])

  function handleSort(nextKey: AgentSortKey) {
    setPage(1)
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection(nextKey === 'joined' ? 'desc' : 'asc')
  }

  useEffect(() => {
    setPage(1)
  }, [search])

  const totalFiltered = sortedAgents.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const pageSafe = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    return sortedAgents.slice(start, start + pageSize)
  }, [sortedAgents, pageSafe, pageSize])

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

  if (listQuery.isPending) {
    return <AgentsPageSkeleton />
  }

  if (listQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(listQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <>
      <AddAgentDialog
        open={inviteOpen}
        isPending={inviteMutation.isPending}
        error={inviteMutation.isError ? (inviteMutation.error as ApiError) : null}
        onClose={() => {
          setInviteOpen(false)
          inviteMutation.reset()
        }}
        onSubmit={(payload) => inviteMutation.mutate(payload)}
      />
      <AgentLifecycleConfirmDialog
        action={pendingLifecycleAction}
        isSubmitting={suspendMutation.isPending || reactivateMutation.isPending}
        error={
          suspendMutation.isError
            ? (suspendMutation.error as ApiError)
            : reactivateMutation.isError
              ? (reactivateMutation.error as ApiError)
              : null
        }
        onClose={() => {
          setPendingLifecycleAction(null)
          suspendMutation.reset()
          reactivateMutation.reset()
        }}
        onConfirm={async (action, agent, payload) => {
          if (action === 'suspend') {
            await suspendMutation.mutateAsync({ agentId: agent.id, reason: payload.reason ?? '' })
            return
          }
          await reactivateMutation.mutateAsync({ agentId: agent.id })
        }}
      />
      <Dialog open={programsDialogAgent !== null} onOpenChange={(open) => !open && setProgramsDialogAgent(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Programmes assignés</DialogTitle>
            <DialogDescription>
              {programsDialogAgent
                ? `Liste complète des programmes actuellement attribués à ${programsDialogAgent.display_name ?? programsDialogAgent.email ?? 'cet affilié'}.`
                : 'Liste complète des programmes assignés à cet affilié.'}
            </DialogDescription>
          </DialogHeader>
          {programsDialogAgent && (programsDialogAgent.assigned_programs?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {programsDialogAgent.assigned_programs?.map((assignment) => (
                <button
                  key={assignment.assignment_id}
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-dashed border-border bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-muted/20"
                  onClick={() => {
                    setProgramsDialogAgent(null)
                    navigate(`/programs/${assignment.program.id}`)
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{assignment.program.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Assigné le {formatDashboardDateFr(assignment.assigned_at)}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {(assignment.program.assigned_agents_count ?? 0).toLocaleString('fr-FR')} agents
                    </Badge>
                    <Badge className={programStatusBadgeClass(assignment.program.status)}>
                      {assignment.program.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <DetailEmptyState
              message="Cet affilié n’est actuellement lié à aucun programme."
            />
          )}
        </DialogContent>
      </Dialog>
      <section className="app-section">
      <PageHeader
        title="Agents"
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
                        setStatusFilter('all')
                      }}
                      aria-label="Effacer les filtres"
                    >
                      <FilterX className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Effacer les filtres</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            <Field className="w-full sm:w-[240px] shrink-0">
              <FieldLabel htmlFor="agents-search" className="sr-only">
                Rechercher un affilié
              </FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="agents-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher par nom, email ou code..."
                  className="pl-9"
                />
              </div>
            </Field>
            <Select
              value={statusFilter}
              onValueChange={(value: 'all' | 'active' | 'pending' | 'suspended') => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-[160px] shrink-0">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Statut</SelectLabel>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {canInvite ? (
              <Button
                type="button"
                className="gap-2 shrink-0"
                onClick={() => setInviteOpen(true)}
              >
                <Plus className="size-4" aria-hidden />
                Ajouter un affilié
              </Button>
            ) : null}
          </PageHeaderToolbar>
        }
      />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Affiliés"
            value={agentKpis.total.toLocaleString('fr-FR')}
            description="Nombre total d’affiliés enregistrés pour ce compte"
            icon={Users}
            tone="primary"
          />
          <KpiCard
            title="Actifs"
            value={agentKpis.active.toLocaleString('fr-FR')}
            description="Comptes affiliés actifs et opérationnels"
            icon={UserCheck}
            tone="success"
          />
          <KpiCard
            title="Invitations en attente"
            value={agentKpis.pendingInvite.toLocaleString('fr-FR')}
            description="Invités ou en attente d’activation"
            icon={Mail}
            tone="info"
          />
          <KpiCard
            title="Suspendus"
            value={agentKpis.suspended.toLocaleString('fr-FR')}
            description="Affiliés suspendus ou inactifs côté parrainage"
            icon={UserX}
            tone="warning"
          />
        </div>

        <article className="rounded-lg bg-card p-3 sm:p-4">
          <DashboardSectionHeader
            title="Affiliés"
          />

          {totalFiltered === 0 ? (
            <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
              Aucun affilié ne correspond à ces critères.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <SortableTableHead
                    sortKey="agent"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  >
                    Affilié
                  </SortableTableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <SortableTableHead
                    sortKey="status"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                    className="hidden md:table-cell"
                  >
                    Statut
                  </SortableTableHead>
                  <TableHead className="hidden lg:table-cell">Programmes</TableHead>
                  <SortableTableHead
                    sortKey="joined"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  >
                    Adhésion
                  </SortableTableHead>
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
                            <AvatarImage src={agent.avatar_url ?? undefined} alt={displayName} />
                            <AgentAvatarFallback seed={agent.id} className="text-xs font-medium">
                              {initials(displayName)}
                            </AgentAvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary underline underline-offset-4 decoration-border group-hover:decoration-primary">
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
                      <TableCell className="hidden lg:table-cell">
                        <button
                          type="button"
                          className="cursor-pointer"
                          onClick={() => setProgramsDialogAgent(agent)}
                        >
                          <Badge
                            variant="secondary"
                            className="transition-colors hover:bg-secondary/80"
                          >
                            {(agent.assigned_programs_count ?? 0).toLocaleString('fr-FR')}{' '}
                            {(agent.assigned_programs_count ?? 0) > 1 ? 'programmes' : 'programme'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDashboardDateFr(joinedAt)}
                      </TableCell>
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
                                    <Link to={`/agents/${agent.id}`} aria-label={`Voir le profil de ${displayName}`}>
                                      <Eye className="size-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Voir le profil</TooltipContent>
                              </Tooltip>
                              {showSuspend ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={actionsBusy}
                                      className="border border-red-500/30 text-red-600 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 dark:text-red-400"
                                      onClick={() => setPendingLifecycleAction({ type: 'suspend', agent })}
                                      aria-label={`Suspendre ${displayName}`}
                                    >
                                      <UserX className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Suspendre</TooltipContent>
                                </Tooltip>
                              ) : null}
                              {showReactivate ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={actionsBusy}
                                      className="border border-emerald-500/30 text-emerald-600 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-400"
                                      onClick={() => setPendingLifecycleAction({ type: 'reactivate', agent })}
                                      aria-label={`Réactiver ${displayName}`}
                                    >
                                      <UserCheck className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Réactiver</TooltipContent>
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
                              aria-label={`Actions pour ${displayName}`}
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[10rem]">
                            <DropdownMenuItem asChild>
                              <Link to={`/agents/${agent.id}`}>
                                <Eye className="size-4 text-primary" />
                                <span>Voir le profil</span>
                              </Link>
                            </DropdownMenuItem>
                            {(showSuspend || showReactivate) && (
                              <DropdownMenuSeparator />
                            )}
                            {showSuspend ? (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={actionsBusy}
                                onClick={() => setPendingLifecycleAction({ type: 'suspend', agent })}
                              >
                                <UserX className="size-4 text-destructive" />
                                <span>Suspendre</span>
                              </DropdownMenuItem>
                            ) : null}
                            {showReactivate ? (
                              <DropdownMenuItem
                                disabled={actionsBusy}
                                className="text-emerald-600 focus:text-emerald-600 dark:text-emerald-400 dark:focus:text-emerald-400"
                                onClick={() => setPendingLifecycleAction({ type: 'reactivate', agent })}
                              >
                                <UserCheck className="size-4 text-emerald-500" />
                                <span>Réactiver</span>
                              </DropdownMenuItem>
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
          )}
        </article>
      </section>
    </>
  )
}

