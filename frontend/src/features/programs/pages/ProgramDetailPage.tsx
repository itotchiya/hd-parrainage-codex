import { type ReactNode, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  Briefcase,
  BriefcaseBusiness,
  Gift,
  HandCoins,
  MoreVertical,
  OctagonAlert,
  Package,
  Pause,
  Pencil,
  Play,
  Search,
  ScanSearch,
  Trash2,
  Undo2,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'

import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchAgents } from '../../agents/api'
import { fetchProspects, createProspect } from '../../prospects/api'
import { NewProspectDialog } from '../../prospects/components/NewProspectDialog'
import { AddProspectMethodDialog } from '../../prospects/components/AddProspectMethodDialog'
import { buildProspectDetailPath } from '../../prospects/paths'
import { KpiCard, KpiCardSkeleton, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { DashboardSectionHeader } from '../../dashboard/components/DashboardSectionHeader'
import { formatDashboardDateFr, programStatusBadgeClass } from '../../dashboard/utils/semanticBadges'
import {
  activateProgram,
  archiveProgram,
  deleteProgramFromArchive,
  fetchExchangePacks,
  fetchProgram,
  fetchProgramAssignments,
  pauseProgram,
  reactivateProgram,
  suspendProgram,
  syncProgramAssignments,
  updateProgram,
} from '../api'
import { ProgramFormDialog } from '../components/ProgramFormDialog'
import {
  ProgramAssignmentDialog,
  ProgramCashRulesDialog,
  ProgramLifecycleConfirmDialog,
  ProgramRewardPackDialog,
  type ProgramLifecycleAction,
} from '../components/ProgramActionDialogs'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { useAppBreadcrumbTrail } from '@/layouts/AppShell'
import { AgentAvatarFallback, Avatar, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { avatarSeedForUser } from '@/lib/avatar-fallback'
import { cn } from '@/lib/utils'
import type { AgentRecord } from '@/types/agents'
import type { AssignedAgent, ProgramMutationPayload, ProgramRecord, ProgramStatus } from '@/types/programs'
import type { ProspectPipelineStage, ProspectRecord, ProspectSubmissionStatus } from '@/types/prospects'

const programStatusLabel: Record<ProgramStatus, string> = {
  active: 'Actif',
  draft: 'Brouillon',
  paused: 'En pause',
  suspended: 'Suspendu',
  archived: 'Archivé',
}

const pipelineStageLabels: Record<ProspectPipelineStage, string> = {
  suspect: 'Suspect',
  prospect_froid: 'Prospect froid',
  prospect_tiede: 'Prospect tiède',
  prospect_chaud: 'Prospect chaud',
}

const submissionLabels: Record<ProspectSubmissionStatus, string> = {
  pending_sync: 'Sync en attente',
  synced: 'Synchronisé',
  sync_failed: 'Échec de sync',
  deleted: 'Supprimé',
}

function prospectStageBadgeClass(stage: ProspectPipelineStage) {
  if (stage === 'prospect_chaud') return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
  if (stage === 'prospect_tiede') return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
  if (stage === 'prospect_froid') return 'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
  return 'border-transparent bg-muted text-muted-foreground'
}

function prospectPipelinePresentation(prospect: ProspectRecord) {
  if (prospect.conversion_status === 'converted') {
    return {
      label: 'Converti',
      className: 'border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
    }
  }

  return {
    label: pipelineStageLabels[prospect.pipeline_stage],
    className: prospectStageBadgeClass(prospect.pipeline_stage),
  }
}

function submissionBadgeClass(status: ProspectSubmissionStatus) {
  if (status === 'synced') return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
  if (status === 'pending_sync') return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
  if (status === 'sync_failed') return 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
  return 'border-transparent bg-muted text-muted-foreground'
}

function exchangeModeLabel(program: ProgramRecord) {
  if (program.exchange_mode === 'both') return 'Récompenses + Cash'
  if (program.exchange_mode === 'reward') return 'Récompenses uniquement'
  return 'Cash uniquement'
}

function exchangeModeConfig(program: ProgramRecord) {
  if (program.exchange_mode === 'both') {
    return {
      icon: Briefcase,
      label: 'Récompenses + Cash',
      description: 'Les agents peuvent échanger via les packs récompenses et la conversion cash.',
      tileClass: 'bg-blue-500 text-white',
      badgeClass: 'border-blue-500/25 bg-blue-500/10 text-blue-800 dark:text-blue-300',
      panelClass: 'border-blue-500/20 bg-blue-500/5',
    }
  }

  if (program.exchange_mode === 'reward') {
    return {
      icon: Gift,
      label: 'Récompenses uniquement',
      description: 'Les agents échangent leurs points via le pack récompenses lié.',
      tileClass: 'bg-amber-500 text-white',
      badgeClass: 'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-300',
      panelClass: 'border-amber-500/20 bg-amber-500/5',
    }
  }

  return {
    icon: HandCoins,
    label: 'Cash uniquement',
    description: 'Les agents échangent leurs points via la conversion cash configurée.',
    tileClass: 'bg-emerald-500 text-white',
    badgeClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
    panelClass: 'border-emerald-500/20 bg-emerald-500/5',
  }
}

function commissionLabel(program: ProgramRecord) {
  return program.commission_type === 'per-transaction' ? 'Par transaction' : 'Paliers CA'
}

function pointsRuleLabel(program: ProgramRecord) {
  return program.points_per_transaction === null
    ? 'Configuré par paliers CA'
    : `${program.points_per_transaction.toLocaleString('fr-FR')} pts / transaction`
}

function cashRuleLabel(program: ProgramRecord) {
  return program.points_per_euro === null
    ? 'Pas de conversion cash'
    : `${program.points_per_euro.toLocaleString('fr-FR')} pts = 1 €`
}

function toProgramPayload(
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

function agentInitials(displayName: string | null | undefined, email: string | null | undefined) {
  const name = displayName?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length > 1) return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return (email ?? '?').slice(0, 2).toUpperCase()
}

function agentRecordInitials(agent: AgentRecord): string {
  return agentInitials(agent.display_name, agent.email)
}

function formatAgentAddedAt(agent: AgentRecord) {
  const raw = agent.activated_at ?? agent.invited_at ?? agent.created_at
  if (!raw) return 'Date inconnue'
  return new Date(raw).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function sortBySubmittedAt(left: ProspectRecord, right: ProspectRecord) {
  return new Date(right.submitted_at ?? 0).getTime() - new Date(left.submitted_at ?? 0).getTime()
}

function ProgramDetailSkeleton() {
  return (
    <section className="app-section">
      <div className="flex flex-col gap-2 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-lg" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>

      <div className="grid w-full grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>

      <Skeleton className="h-72 rounded-lg" />
      <Skeleton className="h-80 rounded-lg" />
    </section>
  )
}

export function ProgramDetailPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { programId } = useParams<{ programId: string }>()
  const { hasPermission, user } = useAuthSession()
  const [editOpen, setEditOpen] = useState(false)
  const [cashEditOpen, setCashEditOpen] = useState(false)
  const [rewardsEditOpen, setRewardsEditOpen] = useState(false)
  const [addProspectMethodOpen, setAddProspectMethodOpen] = useState(false)
  const [createProspectOpen, setCreateProspectOpen] = useState(false)
  const [assignDialogProgram, setAssignDialogProgram] = useState<ProgramRecord | null>(null)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [hasEditedAssignmentSelection, setHasEditedAssignmentSelection] = useState(false)
  const [agentTableSearch, setAgentTableSearch] = useState('')
  const [agentTablePage, setAgentTablePage] = useState(1)
  const [agentTablePageSize, setAgentTablePageSize] = useState(10)
  const [prospectTableSearch, setProspectTableSearch] = useState('')
  const [prospectTablePage, setProspectTablePage] = useState(1)
  const [prospectTablePageSize, setProspectTablePageSize] = useState(10)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [pendingOwnerAction, setPendingOwnerAction] = useState<{
    type: ProgramLifecycleAction
    program: ProgramRecord
  } | null>(null)
  const canViewProspects = hasPermission('prospect.view')
  const cardMode = user?.agent_profile !== null ? 'agent' : 'owner'

  const programQuery = useQuery({
    queryKey: ['programs', 'detail', programId],
    queryFn: async () => fetchProgram(programId ?? ''),
    enabled: Boolean(programId),
  })

  const prospectsQuery = useQuery({
    queryKey: ['prospects', 'list', 'program-detail', programId],
    queryFn: fetchProspects,
    enabled: Boolean(programId) && canViewProspects,
  })

  const packsQuery = useQuery({
    queryKey: ['exchange-packs', 'list', 'program-detail'],
    queryFn: () => fetchExchangePacks(),
    enabled: (editOpen || rewardsEditOpen) && hasPermission('exchange-pack.view'),
  })

  const agentsQuery = useQuery({
    queryKey: ['agents', 'list'],
    queryFn: fetchAgents,
    enabled: Boolean(assignDialogProgram) && hasPermission('agent.view'),
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

  const updateMutation = useMutation({
    mutationFn: ({ payload }: { payload: ProgramMutationPayload }) => {
      if (!programId) throw new Error('Program identifier is missing.')
      return updateProgram(programId, payload)
    },
    onSuccess: async () => {
      setEditOpen(false)
      setCashEditOpen(false)
      setRewardsEditOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['programs'] })
    },
  })

  const activateMutation = useMutation({
    mutationFn: activateProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] })
      await queryClient.invalidateQueries({ queryKey: ['programs', 'detail', programId] })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: pauseProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] })
      await queryClient.invalidateQueries({ queryKey: ['programs', 'detail', programId] })
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: reactivateProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] })
      await queryClient.invalidateQueries({ queryKey: ['programs', 'detail', programId] })
    },
  })

  const suspendMutation = useMutation({
    mutationFn: suspendProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] })
      await queryClient.invalidateQueries({ queryKey: ['programs', 'detail', programId] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] })
      await queryClient.invalidateQueries({ queryKey: ['programs', 'detail', programId] })
    },
  })

  const deleteArchivedMutation = useMutation({
    mutationFn: deleteProgramFromArchive,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] })
      navigate('/programs?scope=archived')
    },
  })

  const syncAssignmentsMutation = useMutation({
    mutationFn: ({ nextProgramId, agentIds }: { nextProgramId: string; agentIds: string[] }) =>
      syncProgramAssignments(nextProgramId, agentIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] })
      await queryClient.invalidateQueries({ queryKey: ['programs', 'detail', programId] })
      if (assignDialogProgram?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['programs', 'assignments', assignDialogProgram.id],
        })
      }
      setAssignDialogProgram(null)
      setSelectedAgentIds([])
      setHasEditedAssignmentSelection(false)
    },
  })

  const createProspectMutation = useMutation({
    mutationFn: createProspect,
    onSuccess: async () => {
      setCreateProspectOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['prospects'] })
    },
  })

  useAppBreadcrumbTrail(
    programQuery.data?.data
      ? [
          { label: 'Programs', to: '/programs' },
          { label: programQuery.data.data.name },
        ]
      : null,
  )

  if (!programId) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Program identifier is missing from the current route.
      </article>
    )
  }

  if (programQuery.isPending) {
    return <ProgramDetailSkeleton />
  }

  if (programQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(programQuery.error as ApiError).message}
      </article>
    )
  }

  const program = programQuery.data.data
  const assignedAgents = (program.assigned_agents ?? [])
    .filter((assignment) => assignment.agent !== null)
  const programProspects = (prospectsQuery.data?.data ?? [])
    .filter((prospect) => prospect.program_id === program.id)
    .sort(sortBySubmittedAt)
  const agentSearch = agentTableSearch.trim().toLowerCase()
  const filteredAssignedAgents = assignedAgents.filter((assignment) => {
    if (agentSearch.length === 0) return true
    const agent = assignment.agent
    return (
      (agent?.display_name ?? '').toLowerCase().includes(agentSearch) ||
      (agent?.email ?? '').toLowerCase().includes(agentSearch) ||
      (agent?.agent_code ?? '').toLowerCase().includes(agentSearch) ||
      assignment.status.toLowerCase().includes(agentSearch)
    )
  })
  const agentTotalPages = Math.max(1, Math.ceil(filteredAssignedAgents.length / agentTablePageSize))
  const agentPageSafe = Math.min(agentTablePage, agentTotalPages)
  const pagedAssignedAgents = filteredAssignedAgents.slice(
    (agentPageSafe - 1) * agentTablePageSize,
    (agentPageSafe - 1) * agentTablePageSize + agentTablePageSize,
  )
  const prospectSearch = prospectTableSearch.trim().toLowerCase()
  const filteredProgramProspects = programProspects.filter((prospect) => {
    if (prospectSearch.length === 0) return true
    return (
      prospect.contact_name.toLowerCase().includes(prospectSearch) ||
      (prospect.company_name ?? '').toLowerCase().includes(prospectSearch) ||
      (prospect.contact_email ?? '').toLowerCase().includes(prospectSearch) ||
      (prospect.agent_name ?? '').toLowerCase().includes(prospectSearch) ||
      prospect.pipeline_stage.toLowerCase().includes(prospectSearch) ||
      prospect.submission_status.toLowerCase().includes(prospectSearch)
    )
  })
  const prospectTotalPages = Math.max(1, Math.ceil(filteredProgramProspects.length / prospectTablePageSize))
  const prospectPageSafe = Math.min(prospectTablePage, prospectTotalPages)
  const pagedProgramProspects = filteredProgramProspects.slice(
    (prospectPageSafe - 1) * prospectTablePageSize,
    (prospectPageSafe - 1) * prospectTablePageSize + prospectTablePageSize,
  )
  const activeProspects = programProspects.filter((prospect) => prospect.deleted_at === null)
  const convertedProspects = activeProspects.filter((prospect) => prospect.conversion_status === 'converted')
  const exchangeConfig = exchangeModeConfig(program)
  const rewardPacks = (packsQuery.data?.data ?? []).filter((pack) => pack.status === 'active')
  const canEditProgram = Boolean(program.actions.can_edit_general ?? program.actions.can_update) && hasPermission('program.update')
  const canSubmitProspect = cardMode === 'agent' && hasPermission('prospect.submit') && program.status === 'active'
  const createProspectError = createProspectMutation.error as ApiError | null
  const updateProgramError = updateMutation.error as ApiError | null
  const isPaused = program.status === 'paused'
  const isSuspended = program.status === 'suspended'
  const isDraft = program.status === 'draft'
  const isRevenueTier = program.commission_type === 'revenue-tier'
  const hasCash = program.exchange_mode === 'cash' || program.exchange_mode === 'both'
  const hasRewards = program.exchange_mode === 'reward' || program.exchange_mode === 'both'
  const assignedTotal = program.assigned_agents_count ?? assignedAgents.length
  const isOwnerActionPending =
    pauseMutation.isPending ||
    reactivateMutation.isPending ||
    suspendMutation.isPending ||
    archiveMutation.isPending ||
    deleteArchivedMutation.isPending
  const canEditCashShortcut = Boolean(hasCash && program.actions.can_edit_cash && canEditProgram)
  const canEditRewardsShortcut = Boolean(hasRewards && program.actions.can_edit_rewards && canEditProgram)
  const canActivateProgram = Boolean(program.actions.can_activate && program.actions.can_update)
  const canTogglePauseAction = Boolean((program.actions.can_pause || program.actions.can_reactivate) && !isOwnerActionPending)
  const pauseDisabled = !canTogglePauseAction || (isPaused && isRevenueTier)
  const canSuspendAction = Boolean(program.actions.can_suspend && !isOwnerActionPending)
  const canLiftSuspensionAction = Boolean(program.actions.can_lift_suspension && !isOwnerActionPending)
  const canArchiveAction = Boolean(program.actions.can_archive && !isOwnerActionPending)
  const canAssignAction = Boolean(
    program.actions.can_assign_agent &&
      hasPermission('program.assign-agent') &&
      !isSuspended &&
      program.status !== 'archived',
  )
  const canDeleteAction = Boolean(
    (program.actions.can_soft_delete ?? program.actions.can_delete_from_archive) && !isOwnerActionPending,
  )
  const canCreateProspect = Boolean(canSubmitProspect && program.status === 'active')
  const assignmentAgentIds = (assignmentQuery.data?.data ?? [])
    .map((assignment) => assignment.agent?.id)
    .filter((value): value is string => Boolean(value))
  const lockedAssignedAgentIds = new Set(
    (assignmentQuery.data?.data ?? [])
      .filter((assignment) => assignment.has_prospects_in_program)
      .map((assignment) => assignment.agent?.id)
      .filter((value): value is string => Boolean(value)),
  )

  const editDisabledReason = canEditProgram
    ? null
    : program.status === 'archived'
      ? "Les programmes archivés ne peuvent pas être modifiés."
      : assignedTotal > 0
        ? "Des agents sont déjà assignés. Retirez les assignations actives avant de modifier les règles générales."
        : "Permission program.update manquante ou des prospects existent déjà pour ce programme."
  const editCashDisabledReason = canEditCashShortcut
    ? null
    : !hasCash
      ? "Le mode cash n'est pas activé pour ce programme."
      : program.status === 'archived'
        ? "Les programmes archivés ne peuvent pas modifier les règles cash."
        : assignedTotal > 0
          ? "Des agents sont déjà assignés. Retirez les assignations actives avant de modifier les règles cash."
          : "Permission program.update manquante."
  const editRewardsDisabledReason = canEditRewardsShortcut
    ? null
    : !hasRewards
      ? "Le mode récompenses n'est pas activé pour ce programme."
      : program.status === 'archived'
        ? "Les programmes archivés ne peuvent pas modifier les packs récompenses."
        : "Permission program.update manquante."
  const activateDisabledReason = canActivateProgram
    ? null
    : program.status !== 'draft'
      ? "Seuls les programmes en brouillon peuvent être activés."
      : "Finalisez la configuration du programme et assurez-vous d'avoir la permission program.update."
  const liftSuspensionDisabledReason = canLiftSuspensionAction
    ? null
    : program.status !== 'suspended'
      ? "La levée de suspension n'est disponible que pour les programmes suspendus."
      : "Permission program.pause manquante."
  const pauseDisabledReason = pauseDisabled
    ? isOwnerActionPending
      ? "Une action est déjà en cours sur ce programme."
      : isPaused && isRevenueTier
        ? "Les programmes à paliers CA ne peuvent pas être réactivés tant que la logique de paliers n'est pas finalisée."
        : isPaused
          ? "Permission program.pause manquante pour la réactivation."
          : "La mise en pause nécessite un programme actif et la permission program.pause."
    : null
  const suspendDisabledReason = canSuspendAction
    ? null
    : program.status !== 'active' && program.status !== 'paused'
      ? "La suspension n'est disponible que pour les programmes actifs ou en pause."
      : program.has_open_prospects
        ? "Clôturez les prospects ouverts avant de suspendre ce programme."
        : "Permission program.pause manquante."
  const archiveDisabledReason = canArchiveAction
    ? null
    : program.status !== 'suspended'
      ? "L'archivage n'est disponible qu'après la suspension d'un programme."
      : !program.suspension_deadline_at
        ? "La date limite de suspension est manquante. Re-suspendez le programme pour reconstruire la période d'attente."
        : "La période d'attente de suspension n'est pas terminée ou la permission program.pause est manquante."
  const assignDisabledReason = canAssignAction
    ? null
    : isSuspended || program.status === 'archived'
      ? "L'assignation est bloquée lorsque le programme est suspendu ou archivé."
      : "Permission program.assign-agent manquante."
  const deleteDisabledReason = canDeleteAction
    ? null
    : program.status === 'archived'
      ? "Permission program.update manquante pour la suppression d'un programme archivé."
      : assignedTotal > 0
        ? "Des assignations actives existent. Archivez d'abord le programme ou retirez les assignations concernées."
        : "La suppression n'est disponible que pour les programmes archivés sans assignations ni prospects."
  const addProspectDisabledReason = canCreateProspect
    ? null
    : !hasPermission('prospect.submit')
      ? "Permission prospect.submit manquante."
      : program.status !== 'active'
        ? "Le programme doit être actif pour que les agents puissent ajouter des prospects."
        : "Cette action est temporairement indisponible."

  function withDisabledTooltip(item: ReactNode, reason: string | null) {
    if (!reason) return item
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="block">{item}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title={program.name}
        beforeTitle={
          <Button type="button" variant="ghost" size="icon-sm" className="-ml-1" asChild>
            <Link to="/programs" aria-label="Retour aux programmes">
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </Button>
        }
        titleAddon={
          <Badge
            variant="outline"
            className={cn('shrink-0 uppercase tracking-wide', programStatusBadgeClass(program.status))}
          >
            {programStatusLabel[program.status]}
          </Badge>
        }
        right={
          <TooltipProvider>
            <PageHeaderToolbar>
              {cardMode === 'agent'
                ? withDisabledTooltip(
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canCreateProspect}
                      onClick={() => {
                        if (canCreateProspect) setAddProspectMethodOpen(true)
                      }}
                    >
                      <Zap className="size-4" aria-hidden />
                      Ajouter un prospect
                    </Button>,
                    addProspectDisabledReason,
                  )
                : null}
              {cardMode === 'owner'
                ? (
                    <>
                      {withDisabledTooltip(
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canEditProgram}
                          onClick={() => {
                            if (canEditProgram) setEditOpen(true)
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                          Modifier
                        </Button>,
                        editDisabledReason,
                      )}
                      {hasRewards
                        ? withDisabledTooltip(
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!canEditRewardsShortcut}
                              onClick={() => {
                                if (!canEditRewardsShortcut) return
                                setRewardsEditOpen(true)
                              }}
                            >
                              <Package className="size-4" aria-hidden />
                              Gérer les récompenses
                            </Button>,
                            editRewardsDisabledReason,
                          )
                        : null}
                      {!isDraft && !isSuspended
                        ? withDisabledTooltip(
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={pauseDisabled}
                              onClick={() => {
                                if (pauseDisabled) return
                                setPendingOwnerAction({
                                  type: isPaused ? 'reactivate' : 'pause',
                                  program,
                                })
                              }}
                            >
                              {isPaused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
                              {isPaused ? 'Réactiver' : 'Mettre en pause'}
                            </Button>,
                            pauseDisabledReason,
                          )
                        : null}
                      {withDisabledTooltip(
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canAssignAction}
                          onClick={() => {
                            if (!canAssignAction) return
                            setAssignDialogProgram(program)
                            setSelectedAgentIds([])
                            setHasEditedAssignmentSelection(false)
                          }}
                        >
                          <UserPlus className="size-4" aria-hidden />
                          Assigner des agents
                        </Button>,
                        assignDisabledReason,
                      )}
                    </>
                  )
                : null}
            {cardMode === 'owner' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon-sm" aria-label="Plus d'actions">
                    <MoreVertical className="size-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <>
                    {hasCash
                      ? withDisabledTooltip(
                          <DropdownMenuItem
                            disabled={!canEditCashShortcut}
                            onSelect={() => {
                              if (!canEditCashShortcut) return
                              setCashEditOpen(true)
                            }}
                          >
                            <HandCoins className="size-4" />
                            Modifier le cash
                          </DropdownMenuItem>,
                          editCashDisabledReason,
                        )
                      : null}
                    {isDraft && program.actions.can_update
                      ? withDisabledTooltip(
                          <DropdownMenuItem
                            disabled={!canActivateProgram}
                            onSelect={() => {
                              if (canActivateProgram) setPendingOwnerAction({ type: 'activate', program })
                            }}
                          >
                            <Zap className="size-4" />
                            Activer le programme
                          </DropdownMenuItem>,
                          activateDisabledReason,
                        )
                      : null}
                    {isSuspended ? (
                      withDisabledTooltip(
                        <DropdownMenuItem
                          disabled={!canLiftSuspensionAction}
                          onSelect={() => {
                            if (canLiftSuspensionAction) setPendingOwnerAction({ type: 'lift_suspension', program })
                          }}
                        >
                          <Undo2 className="size-4" />
                          Lever la suspension
                        </DropdownMenuItem>,
                        liftSuspensionDisabledReason,
                      )
                    ) : !isDraft ? (
                      withDisabledTooltip(
                        <DropdownMenuItem
                          disabled={!canSuspendAction}
                          onSelect={() => {
                            if (!canSuspendAction) return
                            setPendingOwnerAction({ type: 'suspend', program })
                          }}
                        >
                          <OctagonAlert className="size-4" />
                          Suspendre
                        </DropdownMenuItem>,
                        suspendDisabledReason,
                      )
                    ) : null}
                    {withDisabledTooltip(
                      <DropdownMenuItem
                        disabled={!canArchiveAction}
                        onSelect={() => {
                          if (!canArchiveAction) return
                          setPendingOwnerAction({ type: 'archive', program })
                        }}
                      >
                        <Archive className="size-4" />
                        Archiver
                      </DropdownMenuItem>,
                      archiveDisabledReason,
                    )}
                    {withDisabledTooltip(
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!canDeleteAction}
                        onSelect={() => {
                          if (!canDeleteAction) return
                          setPendingOwnerAction({ type: 'delete', program })
                        }}
                      >
                        <Trash2 className="size-4" />
                        Supprimer
                      </DropdownMenuItem>,
                      deleteDisabledReason,
                    )}
                  </>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            </PageHeaderToolbar>
          </TooltipProvider>
        }
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Agents assignés"
          value={(program.assigned_agents_count ?? assignedAgents.length).toLocaleString('fr-FR')}
          description="Agents actuellement liés à ce programme"
          badge={kpiSnapshotBadge('Couverture')}
          icon={Users}
          tone="primary"
        />
        <KpiCard
          title="Prospects"
          value={activeProspects.length.toLocaleString('fr-FR')}
          description="Prospects actifs soumis via ce programme"
          badge={kpiSnapshotBadge('Pipeline')}
          icon={ScanSearch}
          tone="info"
        />
        <KpiCard
          title="Convertis"
          value={convertedProspects.length.toLocaleString('fr-FR')}
          description="Prospects marqués comme convertis"
          badge={kpiSnapshotBadge('Résultat')}
          icon={BriefcaseBusiness}
          tone="success"
        />
        <KpiCard
          title="Règle de points"
          value={program.points_per_transaction?.toLocaleString('fr-FR') ?? 'Paliers'}
          description={program.points_per_transaction === null ? 'Configuration par paliers CA' : 'Points par transaction'}
          badge={kpiSnapshotBadge(program.exchange_mode === 'both' ? 'Cash + récompenses' : exchangeModeLabel(program))}
          icon={HandCoins}
          tone="warning"
        />
      </div>

      <div className="grid w-full grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="min-w-0 rounded-lg border-0 bg-card p-4 shadow-sm sm:p-5">
          <DashboardSectionHeader
            title="Aperçu du programme"
          />
          <div className="space-y-4">
            <div className="min-w-0">
              <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-foreground">
                {program.name}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {program.description ?? 'Aucune description disponible pour ce programme.'}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <PreviewMetric label="Commission" value={commissionLabel(program)} helper="Modèle de gain" />
              <PreviewMetric label="Points" value={pointsRuleLabel(program)} helper="Règle de gain agent" />
            </div>

            <div className="rounded-lg border border-border bg-muted/15 px-4 py-3">
              <p className="app-eyebrow">Éligibilité</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {program.eligibility_criteria ?? "Aucun critère d'éligibilité n'a encore été défini."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <MetaBadge label="Activé" value={formatDashboardDateFr(program.activated_at)} />
              <MetaBadge label="Mis à jour" value={formatDashboardDateFr(program.updated_at)} />
            </div>
          </div>
        </article>

        <article className="min-w-0 rounded-lg border-0 bg-card p-4 shadow-sm sm:p-5">
          <DashboardSectionHeader title="Configuration des échanges" />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('w-fit', exchangeConfig.badgeClass)}>
                {exchangeConfig.label}
              </Badge>
            </div>

            <div className="grid gap-2">
              {hasCash
                ? withDisabledTooltip(
                    <button
                      type="button"
                      disabled={!canEditCashShortcut}
                      onClick={() => {
                        if (!canEditCashShortcut) return
                        setCashEditOpen(true)
                      }}
                      className="group w-full rounded-lg border border-dashed border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-left transition-colors hover:border-solid hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-300">
                            Cash
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-foreground">
                            {cashRuleLabel(program)}
                          </p>
                        </div>
                        <HandCoins className="size-4 shrink-0 text-emerald-600" aria-hidden />
                      </div>
                    </button>,
                    editCashDisabledReason,
                  )
                : null}

              {hasRewards
                ? withDisabledTooltip(
                    <button
                      type="button"
                      disabled={!canEditRewardsShortcut}
                      onClick={() => {
                        if (!canEditRewardsShortcut) return
                        setRewardsEditOpen(true)
                      }}
                      className="group w-full rounded-lg border border-dashed border-amber-500/25 bg-amber-500/5 px-4 py-3 text-left transition-colors hover:border-solid hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-900 dark:text-amber-300">
                            Récompenses
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-foreground">
                            {program.exchange_pack?.name ?? 'Aucun pack lié'}
                          </p>
                          <div className="mt-3 space-y-1">
                            {program.exchange_pack?.items.length ? (
                              program.exchange_pack.items.slice(0, 4).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-xs"
                                >
                                  <span className="min-w-0 truncate font-medium text-foreground">{item.title}</span>
                                  <span className="shrink-0 font-mono text-muted-foreground">
                                    {item.points_cost.toLocaleString('fr-FR')} pts
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
                                Aucun article de récompense n'est lié à ce programme.
                              </p>
                            )}
                          </div>
                        </div>
                        <Gift className="size-4 shrink-0 text-amber-600" aria-hidden />
                      </div>
                    </button>,
                    editRewardsDisabledReason,
                  )
                : null}
            </div>
          </div>
        </article>
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader
          title="Agents assignés"
          description="Agents actuellement assignés à ce programme."
        />
        <div className="mb-3">
          <label className="sr-only" htmlFor="program-agents-search">
            Rechercher des agents assignés
          </label>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="program-agents-search"
              value={agentTableSearch}
              onChange={(event) => {
                setAgentTableSearch(event.target.value)
                setAgentTablePage(1)
              }}
              placeholder="Rechercher par nom, email, code, statut..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Code</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden lg:table-cell">Assigné</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedAssignedAgents.length > 0 ? (
                pagedAssignedAgents.map((assignment, index) => {
                  const agent = assignment.agent!
                  const displayName = agent.display_name?.trim() || agent.email || 'Agent inconnu'
                  return (
                    <TableRow key={assignment.assignment_id}>
                      <TableCell className="text-center text-muted-foreground">
                        {(agentPageSafe - 1) * agentTablePageSize + index + 1}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/agents/${agent.id}`}
                          className="group -m-1 flex min-w-0 items-center gap-2.5 rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Avatar className="size-9 shrink-0">
                            <AvatarImage src={agent.avatar_url ?? undefined} alt={displayName} />
                            <AgentAvatarFallback seed={avatarSeedForUser(agent)} className="text-xs font-medium">
                              {agentInitials(agent.display_name, agent.email)}
                            </AgentAvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                              {displayName}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                              {agent.email ?? 'Email non disponible'}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden max-w-[14rem] truncate sm:table-cell">
                        {agent.email ?? 'No email'}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                        {agent.agent_code ?? 'Sans code'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="w-fit capitalize">
                          {assignment.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {formatDashboardDateFr(assignment.assigned_at)}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      message={
                        filteredAssignedAgents.length === 0 && assignedAgents.length > 0
                          ? 'Aucun agent assigné ne correspond au filtre actuel.'
                          : "Aucun agent n'est encore assigné à ce programme."
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePaginationBar
            page={agentPageSafe}
            pageSize={agentTablePageSize}
            totalItems={filteredAssignedAgents.length}
            onPageChange={setAgentTablePage}
            onPageSizeChange={setAgentTablePageSize}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </article>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader
          title="Prospects du programme"
          description="Prospects soumis via ce programme spécifique."
        />
        {canViewProspects ? (
          <div className="mb-3">
            <label className="sr-only" htmlFor="program-prospects-search">
              Rechercher des prospects
            </label>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="program-prospects-search"
                value={prospectTableSearch}
                onChange={(event) => {
                  setProspectTableSearch(event.target.value)
                  setProspectTablePage(1)
                }}
                placeholder="Rechercher par contact, entreprise, agent, statut..."
                className="pl-9"
              />
            </div>
          </div>
        ) : null}
        {!canViewProspects ? (
          <EmptyState message="Les détails des prospects ne sont pas disponibles pour ce rôle." />
        ) : prospectsQuery.isPending ? (
          <Skeleton className="h-72 rounded-lg" />
        ) : prospectsQuery.isError ? (
          <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {(prospectsQuery.error as ApiError).message}
          </article>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Agent</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead className="hidden lg:table-cell">Soumis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedProgramProspects.length > 0 ? (
                  pagedProgramProspects.map((prospect, index) => {
                    const pipeline = prospectPipelinePresentation(prospect)
                    return (
                      <TableRow key={prospect.id} className={prospect.deleted_at ? 'opacity-70' : undefined}>
                        <TableCell className="text-center text-muted-foreground">
                          {(prospectPageSafe - 1) * prospectTablePageSize + index + 1}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={buildProspectDetailPath({
                              prospectId: prospect.id,
                              agentId: prospect.agent_id,
                            })}
                            className="group -m-1 block min-w-0 rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                              {prospect.contact_name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {prospect.company_name ?? 'No company'}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden max-w-[14rem] truncate sm:table-cell">
                          {prospect.contact_email ?? 'Email non disponible'}
                        </TableCell>
                        <TableCell className="hidden max-w-[12rem] truncate text-muted-foreground md:table-cell">
                          {prospect.agent_id ? (
                            <Link to={`/agents/${prospect.agent_id}`} className="text-primary underline-offset-2 hover:underline">
                              {prospect.agent_name ?? 'Agent inconnu'}
                            </Link>
                          ) : (
                            prospect.agent_name ?? 'Unknown agent'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('w-fit text-xs', pipeline.className)}>
                            {pipeline.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('w-fit text-xs', submissionBadgeClass(prospect.submission_status))}>
                            {submissionLabels[prospect.submission_status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {formatDashboardDateFr(prospect.submitted_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState
                        message={
                          filteredProgramProspects.length === 0 && programProspects.length > 0
                            ? 'Aucun prospect ne correspond au filtre actuel.'
                            : "Aucun prospect n'a encore été soumis via ce programme."
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePaginationBar
              page={prospectPageSafe}
              pageSize={prospectTablePageSize}
              totalItems={filteredProgramProspects.length}
              onPageChange={setProspectTablePage}
              onPageSizeChange={setProspectTablePageSize}
              pageSizeOptions={[10, 25, 50]}
            />
          </div>
        )}
      </article>

      <ProgramFormDialog
        open={editOpen}
        title="Modifier le programme"
        submitLabel="Enregistrer"
        packs={packsQuery.data?.data ?? []}
        initialProgram={program}
        isSubmitting={updateMutation.isPending}
        error={updateProgramError}
        onClose={() => {
          setEditOpen(false)
          updateMutation.reset()
        }}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync({ payload })
        }}
      />

      <ProgramCashRulesDialog
        open={cashEditOpen}
        program={program}
        isSubmitting={updateMutation.isPending}
        error={updateProgramError}
        onClose={() => {
          setCashEditOpen(false)
          updateMutation.reset()
        }}
        onSubmit={async (pointsPerEuro) => {
          await updateMutation.mutateAsync({
            payload: toProgramPayload(program, {
              points_per_euro: pointsPerEuro,
            }),
          })
        }}
      />

      <ProgramRewardPackDialog
        open={rewardsEditOpen}
        program={program}
        packs={rewardPacks}
        isSubmitting={updateMutation.isPending}
        error={updateProgramError}
        onClose={() => {
          setRewardsEditOpen(false)
          updateMutation.reset()
        }}
        onSubmit={async (exchangePackId) => {
          await updateMutation.mutateAsync({
            payload: toProgramPayload(program, {
              exchange_pack_id: exchangePackId,
            }),
          })
        }}
      />

      <AddProspectMethodDialog
        open={addProspectMethodOpen}
        programId={program.id}
        agentCode={user?.agent_profile?.agent_code ?? ''}
        onClose={() => setAddProspectMethodOpen(false)}
        onSelectForm={() => {
          setAddProspectMethodOpen(false)
          setCreateProspectOpen(true)
        }}
      />

      <NewProspectDialog
        open={createProspectOpen}
        programs={[program]}
        defaultProgramId={program.id}
        isSubmitting={createProspectMutation.isPending}
        error={createProspectError}
        onClose={() => {
          setCreateProspectOpen(false)
          createProspectMutation.reset()
        }}
        onSubmit={async (payload) => {
          await createProspectMutation.mutateAsync(payload)
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
            nextProgramId: assignDialogProgram.id,
            agentIds,
          })
        }}
      />

      <ProgramLifecycleConfirmDialog
        action={pendingOwnerAction}
        isSubmitting={isOwnerActionPending}
        onClose={() => setPendingOwnerAction(null)}
        onConfirm={async (type, nextProgram) => {
          if (type === 'activate') {
            await activateMutation.mutateAsync(nextProgram.id)
          } else if (type === 'pause') {
            await pauseMutation.mutateAsync(nextProgram.id)
          } else if (type === 'reactivate' || type === 'lift_suspension') {
            await reactivateMutation.mutateAsync(nextProgram.id)
          } else if (type === 'suspend') {
            await suspendMutation.mutateAsync(nextProgram.id)
          } else if (type === 'archive') {
            await archiveMutation.mutateAsync(nextProgram.id)
          } else if (type === 'delete') {
            await deleteArchivedMutation.mutateAsync(nextProgram.id)
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
              Assign agents{assignDialogProgram ? ` to ${assignDialogProgram.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              Select the business agents that should be attached to this program.
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
                          <AgentAvatarFallback seed={agent.id}>
                            {agentRecordInitials(agent)}
                          </AgentAvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{agent.display_name ?? agent.email ?? 'Agent'}</ItemTitle>
                        <ItemDescription>
                          {agent.email ?? 'Email unavailable'} · Added {formatAgentAddedAt(agent)}
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
                              <p>This agent already submitted prospects in this program and cannot be removed.</p>
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
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={syncAssignmentsMutation.isPending || !assignDialogProgram}
              onClick={() => {
                if (!assignDialogProgram) return
                const nextAgentIds = hasEditedAssignmentSelection ? selectedAgentIds : assignmentAgentIds
                syncAssignmentsMutation.mutate({
                  nextProgramId: assignDialogProgram.id,
                  agentIds: nextAgentIds,
                })
              }}
            >
              {syncAssignmentsMutation.isPending ? 'Saving...' : 'Save assignments'}
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
                ? 'Pause this program?'
                : pendingOwnerAction?.type === 'reactivate'
                  ? 'Reactivate this program?'
                  : pendingOwnerAction?.type === 'suspend'
                    ? 'Suspend this program?'
                    : pendingOwnerAction?.type === 'archive'
                      ? 'Archive this program?'
                      : 'Delete this program permanently?'}
            </DialogTitle>
            <DialogDescription>
              {pendingOwnerAction?.type === 'pause'
                ? 'Agents will not be able to add new prospects while the program is paused.'
                : pendingOwnerAction?.type === 'reactivate'
                  ? 'The program will become active again and agents can submit prospects.'
                  : pendingOwnerAction?.type === 'suspend'
                    ? 'Agent benefits linked to this program will be blocked while the program enters controlled wind-down.'
                    : pendingOwnerAction?.type === 'archive'
                      ? 'The program will move to archive and leave current operations.'
                      : 'This action is irreversible. Type the exact program name to confirm.'}
            </DialogDescription>
          </DialogHeader>

          {pendingOwnerAction?.type === 'delete' ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Expected name: <strong>{pendingOwnerAction.program.name}</strong>
              </p>
              <Input
                value={deleteConfirmName}
                onChange={(event) => setDeleteConfirmName(event.target.value)}
                placeholder="Type the full program name"
              />
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isOwnerActionPending}>
                Cancel
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
                  // Mutation errors stay in react-query state for future inline handling.
                }
              }}
            >
              {isOwnerActionPending
                ? 'Processing...'
                : pendingOwnerAction?.type === 'pause'
                  ? 'Confirm pause'
                  : pendingOwnerAction?.type === 'reactivate'
                    ? 'Confirm reactivation'
                    : pendingOwnerAction?.type === 'suspend'
                      ? 'Confirm suspension'
                      : pendingOwnerAction?.type === 'archive'
                        ? 'Confirm archive'
                        : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function PreviewMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="app-eyebrow">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p>
    </article>
  )
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 bg-muted/30 px-2.5 py-1 text-xs font-medium">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </Badge>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-5 text-sm text-muted-foreground">
      {message}
    </p>
  )
}
