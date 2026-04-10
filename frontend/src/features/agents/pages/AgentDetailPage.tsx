import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Search, UserCheck, UserX } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  DetailEmptyState,
  DetailSectionCard,
} from '@/components/app/DetailPageKit'
import { EntityCardIdentity } from '@/components/app/EntityCardIdentity'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
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
import { agentStatusBadgeClass, programStatusBadgeClass } from '@/features/dashboard/utils/semanticBadges'
import { buildProspectDetailPath } from '@/features/prospects/paths'
import { useAppBreadcrumbTrail } from '@/layouts/AppShell'
import { ApiError } from '@/lib/api'
import { avatarSeedForUser } from '@/lib/avatar-fallback'
import { cn } from '@/lib/utils'
import type { AgentProspectSummary, AgentRecord } from '@/types/agents'
import { Skeleton } from '@/components/ui/skeleton'

import { useAuthSession } from '../../auth/session'
import { fetchAgent, reactivateAgent, suspendAgent } from '../api'
import { AgentLifecycleConfirmDialog, type AgentLifecycleAction } from '../components/AgentActionDialogs'

const stageLabel: Record<string, string> = {
  suspect: 'Suspect',
  prospect_froid: 'Prospect froid',
  prospect_tiede: 'Prospect tiède',
  prospect_chaud: 'Prospect chaud',
}

const submissionLabel: Record<string, string> = {
  pending_sync: 'En attente',
  synced: 'Synchronisé',
  sync_failed: 'Échec sync',
  deleted: 'Supprimé',
}

type AgentProspectSortKey = 'prospect' | 'program' | 'stage' | 'submitted'

function formatDate(value: string | null, withTime = false) {
  if (!value) {
    return 'Indisponible'
  }

  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  })
}

function initials(name: string | null | undefined, email: string | null | undefined) {
  const displayName = name?.trim()
  if (displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean)
    if (parts.length > 1) {
      return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
    }
    return displayName.slice(0, 2).toUpperCase()
  }
  return (email ?? '?').slice(0, 2).toUpperCase()
}

function sortProspects(
  left: AgentProspectSummary,
  right: AgentProspectSummary,
  key: AgentProspectSortKey,
  direction: SortDirection,
) {
  const modifier = direction === 'asc' ? 1 : -1
  const result =
    key === 'submitted'
      ? new Date(left.submitted_at ?? 0).getTime() - new Date(right.submitted_at ?? 0).getTime()
      : key === 'stage'
        ? (stageLabel[left.pipeline_stage] ?? left.pipeline_stage).localeCompare(
            stageLabel[right.pipeline_stage] ?? right.pipeline_stage,
          )
        : key === 'program'
          ? (left.program_name ?? '').localeCompare(right.program_name ?? '')
          : left.contact_name.localeCompare(right.contact_name)

  return result * modifier
}

function stageBadgeClass(stage: string) {
  if (stage === 'prospect_chaud') {
    return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
  }
  if (stage === 'prospect_tiede') {
    return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
  }
  if (stage === 'prospect_froid') {
    return 'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
  }
  return 'border-transparent bg-muted text-muted-foreground'
}

function syncBadgeClass(status: string) {
  if (status === 'synced') {
    return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
  }
  if (status === 'pending_sync') {
    return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
  }
  if (status === 'sync_failed') {
    return 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
  }
  return 'border-transparent bg-muted text-muted-foreground'
}

function ClickableInfoCard({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </button>
  )
}

function CompactMetaItem({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2 transition-colors group-hover:border-solid group-hover:bg-muted/20 group-focus-visible:border-solid',
        className,
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-medium text-foreground">{value}</p>
    </div>
  )
}

function AgentDetailSkeleton() {
  return (
    <section className="app-section">
      <div className="flex flex-col gap-2 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="rounded-xl border-0 bg-card p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="size-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-52 rounded-md" />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[74px] rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border-0 bg-card p-5">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border-0 bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-44 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg bg-background/40">
          <div className="h-11 bg-muted/30" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 border-t border-border/50 bg-card/70 first:border-t-0" />
          ))}
        </div>
      </div>
    </section>
  )
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthSession()
  const canSuspend = hasPermission('agent.suspend')
  const canReactivate = hasPermission('agent.reactivate')

  const [programsDialogOpen, setProgramsDialogOpen] = useState(false)
  const [profileDetailKey, setProfileDetailKey] = useState<string | null>(null)
  const [pendingLifecycleAction, setPendingLifecycleAction] = useState<{
    type: AgentLifecycleAction
    agent: AgentRecord
  } | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [syncFilter, setSyncFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<AgentProspectSortKey>('submitted')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const query = useQuery({
    queryKey: ['agents', 'detail', agentId],
    queryFn: () => fetchAgent(agentId ?? ''),
    enabled: Boolean(agentId),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ agentId, reason }: { agentId: string; reason: string }) =>
      suspendAgent(agentId, { reason }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agents'] }),
        queryClient.invalidateQueries({ queryKey: ['agents', 'detail', agentId] }),
      ])
      setPendingLifecycleAction(null)
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: ({ agentId }: { agentId: string }) => reactivateAgent(agentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agents'] }),
        queryClient.invalidateQueries({ queryKey: ['agents', 'detail', agentId] }),
      ])
      setPendingLifecycleAction(null)
    },
  })

  useEffect(() => {
    setPage(1)
  }, [search, stageFilter, syncFilter])

  const agent = query.data?.data
  const assignedPrograms = agent?.assigned_programs ?? []
  const visiblePrograms = assignedPrograms.slice(0, 2)
  const hasMorePrograms = assignedPrograms.length > visiblePrograms.length
  const prospects = agent?.prospects ?? []

  useAppBreadcrumbTrail(
    agent
      ? [
          { label: 'Agents', to: '/agents' },
          { label: agent.display_name ?? 'Affilié' },
        ]
      : null,
  )
  const actionsBusy = suspendMutation.isPending || reactivateMutation.isPending

  const filteredProspects = useMemo(() => {
    const q = search.trim().toLowerCase()

    return prospects.filter((prospect) => {
      if (stageFilter !== 'all' && prospect.pipeline_stage !== stageFilter) {
        return false
      }

      if (syncFilter !== 'all' && prospect.submission_status !== syncFilter) {
        return false
      }

      if (!q) return true

      return [
        prospect.contact_name,
        prospect.company_name ?? '',
        prospect.program_name ?? '',
      ].some((value) => value.toLowerCase().includes(q))
    })
  }, [prospects, search, stageFilter, syncFilter])

  const sortedProspects = useMemo(
    () => [...filteredProspects].sort((left, right) => sortProspects(left, right, sortKey, sortDirection)),
    [filteredProspects, sortDirection, sortKey],
  )

  const totalFiltered = sortedProspects.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedProspects.slice(start, start + pageSize)
  }, [pageSize, safePage, sortedProspects])

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  if (!agentId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Identifiant de l'agent manquant.
      </article>
    )
  }

  if (query.isPending) {
    return <AgentDetailSkeleton />
  }

  if (query.isError || !query.data) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(query.error as ApiError).message}
      </article>
    )
  }

  if (!agent) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Agent introuvable.
      </article>
    )
  }

  function handleSort(nextKey: AgentProspectSortKey) {
    setPage(1)
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection(nextKey === 'submitted' ? 'desc' : 'asc')
  }

  const statusLabel = agent.status.replace(/_/g, ' ')
  const title = agent.display_name ?? 'Affilié sans nom'
  const shortUserId = agent.user_id.slice(0, 8)
  const profileDetails = [
    {
      key: 'contact',
      label: 'Contact',
      value: agent.email ?? 'Aucun email',
      description: "Adresse email utilisée pour les notifications, invitations et échanges avec l'affilié.",
    },
    {
      key: 'code',
      label: 'Code affilié',
      value: agent.agent_code ?? 'Code non attribué',
      description: 'Code interne unique utilisé pour identifier rapidement cet affilié dans la plateforme.',
    },
    {
      key: 'id',
      label: 'Identifiant',
      value: shortUserId,
      description: "Identifiant court de l'utilisateur rattaché à cet affilié.",
    },
    {
      key: 'invited',
      label: 'Invité le',
      value: formatDate(agent.invited_at, true),
      description: "Date et heure de l'envoi de l'invitation initiale.",
    },
    {
      key: 'joined',
      label: 'Rejoint le',
      value: formatDate(agent.activated_at, true),
      description: "Date et heure de l'activation effective de l'affilié.",
    },
    {
      key: 'activity',
      label: 'Dernière activité',
      value: formatDate(agent.last_activity_at, true),
      description: 'Dernière activité enregistrée pour cet affilié dans la plateforme.',
    },
    {
      key: 'suspended',
      label: 'Suspendu le',
      value: formatDate(agent.suspended_at, true),
      description: "Date et heure de suspension, si l'affilié a déjà été suspendu.",
    },
    {
      key: 'created',
      label: 'Créé le',
      value: formatDate(agent.created_at, true),
      description: 'Date de création de la fiche affilié dans le système.',
    },
    ...(agent.notes
      ? [
          {
            key: 'notes',
            label: 'Notes',
            value: agent.notes,
            description: 'Notes internes liées à cet affilié.',
          },
        ]
      : []),
  ] as const
  const activeProfileDetail = profileDetails.find((item) => item.key === profileDetailKey) ?? null

  return (
    <section className="app-section">
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
        onConfirm={async (action, selectedAgent, payload) => {
          if (action === 'suspend') {
            await suspendMutation.mutateAsync({
              agentId: selectedAgent.id,
              reason: payload.reason ?? '',
            })
            return
          }

          await reactivateMutation.mutateAsync({ agentId: selectedAgent.id })
        }}
      />
      <Dialog open={profileDetailKey !== null} onOpenChange={(open) => !open && setProfileDetailKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{activeProfileDetail?.label ?? 'Détail'}</DialogTitle>
            <DialogDescription>
              {activeProfileDetail?.description ?? 'Détail du profil affilié.'}
            </DialogDescription>
          </DialogHeader>
          {activeProfileDetail ? (
            <CompactMetaItem
              label={activeProfileDetail.label}
              value={activeProfileDetail.value}
              className="border-border bg-background px-4 py-3"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <PageHeader
        beforeTitle={
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer rounded-lg"
          >
            <Link to="/agents" aria-label="Retour aux agents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
        title={title}
        titleAddon={<Badge className={agentStatusBadgeClass(agent.status)}>{statusLabel}</Badge>}
        right={
          <PageHeaderToolbar>
            {agent.actions?.can_suspend && canSuspend ? (
              <Button
                type="button"
                variant="destructive"
                className="cursor-pointer"
                disabled={actionsBusy}
                onClick={() => setPendingLifecycleAction({ type: 'suspend', agent })}
              >
                <UserX className="mr-2 h-4 w-4" />
                Suspendre
              </Button>
            ) : null}
            {agent.actions?.can_reactivate && canReactivate ? (
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={actionsBusy}
                onClick={() => setPendingLifecycleAction({ type: 'reactivate', agent })}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Réactiver
              </Button>
            ) : null}
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <DetailSectionCard title="Profil affilié" className="h-full border-0">
          <div className="space-y-3">
            <EntityCardIdentity
              leading={
                <Avatar className="size-12 rounded-xl">
                  <AvatarImage src={agent.avatar_url ?? undefined} alt={title} />
                  <AgentAvatarFallback
                    seed={avatarSeedForUser({ id: agent.user_id })}
                    className="text-sm font-semibold"
                  >
                    {initials(agent.display_name, agent.email)}
                  </AgentAvatarFallback>
                </Avatar>
              }
              title={title}
              description={agent.email ?? 'Aucun email renseigné'}
              badge={<Badge variant="secondary">{agent.agent_code ?? 'Code non attribué'}</Badge>}
              titleClassName="!text-sm text-foreground"
              descriptionClassName="text-xs leading-[1.15rem]"
            />

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {profileDetails.map((item) => (
                <ClickableInfoCard key={item.key} onClick={() => setProfileDetailKey(item.key)}>
                  <CompactMetaItem label={item.label} value={item.value} />
                </ClickableInfoCard>
              ))}
            </div>
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          title="Programmes assignés"
          description="Programmes actuellement rattachés à cet affilié."
          className="h-full border-0"
        >
          {assignedPrograms.length === 0 ? (
            <DetailEmptyState message="Aucun programme n'est encore assigné à cet affilié." />
          ) : (
            <div className="space-y-3">
              {visiblePrograms.map((assignment) => (
                <button
                  key={assignment.assignment_id}
                  type="button"
                  onClick={() => navigate(`/programs/${assignment.program.id}`)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-dashed border-border bg-background/40 px-4 py-3 text-left transition hover:border-border hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {assignment.program.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Assigné le {formatDate(assignment.assigned_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">
                      {(assignment.program.assigned_agents_count ?? 0).toLocaleString('fr-FR')} agents
                    </Badge>
                    <Badge className={programStatusBadgeClass(assignment.program.status)}>
                      {assignment.program.status}
                    </Badge>
                  </div>
                </button>
              ))}

              {hasMorePrograms ? (
                <button
                  type="button"
                  onClick={() => setProgramsDialogOpen(true)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-dashed border-border bg-background/40 px-4 py-3 text-left transition hover:border-border hover:bg-muted/20"
                >
                  <span className="text-sm font-semibold text-foreground">Voir tous les programmes</span>
                  <span className="text-sm text-muted-foreground">
                    +{assignedPrograms.length - visiblePrograms.length} autres
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </DetailSectionCard>
      </div>

      <DetailSectionCard
        title="Prospects de l'affilié"
        description="Tous les prospects créés par cet affilié, avec filtres et pagination."
        className="border-0"
        right={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un prospect..."
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="min-w-[150px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="suspect">Suspect</SelectItem>
                <SelectItem value="prospect_froid">Prospect froid</SelectItem>
                <SelectItem value="prospect_tiede">Prospect tiède</SelectItem>
                <SelectItem value="prospect_chaud">Prospect chaud</SelectItem>
              </SelectContent>
            </Select>
            <Select value={syncFilter} onValueChange={setSyncFilter}>
              <SelectTrigger className="min-w-[150px]">
                <SelectValue placeholder="Tous les syncs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les syncs</SelectItem>
                <SelectItem value="pending_sync">En attente</SelectItem>
                <SelectItem value="synced">Synchronisé</SelectItem>
                <SelectItem value="sync_failed">Échec sync</SelectItem>
                <SelectItem value="deleted">Supprimé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {totalFiltered === 0 ? (
          <DetailEmptyState message="Aucun prospect ne correspond aux filtres sélectionnés." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="prospect"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Prospect
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="program"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Programme
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="stage"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Statut
                    </SortableTableHead>
                    <TableHead>Sync</TableHead>
                    <SortableTableHead
                      sortKey="submitted"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Soumis le
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageSlice.map((prospect) => (
                    <TableRow key={prospect.id}>
                      <TableCell>
                        <Link
                          to={buildProspectDetailPath({
                            prospectId: prospect.id,
                            agentId,
                          })}
                          className="block cursor-pointer rounded-md px-1 py-0.5 text-left transition hover:bg-muted/40"
                        >
                          <p className="font-medium text-foreground">{prospect.contact_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {prospect.company_name ?? 'Sans société'}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {prospect.program_name ?? 'Sans programme'}
                      </TableCell>
                      <TableCell>
                        <Badge className={stageBadgeClass(prospect.pipeline_stage)}>
                          {stageLabel[prospect.pipeline_stage] ?? prospect.pipeline_stage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={syncBadgeClass(prospect.submission_status)}>
                          {submissionLabel[prospect.submission_status] ?? prospect.submission_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(prospect.submitted_at, true)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <TablePaginationBar
              page={safePage}
              pageSize={pageSize}
              totalItems={totalFiltered}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 25, 50]}
            />
          </div>
        )}
      </DetailSectionCard>

      <Dialog open={programsDialogOpen} onOpenChange={setProgramsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Programmes assignés</DialogTitle>
            <DialogDescription>
              Liste complète des programmes actuellement attribués à {title}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {assignedPrograms.map((assignment) => (
              <button
                key={assignment.assignment_id}
                type="button"
                onClick={() => {
                  setProgramsDialogOpen(false)
                  navigate(`/programs/${assignment.program.id}`)
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-dashed border-border bg-background/40 px-4 py-3 text-left transition hover:border-border hover:bg-muted/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {assignment.program.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Assigné le {formatDate(assignment.assigned_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">
                    {(assignment.program.assigned_agents_count ?? 0).toLocaleString('fr-FR')} agents
                  </Badge>
                  <Badge className={cn(programStatusBadgeClass(assignment.program.status), 'capitalize')}>
                    {assignment.program.status}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

