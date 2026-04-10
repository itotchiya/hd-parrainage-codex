import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, FileText, FolderKanban, Search, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import {
  activateProgram,
  archiveProgram,
  createProgram,
  deleteProgramFromArchive,
  fetchExchangePacks,
  fetchProgramAssignments,
  fetchPrograms,
  pauseProgram,
  reactivateProgram,
  suspendProgram,
  syncProgramAssignments,
  updateProgram,
} from '../api'
import { fetchAgents } from '../../agents/api'
import { createProspect } from '../../prospects/api'
import { AddProspectMethodDialog } from '../../prospects/components/AddProspectMethodDialog'
import { NewProspectDialog } from '../../prospects/components/NewProspectDialog'
import { ProgramFormDialog } from '../components/ProgramFormDialog'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { AgentAvatarFallback, Avatar, AvatarImage } from '@/components/ui/avatar'
import {
  ProgramAssignmentDialog,
  ProgramCashRulesDialog,
  ProgramLifecycleConfirmDialog,
  ProgramRewardPackDialog,
  type ProgramLifecycleAction,
} from '../components/ProgramActionDialogs'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { ProgramCard, ProgramCardSkeleton } from '../components/ProgramCard'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  AssignedAgent,
  ExchangePackRecord,
  ProgramExchangeMode,
  ProgramMutationPayload,
  ProgramRecord,
  ProgramStatus,
} from '../../../types/programs'
import type { AgentRecord } from '../../../types/agents'

const programQueryKey = ['programs', 'list']
const exchangePackQueryKey = ['exchange-packs', 'list']
const statusSortOrder: Record<ProgramStatus, number> = {
  active: 0,
  draft: 1,
  paused: 2,
  suspended: 3,
  archived: 4,
}

type ProgramExchangeModeFilter = 'all' | ProgramExchangeMode
type ProgramSortOption =
  | 'newest'
  | 'oldest'
  | 'status'
  | 'points-high'
  | 'points-low'
  | 'agents-high'
  | 'agents-low'

function isProgramExchangeModeFilter(value: string | null): value is ProgramExchangeModeFilter {
  return value === 'all' || value === 'cash' || value === 'reward' || value === 'both'
}

function isProgramSortOption(value: string | null): value is ProgramSortOption {
  return (
    value === 'newest' ||
    value === 'oldest' ||
    value === 'status' ||
    value === 'points-high' ||
    value === 'points-low' ||
    value === 'agents-high' ||
    value === 'agents-low'
  )
}

function programCreatedTime(program: ProgramRecord) {
  return new Date(program.created_at ?? program.updated_at ?? 0).getTime()
}

function programPointsValue(program: ProgramRecord) {
  return program.points_per_transaction ?? 0
}

function programAssignedAgentsValue(program: ProgramRecord) {
  return program.assigned_agents_count ?? program.assigned_agents?.length ?? 0
}

function programNameComparator(a: ProgramRecord, b: ProgramRecord) {
  return a.name.localeCompare(b.name)
}

function toProgramUpdatePayload(
  program: ProgramRecord,
  overrides: Partial<ProgramMutationPayload> = {},
): ProgramMutationPayload {
  return {
    name: program.name,
    description: program.description ?? '',
    commission_type: program.commission_type,
    exchange_mode: program.exchange_mode,
    points_per_transaction: program.points_per_transaction,
    points_per_euro: program.points_per_euro,
    exchange_pack_id: program.exchange_pack?.id ?? null,
    eligibility_criteria: program.eligibility_criteria ?? '',
    status: program.status,
    ...overrides,
  }
}

function formatAgentAddedAt(agent: AgentRecord) {
  const raw = agent.activated_at ?? agent.invited_at ?? agent.created_at
  if (!raw) return 'Inconnu'
  return new Date(raw).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function agentInitials(agent: AgentRecord): string {
  const n = agent.display_name?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  return (agent.email ?? '?').slice(0, 2).toUpperCase()
}

function ProgramsPageSkeleton() {
  return (
    <section className="app-section">
      <div className="flex flex-col gap-2 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Skeleton className="h-6 w-28" />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Skeleton className="h-8 w-full sm:w-[280px]" />
          <Skeleton className="h-8 w-full sm:w-[140px]" />
          <Skeleton className="h-8 w-full sm:w-[150px]" />
          <Skeleton className="h-8 w-full sm:w-[170px]" />
          <Skeleton className="h-8 w-full sm:w-[130px]" />
        </div>
      </div>

      <div className="app-grid md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProgramCardSkeleton key={index} />
        ))}
      </div>
    </section>
  )
}

export function ProgramsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, hasPermission } = useAuthSession()
  const search = searchParams.get('q') ?? ''
  const rawStatus = (searchParams.get('status') as 'all' | ProgramStatus | null) ?? 'all'
  const scopeFilter = searchParams.get('scope') === 'archived' ? 'archived' : 'programs'
  const businessFilterId = searchParams.get('businessId') ?? ''
  const rawModeFilter = searchParams.get('mode')
  const rawSort = searchParams.get('sort')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<ProgramRecord | null>(null)
  const [assignDialogProgram, setAssignDialogProgram] = useState<ProgramRecord | null>(null)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [hasEditedAssignmentSelection, setHasEditedAssignmentSelection] = useState(false)
  const [cashDialogProgram, setCashDialogProgram] = useState<ProgramRecord | null>(null)
  const [rewardsDialogProgram, setRewardsDialogProgram] = useState<ProgramRecord | null>(null)
  const [selectedPackId, setSelectedPackId] = useState<string>('')
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [pendingOwnerAction, setPendingOwnerAction] = useState<{
    type: ProgramLifecycleAction
    program: ProgramRecord
  } | null>(null)
  const [addProspectProgram, setAddProspectProgram] = useState<ProgramRecord | null>(null)
  const [prospectFormProgram, setProspectFormProgram] = useState<ProgramRecord | null>(null)
  const [createProspectError, setCreateProspectError] = useState<ApiError | null>(null)

  const programsQuery = useQuery({
    queryKey: programQueryKey,
    queryFn: fetchPrograms,
  })

  const packsQuery = useQuery({
    queryKey: exchangePackQueryKey,
    queryFn: () => fetchExchangePacks(),
    enabled: hasPermission('exchange-pack.view'),
  })

  const agentsQuery = useQuery({
    queryKey: ['agents', 'list'],
    queryFn: fetchAgents,
    enabled: hasPermission('agent.view'),
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

  const activateMutation = useMutation({
    mutationFn: activateProgram,
    onSuccess: async () => {
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

  const suspendMutation = useMutation({
    mutationFn: suspendProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const deleteArchivedMutation = useMutation({
    mutationFn: deleteProgramFromArchive,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const assignmentQuery = useQuery({
    queryKey: ['programs', 'assignments', assignDialogProgram?.id],
    queryFn: async () => {
      if (!assignDialogProgram) {
        return { data: [] as AssignedAgent[] }
      }
      return fetchProgramAssignments(assignDialogProgram.id)
    },
    enabled: Boolean(assignDialogProgram?.id),
  })

  const syncAssignmentsMutation = useMutation({
    mutationFn: ({ programId, agentIds }: { programId: string; agentIds: string[] }) =>
      syncProgramAssignments(programId, agentIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
      if (assignDialogProgram?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['programs', 'assignments', assignDialogProgram.id],
        })
      }
      setAssignDialogProgram(null)
    },
  })

  const updateRewardsPackMutation = useMutation({
    mutationFn: ({
      programId,
      payload,
    }: {
      programId: string
      payload: ProgramMutationPayload
    }) => updateProgram(programId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
      setRewardsDialogProgram(null)
    },
  })

  const createProspectMutation = useMutation({
    mutationFn: createProspect,
    onSuccess: async () => {
      setProspectFormProgram(null)
      setCreateProspectError(null)
      await queryClient.invalidateQueries({ queryKey: ['prospects', 'list'] })
    },
    onError: (err) => {
      setCreateProspectError(err as ApiError)
    },
  })

  const programs = useMemo(() => programsQuery.data?.data ?? [], [programsQuery.data])
  const packs = packsQuery.data?.data ?? []
  const rewardPacks = packs.filter((pack) => pack.status === 'active')
  const ownerCanCreate = hasPermission('program.create')
  const cardMode = user?.agent_profile !== null ? 'agent' : 'owner'
  const canSubmitProspect = hasPermission('prospect.submit')
  const mutationError = (createMutation.error ?? updateMutation.error) as ApiError | null
  const visiblePrograms = useMemo(
    () => (cardMode === 'agent' ? programs.filter((program) => program.status !== 'draft') : programs),
    [cardMode, programs],
  )
  const businessFilterOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const program of visiblePrograms) {
      if (!program.business_id) continue
      map.set(program.business_id, program.business_name ?? 'Business inconnu')
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [visiblePrograms])
  const showBusinessFilter = cardMode === 'agent' && businessFilterOptions.length > 1
  const effectiveBusinessFilterId = showBusinessFilter ? businessFilterId : ''
  const statusFilter: 'all' | ProgramStatus =
    cardMode === 'agent' && rawStatus === 'draft' ? 'all' : rawStatus
  const exchangeModeFilter: ProgramExchangeModeFilter = isProgramExchangeModeFilter(rawModeFilter)
    ? rawModeFilter
    : 'all'
  const ownerSortOptions: ProgramSortOption[] = [
    'newest',
    'oldest',
    'status',
    'points-high',
    'points-low',
    'agents-high',
    'agents-low',
  ]
  const agentSortOptions: ProgramSortOption[] = [
    'newest',
    'oldest',
    'status',
    'points-high',
    'points-low',
  ]
  const availableSortOptions = cardMode === 'owner' ? ownerSortOptions : agentSortOptions
  const sortOption: ProgramSortOption =
    isProgramSortOption(rawSort) && availableSortOptions.includes(rawSort) ? rawSort : 'newest'

  const filteredPrograms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return visiblePrograms
      .filter((program) => {
        const matchesScope =
          scopeFilter === 'archived' ? program.status === 'archived' : program.status !== 'archived'
        const matchesStatus =
          scopeFilter === 'archived' ? true : statusFilter === 'all' || program.status === statusFilter
        const matchesBusiness =
          effectiveBusinessFilterId.length === 0 || program.business_id === effectiveBusinessFilterId
        const matchesExchangeMode =
          exchangeModeFilter === 'all' || program.exchange_mode === exchangeModeFilter
        const matchesSearch =
          normalizedSearch.length === 0 ||
          program.name.toLowerCase().includes(normalizedSearch) ||
          (program.business_name ?? '').toLowerCase().includes(normalizedSearch) ||
          (program.description ?? '').toLowerCase().includes(normalizedSearch)

        return matchesScope && matchesStatus && matchesBusiness && matchesExchangeMode && matchesSearch
      })
      .sort((a, b) => {
        if (sortOption === 'oldest') {
          return programCreatedTime(a) - programCreatedTime(b) || programNameComparator(a, b)
        }
        if (sortOption === 'status') {
          return (
            statusSortOrder[a.status] - statusSortOrder[b.status] ||
            programCreatedTime(b) - programCreatedTime(a) ||
            programNameComparator(a, b)
          )
        }
        if (sortOption === 'points-high') {
          return (
            programPointsValue(b) - programPointsValue(a) ||
            programCreatedTime(b) - programCreatedTime(a) ||
            programNameComparator(a, b)
          )
        }
        if (sortOption === 'points-low') {
          return (
            programPointsValue(a) - programPointsValue(b) ||
            programCreatedTime(b) - programCreatedTime(a) ||
            programNameComparator(a, b)
          )
        }
        if (sortOption === 'agents-high') {
          return (
            programAssignedAgentsValue(b) - programAssignedAgentsValue(a) ||
            programCreatedTime(b) - programCreatedTime(a) ||
            programNameComparator(a, b)
          )
        }
        if (sortOption === 'agents-low') {
          return (
            programAssignedAgentsValue(a) - programAssignedAgentsValue(b) ||
            programCreatedTime(b) - programCreatedTime(a) ||
            programNameComparator(a, b)
          )
        }
        return programCreatedTime(b) - programCreatedTime(a) || programNameComparator(a, b)
      })
  }, [
    visiblePrograms,
    search,
    statusFilter,
    scopeFilter,
    effectiveBusinessFilterId,
    exchangeModeFilter,
    sortOption,
  ])

  const isOwnerActionPending =
    pauseMutation.isPending ||
    reactivateMutation.isPending ||
    suspendMutation.isPending ||
    archiveMutation.isPending ||
    deleteArchivedMutation.isPending
  const assignmentAgentIds = useMemo(
    () =>
      (assignmentQuery.data?.data ?? [])
        .map((assignment) => assignment.agent?.id)
        .filter((value): value is string => Boolean(value)),
    [assignmentQuery.data?.data],
  )
  const lockedAssignedAgentIds = useMemo(
    () =>
      new Set(
        (assignmentQuery.data?.data ?? [])
          .filter((assignment) => assignment.has_prospects_in_program)
          .map((assignment) => assignment.agent?.id)
          .filter((value): value is string => Boolean(value)),
      ),
    [assignmentQuery.data?.data],
  )

  if (programsQuery.isPending) {
    return <ProgramsPageSkeleton />
  }

  if (programsQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(programsQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Programmes"
        right={
          <PageHeaderToolbar>
          <Field className="w-full sm:min-w-[180px] sm:max-w-[360px] sm:flex-1">
            <FieldLabel htmlFor="programs-search" className="sr-only">
              Rechercher des programmes
            </FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="programs-search"
                value={search}
                onChange={(event) => {
                  const nextValue = event.target.value
                  const nextParams = new URLSearchParams(searchParams)
                  if (nextValue.trim().length > 0) {
                    nextParams.set('q', nextValue)
                  } else {
                    nextParams.delete('q')
                  }
                  setSearchParams(nextParams, { replace: true })
                }}
                placeholder="Rechercher un programme..."
                className="pl-9"
              />
            </div>
          </Field>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              const nextValue = value as 'all' | ProgramStatus
              const nextParams = new URLSearchParams(searchParams)
              if (nextValue === 'all') {
                nextParams.delete('status')
              } else {
                nextParams.set('status', nextValue)
              }
              setSearchParams(nextParams, { replace: true })
            }}
            disabled={scopeFilter === 'archived'}
          >
            <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[104px] sm:shrink-0">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Statut</SelectLabel>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                {cardMode === 'owner' ? <SelectItem value="draft">Brouillon</SelectItem> : null}
                <SelectItem value="paused">En pause</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {showBusinessFilter ? (
            <Select
              value={businessFilterId.length > 0 ? businessFilterId : 'all'}
              onValueChange={(value) => {
                const nextBusinessId = value === 'all' ? '' : value
                const nextParams = new URLSearchParams(searchParams)
                if (nextBusinessId.length > 0) {
                  nextParams.set('businessId', nextBusinessId)
                } else {
                  nextParams.delete('businessId')
                }
                setSearchParams(nextParams, { replace: true })
              }}
            >
              <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[104px] sm:shrink-0">
                <SelectValue placeholder="Business" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Business</SelectLabel>
                  <SelectItem value="all">Tous les business</SelectItem>
                  {businessFilterOptions.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}

          <Select
            value={exchangeModeFilter}
            onValueChange={(value) => {
              const nextValue = value as ProgramExchangeModeFilter
              const nextParams = new URLSearchParams(searchParams)
              if (nextValue === 'all') {
                nextParams.delete('mode')
              } else {
                nextParams.set('mode', nextValue)
              }
              setSearchParams(nextParams, { replace: true })
            }}
          >
            <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[104px] sm:shrink-0">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Mode d'échange</SelectLabel>
                <SelectItem value="all">Tous les modes</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="reward">Récompenses</SelectItem>
                <SelectItem value="both">Mixte</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={sortOption}
            onValueChange={(value) => {
              const nextValue = value as ProgramSortOption
              const nextParams = new URLSearchParams(searchParams)
              if (nextValue === 'newest') {
                nextParams.delete('sort')
              } else {
                nextParams.set('sort', nextValue)
              }
              setSearchParams(nextParams, { replace: true })
            }}
          >
            <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[108px] sm:shrink-0">
              <SelectValue placeholder="Récents" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Trier les programmes</SelectLabel>
                <SelectItem value="newest">Récents</SelectItem>
                <SelectItem value="oldest">Anciens</SelectItem>
                <SelectItem value="status">Statut</SelectItem>
                <SelectItem value="points-high">Points (Décroissant)</SelectItem>
                <SelectItem value="points-low">Points (Croissant)</SelectItem>
                {cardMode === 'owner' ? (
                  <>
                    <SelectItem value="agents-high">Nombre d'agents ↓</SelectItem>
                    <SelectItem value="agents-low">Nombre d'agents ↑</SelectItem>
                  </>
                ) : null}
              </SelectGroup>
            </SelectContent>
          </Select>

          {cardMode === 'owner' ? (
            <Button
              type="button"
              variant="secondary"
              className="gap-2 sm:shrink-0"
              onClick={() => navigate('/programs/docs')}
            >
              <FileText className="size-4" aria-hidden />
              Documentation
            </Button>
          ) : null}

          {ownerCanCreate ? (
            <Button
              type="button"
              size="default"
              onClick={() => {
                setEditingProgram(null)
                setDialogOpen(true)
              }}
              className="gap-2 sm:shrink-0"
            >
              <Plus className="size-4" aria-hidden />
              Créer un programme
            </Button>
          ) : null}
          <Tabs
            value={scopeFilter}
            onValueChange={(value) => {
              const nextScope = value === 'archived' ? 'archived' : 'programs'
              const nextParams = new URLSearchParams(searchParams)
              if (nextScope === 'archived') {
                nextParams.set('scope', 'archived')
              } else {
                nextParams.delete('scope')
              }
              setSearchParams(nextParams, { replace: true })
            }}
          >
            <TabsList>
              <TabsTrigger value="programs">
                <FolderKanban className="size-4" />
                Programmes
              </TabsTrigger>
              <TabsTrigger value="archived">
                <Archive className="size-4" />
                Archivés
              </TabsTrigger>
            </TabsList>
          </Tabs>
          </PageHeaderToolbar>
        }
      />

      {filteredPrograms.length === 0 ? (
        <article className="app-panel">
          <p className="app-eyebrow">Catalogue de programmes</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Aucun programme ne correspond au filtre actuel.
          </h2>
        </article>
      ) : (
        <div className="app-grid md:grid-cols-2 xl:grid-cols-3">
          {filteredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              mode={cardMode}
              canSubmitProspect={canSubmitProspect}
              onAddProspect={(p) => setAddProspectProgram(p)}
              togglePending={
                pauseMutation.isPending || reactivateMutation.isPending || suspendMutation.isPending
              }
              onEdit={(next) => {
                setEditingProgram(next)
                setDialogOpen(true)
              }}
              onTogglePause={(next) => {
                if (next.status === 'paused') {
                  setPendingOwnerAction({ type: 'reactivate', program: next })
                  return
                }
                setPendingOwnerAction({ type: 'pause', program: next })
              }}
              onEditCash={(next) => setCashDialogProgram(next)}
              onLiftSuspension={(next) => setPendingOwnerAction({ type: 'lift_suspension', program: next })}
              onActivateDraft={(next) => setPendingOwnerAction({ type: 'activate', program: next })}
              onSuspend={(next) => {
                setPendingOwnerAction({ type: 'suspend', program: next })
              }}
              onArchive={(next) => {
                setPendingOwnerAction({ type: 'archive', program: next })
              }}
              onDeleteArchived={(next) => {
                setPendingOwnerAction({ type: 'delete', program: next })
              }}
              onAssignAgents={(next) => setAssignDialogProgram(next)}
              onManageRewards={(next) => setRewardsDialogProgram(next)}
              businessPrograms={visiblePrograms.filter(
                (candidate) => candidate.business_id === program.business_id,
              )}
              onViewBusinessPrograms={(next) => {
                navigate(
                  `/programs?status=active&businessId=${encodeURIComponent(next.business_id)}`,
                )
              }}
              onEditRewardsPack={(next) => {
                if (next.exchange_pack?.id) {
                  navigate(`/exchange-packs?edit=${encodeURIComponent(next.exchange_pack.id)}`)
                  return
                }
                navigate('/exchange-packs')
              }}
            />
          ))}
        </div>
      )}

      <ProgramFormDialog
        open={dialogOpen}
        title={editingProgram ? 'Modifier le programme' : 'Créer un programme'}
        submitLabel={editingProgram ? 'Enregistrer' : 'Créer'}
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

      <ProgramAssignmentDialog
        open={Boolean(assignDialogProgram)}
        program={assignDialogProgram}
        agents={agentsQuery.data?.data ?? []}
        assignments={assignmentQuery.data?.data ?? []}
        isSubmitting={syncAssignmentsMutation.isPending}
        error={(syncAssignmentsMutation.error as ApiError | null) ?? null}
        onClose={() => {
          setAssignDialogProgram(null)
          syncAssignmentsMutation.reset()
        }}
        onSubmit={async (agentIds) => {
          if (!assignDialogProgram) return
          await syncAssignmentsMutation.mutateAsync({
            programId: assignDialogProgram.id,
            agentIds,
          })
        }}
      />

      <ProgramCashRulesDialog
        open={Boolean(cashDialogProgram)}
        program={cashDialogProgram}
        isSubmitting={updateMutation.isPending}
        error={(updateMutation.error as ApiError | null) ?? null}
        onClose={() => {
          setCashDialogProgram(null)
          updateMutation.reset()
        }}
        onSubmit={async (pointsPerEuro) => {
          if (!cashDialogProgram) return
          await updateMutation.mutateAsync({
            programId: cashDialogProgram.id,
            payload: toProgramUpdatePayload(cashDialogProgram, { points_per_euro: pointsPerEuro }),
          })
          setCashDialogProgram(null)
        }}
      />

      <ProgramRewardPackDialog
        open={Boolean(rewardsDialogProgram)}
        program={rewardsDialogProgram}
        packs={rewardPacks}
        isSubmitting={updateRewardsPackMutation.isPending}
        error={(updateRewardsPackMutation.error as ApiError | null) ?? null}
        onClose={() => {
          setRewardsDialogProgram(null)
          updateRewardsPackMutation.reset()
        }}
        onSubmit={async (exchangePackId) => {
          if (!rewardsDialogProgram) return
          await updateRewardsPackMutation.mutateAsync({
            programId: rewardsDialogProgram.id,
            payload: toProgramUpdatePayload(rewardsDialogProgram, { exchange_pack_id: exchangePackId }),
          })
        }}
      />

      <ProgramLifecycleConfirmDialog
        action={pendingOwnerAction}
        isSubmitting={isOwnerActionPending}
        onClose={() => setPendingOwnerAction(null)}
        onConfirm={async (type, program) => {
          if (type === 'activate') {
            await activateMutation.mutateAsync(program.id)
          } else if (type === 'pause') {
            await pauseMutation.mutateAsync(program.id)
          } else if (type === 'reactivate' || type === 'lift_suspension') {
            await reactivateMutation.mutateAsync(program.id)
          } else if (type === 'suspend') {
            await suspendMutation.mutateAsync(program.id)
          } else if (type === 'archive') {
            await archiveMutation.mutateAsync(program.id)
          } else if (type === 'delete') {
            await deleteArchivedMutation.mutateAsync(program.id)
          }
          setPendingOwnerAction(null)
        }}
      />

      <Dialog
        open={false}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDialogProgram(null)
            setSelectedAgentIds([])
            setHasEditedAssignmentSelection(false)
            syncAssignmentsMutation.reset()
          }
        }}
      >
        <DialogContent className="max-h-[88vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assigner des agents{assignDialogProgram ? ` à ${assignDialogProgram.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les agents du business à rattacher à ce programme.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            <TooltipProvider>
              {(agentsQuery.data?.data ?? []).map((agent: AgentRecord) => {
                const effectiveSelectedAgentIds = hasEditedAssignmentSelection
                  ? selectedAgentIds
                  : assignmentAgentIds
                const isAssigned = effectiveSelectedAgentIds.includes(agent.id)
                const isLockedAssigned = isAssigned && lockedAssignedAgentIds.has(agent.id)
                const toggleAssignment = () => {
                  if (isLockedAssigned) return
                  setHasEditedAssignmentSelection(true)
                  setSelectedAgentIds((current) => {
                    const base = hasEditedAssignmentSelection ? current : assignmentAgentIds
                    if (base.includes(agent.id)) {
                      return base.filter((id) => id !== agent.id)
                    }
                    return [...base, agent.id]
                  })
                }

                const checkbox = (
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={isAssigned}
                    disabled={isLockedAssigned}
                    onChange={(event) => {
                      const checked = event.target.checked
                      if (isLockedAssigned) return
                      setHasEditedAssignmentSelection(true)
                      setSelectedAgentIds((current) => {
                        const base = hasEditedAssignmentSelection ? current : assignmentAgentIds
                        if (checked) {
                          if (base.includes(agent.id)) return base
                          return [...base, agent.id]
                        }
                        return base.filter((id) => id !== agent.id)
                      })
                    }}
                  />
                )

                return (
                  <button
                    key={agent.id}
                    type="button"
                    className="block w-full text-left"
                    onClick={toggleAssignment}
                    disabled={isLockedAssigned}
                  >
                    <Item variant="outline" className={isLockedAssigned ? 'opacity-85' : undefined}>
                      <ItemMedia>
                        <Avatar className="size-10">
                          <AvatarImage src={agent.avatar_url ?? undefined} alt={agent.display_name ?? agent.email ?? 'Agent'} />
                          <AgentAvatarFallback seed={agent.id}>
                            {agentInitials(agent)}
                          </AgentAvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{agent.display_name ?? agent.email ?? 'Agent'}</ItemTitle>
                        <ItemDescription>
                          {agent.email ?? 'Email non disponible'} • Ajouté le {formatAgentAddedAt(agent)}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        {isLockedAssigned ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="inline-flex cursor-not-allowed opacity-70"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {checkbox}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cet agent a déjà ajouté des prospects dans ce programme et ne peut pas être retiré.</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span onClick={(event) => event.stopPropagation()}>{checkbox}</span>
                        )}
                      </ItemActions>
                    </Item>
                  </button>
                )
              })}
            </TooltipProvider>
          </div>

          {syncAssignmentsMutation.isError ? (
            <p className="text-sm text-destructive">
              {(syncAssignmentsMutation.error as ApiError).message}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={syncAssignmentsMutation.isPending || !assignDialogProgram}
              onClick={() => {
                if (!assignDialogProgram) return
                const assignmentAgentIds = (assignmentQuery.data?.data ?? [])
                  .map((assignment) => assignment.agent?.id)
                  .filter((value): value is string => Boolean(value))
                const nextAgentIds = hasEditedAssignmentSelection ? selectedAgentIds : assignmentAgentIds
                syncAssignmentsMutation.mutate({
                  programId: assignDialogProgram.id,
                  agentIds: nextAgentIds,
                })
              }}
            >
              {syncAssignmentsMutation.isPending ? 'Enregistrement...' : 'Enregistrer les assignations'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={false}
        onOpenChange={(open) => {
          if (!open) {
            setRewardsDialogProgram(null)
            setSelectedPackId('')
          }
        }}
      >
        <DialogContent className="max-h-[88vh] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Assigner un pack rewards{rewardsDialogProgram ? ` à ${rewardsDialogProgram.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un pack rewards existant du business pour ce programme.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            {rewardPacks.map((pack: ExchangePackRecord) => {
              const checked = selectedPackId === pack.id
              return (
                <label key={pack.id} className="block cursor-pointer">
                  <Item variant="outline">
                    <ItemMedia>
                      <input
                        type="radio"
                        name="program-reward-pack"
                        className="size-4 accent-primary"
                        checked={checked}
                        onChange={() => setSelectedPackId(pack.id)}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{pack.name}</ItemTitle>
                      <ItemDescription>
                        {pack.items.length} cadeau{pack.items.length === 1 ? '' : 'x'}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                </label>
              )
            })}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!rewardsDialogProgram || !selectedPackId || updateRewardsPackMutation.isPending}
              onClick={() => {
                if (!rewardsDialogProgram || !selectedPackId) return
                updateRewardsPackMutation.mutate({
                  programId: rewardsDialogProgram.id,
                  payload: toProgramUpdatePayload(rewardsDialogProgram, { exchange_pack_id: selectedPackId }),
                })
              }}
            >
              {updateRewardsPackMutation.isPending ? 'Enregistrement...' : 'Assigner le pack'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={false}
        onOpenChange={(open) => {
          if (!open && !isOwnerActionPending) {
            setPendingOwnerAction(null)
            setDeleteConfirmName('')
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {pendingOwnerAction?.type === 'pause'
                ? 'Mettre le programme en pause ?'
                : pendingOwnerAction?.type === 'reactivate'
                  ? 'Réactiver le programme ?'
                  : pendingOwnerAction?.type === 'suspend'
                    ? 'Suspendre le programme ?'
                    : pendingOwnerAction?.type === 'archive'
                      ? 'Archiver le programme ?'
                      : 'Supprimer définitivement le programme ?'}
            </DialogTitle>
            <DialogDescription>
              {pendingOwnerAction?.type === 'pause'
                ? 'Les agents ne pourront plus ajouter de nouveaux prospects tant que le programme est en pause.'
                : pendingOwnerAction?.type === 'reactivate'
                  ? "Le programme redeviendra actif, et les agents retrouveront l'accès à la soumission de prospects."
                  : pendingOwnerAction?.type === 'suspend'
                    ? "Les avantages agents liés à ce programme seront bloqués (soumission prospects, progression opérationnelle, parcours actif). Utilisez cette action pour lancer un mode d'arrêt contrôlé."
                    : pendingOwnerAction?.type === 'archive'
                      ? 'Le programme sera déplacé en archive et retiré des opérations courantes.'
                      : 'Cette action est irréversible. Pour confirmer, saisissez exactement le nom complet du programme.'}
            </DialogDescription>
          </DialogHeader>

          {pendingOwnerAction?.type === 'delete' ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Nom attendu: <strong>{pendingOwnerAction.program.name}</strong>
              </p>
              <Input
                value={deleteConfirmName}
                onChange={(event) => setDeleteConfirmName(event.target.value)}
                placeholder="Saisissez le nom complet du programme"
              />
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isOwnerActionPending}>
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant={pendingOwnerAction?.type === 'delete' ? 'destructive' : 'default'}
              disabled={
                isOwnerActionPending ||
                !pendingOwnerAction ||
                (pendingOwnerAction.type === 'delete' &&
                  deleteConfirmName.trim() !== pendingOwnerAction.program.name)
              }
              onClick={async () => {
                if (!pendingOwnerAction) return
                try {
                  if (pendingOwnerAction.type === 'pause') {
                    await pauseMutation.mutateAsync(pendingOwnerAction.program.id)
                  } else if (pendingOwnerAction.type === 'reactivate') {
                    await reactivateMutation.mutateAsync(pendingOwnerAction.program.id)
                  } else if (pendingOwnerAction.type === 'suspend') {
                    await suspendMutation.mutateAsync(pendingOwnerAction.program.id)
                  } else if (pendingOwnerAction.type === 'archive') {
                    await archiveMutation.mutateAsync(pendingOwnerAction.program.id)
                  } else if (pendingOwnerAction.type === 'delete') {
                    await deleteArchivedMutation.mutateAsync(pendingOwnerAction.program.id)
                  }
                  setPendingOwnerAction(null)
                  setDeleteConfirmName('')
                } catch {
                  // Mutation errors are handled by react-query state.
                }
              }}
            >
              {isOwnerActionPending
                ? 'Traitement...'
                : pendingOwnerAction?.type === 'pause'
                  ? 'Confirmer la pause'
                  : pendingOwnerAction?.type === 'reactivate'
                    ? 'Confirmer la réactivation'
                    : pendingOwnerAction?.type === 'suspend'
                      ? 'Confirmer la suspension'
                      : pendingOwnerAction?.type === 'archive'
                        ? "Confirmer l'archivage"
                        : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddProspectMethodDialog
        open={Boolean(addProspectProgram)}
        programId={addProspectProgram?.id ?? ''}
        agentCode={user?.agent_profile?.agent_code ?? ''}
        onClose={() => setAddProspectProgram(null)}
        onSelectForm={() => {
          const prog = addProspectProgram
          setAddProspectProgram(null)
          setProspectFormProgram(prog)
        }}
      />

      <NewProspectDialog
        open={Boolean(prospectFormProgram)}
        programs={prospectFormProgram ? [prospectFormProgram] : []}
        defaultProgramId={prospectFormProgram?.id ?? null}
        isSubmitting={createProspectMutation.isPending}
        error={createProspectError}
        onClose={() => {
          setProspectFormProgram(null)
          setCreateProspectError(null)
          createProspectMutation.reset()
        }}
        onSubmit={async (payload) => {
          await createProspectMutation.mutateAsync(payload)
        }}
      />
    </section>
  )
}
