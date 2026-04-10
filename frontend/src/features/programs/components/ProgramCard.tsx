import { type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  Briefcase,
  ExternalLink,
  Gift,
  HandCoins,
  MoreVertical,
  OctagonAlert,
  Package,
  Pause,
  Pencil,
  Play,
  Trash2,
  Undo2,
  UserPlus,
  Zap,
} from 'lucide-react'

import { EntityCardIdentity } from '@/components/app/EntityCardIdentity'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AgentAvatarFallback,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import { avatarSeedForUser } from '@/lib/avatar-fallback'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconTile } from '@/components/ui/icon-tile'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { programStatusBadgeClass } from '@/features/dashboard/utils/semanticBadges'
import type { ProgramRecord, ProgramStatus } from '@/types/programs'
import { SuspensionDeadlineCountdown } from './SuspensionDeadlineCountdown'

const statusLabel: Record<ProgramStatus, string> = {
  active: 'Actif',
  draft: 'Brouillon',
  paused: 'En pause',
  suspended: 'Suspendu',
  archived: 'Archivé',
}

const cashBadgeClass =
  'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
const rewardBadgeClass =
  'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-300'
const VISIBLE_ASSIGNMENT_AVATARS = 3

export type ProgramCardMode = 'owner' | 'agent'
type ProgramInfoCardKey =
  | 'business'
  | 'attribution'
  | 'points'
  | 'exchange'
  | 'cash'
  | 'rewards'
  | 'assignments'

function roleSummary(program: ProgramRecord) {
  if (program.commission_type === 'per-transaction') {
    return program.points_per_transaction === null
      ? 'Par transaction'
      : `${program.points_per_transaction.toLocaleString()} pts / transaction`
  }

  return 'Paliers CA'
}

function exchangeModeConfig(mode: ProgramRecord['exchange_mode']) {
  if (mode === 'both') {
    return {
      icon: Briefcase,
      tileClass: 'bg-blue-500 text-white',
      label: 'Récompenses + Cash',
      badgeClass: 'border-blue-500/25 bg-blue-500/10 text-blue-800 dark:text-blue-300',
    }
  }
  if (mode === 'cash') {
    return {
      icon: HandCoins,
      tileClass: 'bg-emerald-500 text-white',
      label: 'Cash uniquement',
      badgeClass: cashBadgeClass,
    }
  }
  return {
    icon: Gift,
    tileClass: 'bg-amber-500 text-white',
    label: 'Récompenses uniquement',
    badgeClass: rewardBadgeClass,
  }
}

function businessInitials(name: string | null | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed) {
    return 'BU'
  }
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

function agentInitials(displayName: string | null | undefined, email: string | null | undefined): string {
  const n = displayName?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

function agentAvailability(program: ProgramRecord, canSubmitProspect: boolean) {
  if (!canSubmitProspect) {
    return {
      label: 'Lecture seule',
      toneClass: 'border-border bg-muted/40 text-muted-foreground',
      helper: "La soumission de prospects n'est pas activée pour cet espace.",
    }
  }

  if (program.status === 'active') {
    return {
      label: 'Prêt pour les prospects',
      toneClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      helper: "Ouvrez le programme ou soumettez un nouveau prospect immédiatement.",
    }
  }

  if (program.status === 'paused') {
    return {
      label: 'Temporairement en pause',
      toneClass: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      helper: "Consultez les détails du programme. La soumission de prospects est en pause.",
    }
  }

  if (program.status === 'suspended') {
    return {
      label: 'Soumission bloquée',
      toneClass: 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300',
      helper: "Le propriétaire clôture ce programme. Les nouveaux prospects sont bloqués.",
    }
  }

  return {
    label: 'Indisponible',
    toneClass: 'border-border bg-muted/40 text-muted-foreground',
    helper: "Ce programme n'est pas ouvert aux nouvelles soumissions.",
  }
}

function compactDate(value: string | null | undefined) {
  if (!value) return 'Non démarré'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function programTimelineLabel(program: ProgramRecord) {
  if (program.status === 'suspended') {
    return `Suspendu ${compactDate(program.suspended_at)}`
  }
  if (program.status === 'paused') {
    return `En pause ${compactDate(program.paused_at)}`
  }
  if (program.status === 'active') {
    return `Activé ${compactDate(program.activated_at ?? program.created_at)}`
  }
  if (program.status === 'archived') {
    return `Archivé ${compactDate(program.updated_at)}`
  }
  return `Créé ${compactDate(program.created_at)}`
}

function CompactMetaItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const hasPointsText = /pts|points/i.test(value)

  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2 transition-colors group-hover:border-solid group-focus-visible:border-solid">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xs text-foreground', hasPointsText ? 'font-semibold' : 'font-medium')}>
        {value}
      </p>
    </div>
  )
}

function CompactMetaToneItem({
  title,
  value,
  tone = 'neutral',
}: {
  title: string
  value: ReactNode
  tone?: 'cash' | 'reward' | 'neutral'
}) {
  const toneClass =
    tone === 'cash'
      ? 'border-emerald-500/35 bg-emerald-500/8'
      : tone === 'reward'
        ? 'border-amber-500/35 bg-amber-500/8'
        : 'border-border/60 bg-muted/10'
  const titleClass =
    tone === 'cash'
      ? 'text-emerald-800 dark:text-emerald-300'
      : tone === 'reward'
        ? 'text-amber-900 dark:text-amber-300'
        : 'text-muted-foreground'

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed px-3 py-2 transition-colors group-hover:border-solid group-focus-visible:border-solid',
        toneClass,
      )}
    >
      <p className={cn('text-[10px] uppercase tracking-[0.16em]', titleClass)}>{title}</p>
      <div className="mt-1 text-xs font-medium text-foreground">{value}</div>
    </div>
  )
}

interface ProgramCardProps {
  program: ProgramRecord
  mode?: ProgramCardMode
  canSubmitProspect?: boolean
  prospectCreateHref?: string
  businessPrograms?: ProgramRecord[]
  onEdit?: (program: ProgramRecord) => void
  onEditCash?: (program: ProgramRecord) => void
  onTogglePause?: (program: ProgramRecord) => void
  onSuspend?: (program: ProgramRecord) => void
  onArchive?: (program: ProgramRecord) => void
  onAssignAgents?: (program: ProgramRecord) => void
  onManageRewards?: (program: ProgramRecord) => void
  onEditRewardsPack?: (program: ProgramRecord) => void
  onAddProspect?: (program: ProgramRecord) => void
  onViewBusinessPrograms?: (program: ProgramRecord) => void
  onDeleteArchived?: (program: ProgramRecord) => void
  onLiftSuspension?: (program: ProgramRecord) => void
  onActivateDraft?: (program: ProgramRecord) => void
  togglePending?: boolean
}

function ClickableInfoCard({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full cursor-pointer text-left outline-none ring-offset-background transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </button>
  )
}

export function ProgramCard({
  program,
  mode = 'owner',
  canSubmitProspect = false,
  prospectCreateHref,
  businessPrograms = [],
  onEdit,
  onEditCash,
  onTogglePause,
  onSuspend,
  onArchive,
  onAssignAgents,
  onManageRewards,
  onEditRewardsPack,
  onAddProspect,
  onViewBusinessPrograms,
  onDeleteArchived,
  onLiftSuspension,
  onActivateDraft,
  togglePending = false,
}: ProgramCardProps) {
  const canEdit = program.actions.can_edit_general ?? program.actions.can_update
  const canPause = program.actions.can_pause
  const canReactivate = program.actions.can_reactivate ?? false
  const canLiftSuspension = program.actions.can_lift_suspension ?? false
  const canSuspend = program.actions.can_suspend ?? false
  const canArchive = program.actions.can_archive ?? false
  const canAssignAgent = program.actions.can_assign_agent
  const canSoftDelete =
    program.actions.can_soft_delete ?? program.actions.can_delete_from_archive ?? false
  const isPaused = program.status === 'paused'
  const isSuspended = program.status === 'suspended'
  const isDraft = program.status === 'draft'
  const canActivateProgram = Boolean(program.actions.can_activate && onActivateDraft)
  const hasCash = program.exchange_mode === 'cash' || program.exchange_mode === 'both'
  const hasRewards = program.exchange_mode === 'reward' || program.exchange_mode === 'both'
  const isRevenueTier = program.commission_type === 'revenue-tier'
  const isToggleDisabled = togglePending || (isPaused && isRevenueTier)
  const modeConfig = exchangeModeConfig(program.exchange_mode)
  const availability = agentAvailability(program, canSubmitProspect)

  const assignedAgentEntries = (program.assigned_agents ?? [])
    .filter((row): row is NonNullable<typeof row> & { agent: NonNullable<typeof row.agent> } => row.agent !== null)
    .map((row) => ({ ...row, agent: row.agent }))
  const assignedTotal = program.assigned_agents_count ?? assignedAgentEntries.length
  const assignmentAvatars = assignedAgentEntries.slice(0, VISIBLE_ASSIGNMENT_AVATARS)
  const showAssignmentCount = assignedTotal > VISIBLE_ASSIGNMENT_AVATARS

  const canEditGeneral = Boolean(canEdit && onEdit)
  const canEditCashShortcut = Boolean(hasCash && program.actions.can_edit_cash && onEditCash)
  const canEditRewardsShortcut = Boolean(hasRewards && program.actions.can_edit_rewards && onManageRewards)
  const canTogglePauseAction = Boolean((canPause || canReactivate) && onTogglePause)
  const pauseDisabled = !canTogglePauseAction || isToggleDisabled
  const canSuspendAction = Boolean(canSuspend && onSuspend)
  const canLiftSuspensionAction = Boolean(canLiftSuspension && onLiftSuspension)
  const canArchiveAction = Boolean(canArchive && onArchive)
  const canAssignAction = Boolean(
    canAssignAgent && onAssignAgents && !isSuspended && program.status !== 'archived',
  )
  const canDeleteAction = Boolean(canSoftDelete && onDeleteArchived)
  const canCreateProspect = Boolean((prospectCreateHref || onAddProspect) && canSubmitProspect && program.status === 'active')
  const [activeInfoCard, setActiveInfoCard] = useState<ProgramInfoCardKey | null>(null)
  const pointsSummary =
    program.points_per_transaction === null
      ? 'À configurer'
      : `${program.points_per_transaction.toLocaleString()} pts`
  const isInfoDialogOpen = activeInfoCard !== null
  const editDisabledReason = canEditGeneral
    ? null
    : (
        program.status === 'archived'
          ? 'Programme archivé, utilisez un programme non archivé pour modifier les réglages généraux.'
          : assignedTotal > 0
            ? 'Des agents sont déjà assignés, retirez les assignations actives pour réactiver cette modification.'
            : 'Des prospects existent déjà ou la permission program.update manque, utilisez un programme sans prospects ou accordez cette permission.'
      )
  const editCashDisabledReason = canEditCashShortcut
    ? null
    : (
        !hasCash
          ? 'Mode cash inactif, passez ce programme en mode cash ou both pour éditer cette section.'
          : program.status === 'archived'
            ? 'Programme archivé, utilisez un programme non archivé pour modifier les règles cash.'
            : assignedTotal > 0
              ? 'Des agents sont déjà assignés, retirez les assignations actives pour réactiver cette modification.'
              : 'Permission program.update manquante, accordez-la pour éditer les règles cash.'
      )
  const editRewardsDisabledReason = canEditRewardsShortcut
    ? null
    : (
        !hasRewards
          ? 'Mode rewards inactif, passez ce programme en mode reward ou both pour éditer le pack.'
          : program.status === 'archived'
            ? 'Programme archivé, utilisez un programme non archivé pour modifier le pack rewards.'
            : 'Permission program.update manquante, accordez-la pour modifier le pack rewards.'
      )
  const activateDisabledReason = canActivateProgram
    ? null
    : (
        program.status !== 'draft'
          ? 'Seul un programme en brouillon peut être activé, remettez-le en statut draft.'
          : 'Brouillon incomplet (points, conversion cash ou pack rewards) ou permission program.update manquante, complétez la config et accordez la permission.'
      )
  const liftSuspensionDisabledReason = canLiftSuspensionAction
    ? null
    : (
        program.status !== 'suspended'
          ? 'La levée de suspension est disponible uniquement pour un programme suspendu.'
          : 'Permission program.pause manquante, accordez-la pour lever la suspension.'
      )
  const pauseDisabledReason = pauseDisabled
    ? (
        togglePending
          ? 'Une opération est déjà en cours, attendez la fin du traitement puis réessayez.'
          : isPaused && isRevenueTier
            ? 'Le mode revenue-tier ne permet pas encore la réactivation, finalisez cette logique côté backend.'
            : (
                isPaused
                  ? 'Permission program.pause manquante, accordez-la pour réactiver ce programme.'
                  : 'La pause nécessite un programme actif avec la permission program.pause.'
              )
      )
    : null
  const suspendDisabledReason = canSuspendAction
    ? null
    : (
        program.status !== 'active' && program.status !== 'paused'
          ? 'La suspension est autorisée uniquement pour un programme actif ou en pause.'
          : program.has_open_prospects
            ? 'Des prospects sont encore ouverts, clôturez-les avant de suspendre.'
            : 'Permission program.pause manquante, accordez-la pour suspendre ce programme.'
      )
  const archiveDisabledReason = canArchiveAction
    ? null
    : (
        program.status !== 'suspended'
          ? 'L’archivage n’est possible qu’après suspension du programme.'
          : !program.suspension_deadline_at
            ? 'Date de fin de suspension absente, re-suspendez le programme pour recréer la période d’attente.'
            : 'Le délai de suspension de 30 jours n’est pas terminé ou la permission program.pause est manquante.'
      )
  const assignDisabledReason = canAssignAction
    ? null
    : (
        isSuspended || program.status === 'archived'
          ? 'Assignation bloquée en statut suspended/archived, réactivez le programme pour assigner des agents.'
          : 'Permission program.assign-agent manquante, accordez-la pour gérer les assignations.'
      )
  const deleteDisabledReason = canDeleteAction
    ? null
    : (
        program.status === 'archived'
          ? 'Permission program.update manquante, accordez-la pour supprimer ce programme archivé.'
          : assignedTotal > 0
            ? 'Des assignations actives existent, archivez d’abord le programme, ou retirez les assignations autorisées.'
            : 'Suppression autorisée seulement pour un programme archivé, ou sans assignations actives et sans prospects.'
      )
  const addProspectDisabledReason = canCreateProspect
    ? null
    : (
        !canSubmitProspect
          ? 'Permission prospect.submit manquante, accordez-la pour autoriser la soumission.'
          : program.status !== 'active'
            ? 'Le programme n’est pas actif, réactivez-le pour permettre l’ajout de prospects.'
            : 'Action temporairement indisponible, actualisez la page puis réessayez.'
      )

  function withDisabledTooltip(item: ReactNode, reason: string | null) {
    if (!reason) return item
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="block">{item}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reason}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  const infoDialogCopy: Record<ProgramInfoCardKey, { title: string; description: string }> = {
    business: {
      title: 'Périmètre business',
      description:
        mode === 'agent'
          ? 'Le business propriétaire du programme. Il définit qui contrôle les règles, les récompenses et les assignations.'
          : 'Contexte business de ce programme.',
    },
    attribution: {
      title: 'Attribution',
      description:
        mode === 'owner'
          ? 'Définit comment les agents gagnent des points à partir des résultats commerciaux. Gardez cette configuration claire pour que la logique de paiement reste prévisible.'
          : 'Indique comment ce programme attribue des points pour vos activités.',
    },
    points: {
      title: 'Points',
      description:
        mode === 'owner'
          ? 'Taux de points actuel utilisé par ce programme. Cette valeur impacte directement la vitesse de gain des agents.'
          : 'Valeur de points actuelle pour ce programme. Cela contrôle ce que vos actions génèrent.',
    },
    exchange: {
      title: "Mode d'échange",
      description:
        mode === 'agent'
          ? 'Indique si ce programme propose du cash, des récompenses ou les deux chemins de conversion.'
          : 'Configuration des échanges pour ce programme.',
    },
    cash: {
      title: 'Conversion cash',
      description:
        mode === 'owner'
          ? 'Définit le ratio de conversion des points en € pour les échanges cash.'
          : "Taux de conversion utilisé lorsque l'échange cash est disponible.",
    },
    rewards: {
      title: 'Pack récompenses',
      description:
        mode === 'owner'
          ? 'Catalogue de récompenses lié à ce programme et les coûts en points associés.'
          : 'Articles disponibles en récompense et les points nécessaires pour chacun.',
    },
    assignments: {
      title: 'Assignations',
      description:
        mode === 'owner'
          ? "Agents actuellement liés à ce programme. Le nombre d'assignations aide à suivre la couverture et l'exécution."
          : "Contexte d'assignation pour ce programme.",
    },
  }

  return (
    <Card className="rounded-lg border-0 shadow-none">
      <div className="flex flex-col gap-1.5 p-3 sm:p-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <Link to={`/programs/${program.id}`} className="group flex min-w-0 flex-1 cursor-pointer items-start">
            <EntityCardIdentity
              leading={
                mode === 'agent' ? (
                  <Avatar className="size-10 rounded-xl">
                    <AvatarImage src={program.business_logo_url ?? undefined} alt={program.business_name ?? 'Business'} className="object-contain" />
                    <AvatarFallback className="rounded-xl border border-border/70 bg-muted/30 text-sm font-semibold text-foreground">
                      {businessInitials(program.business_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <IconTile icon={modeConfig.icon} size="md" className={modeConfig.tileClass} />
                )
              }
              title={program.name}
            badge={
              <Badge
                variant="secondary"
                className={cn(
                  'border-0',
                  programStatusBadgeClass(program.status),
                )}
              >
                {statusLabel[program.status]}
                </Badge>
              }
              description={
                mode === 'agent'
                  ? availability.helper
                  : program.description ?? 'No description available.'
              }
              className="flex-1"
              titleClassName="group-hover:underline !text-sm text-foreground"
              descriptionClassName="text-xs leading-[1.15rem]"
            />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Actions du programme"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <TooltipProvider>
                {mode === 'agent' ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to={`/programs/${program.id}`} className="flex cursor-pointer items-center gap-2">
                        <ExternalLink className="size-4" />
                        Voir le programme
                      </Link>
                    </DropdownMenuItem>
                    {withDisabledTooltip(
                      <DropdownMenuItem
                        disabled={!canCreateProspect}
                        onClick={() => { if (canCreateProspect) onAddProspect?.(program) }}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Zap className="size-4" />
                        Ajouter un prospect
                      </DropdownMenuItem>,
                      addProspectDisabledReason,
                    )}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to={`/programs/${program.id}`} className="flex cursor-pointer items-center gap-2">
                        <ExternalLink className="size-4" />
                        Voir le programme
                      </Link>
                    </DropdownMenuItem>
                    {withDisabledTooltip(
                      <DropdownMenuItem
                        disabled={!canEditGeneral}
                        onSelect={() => {
                          if (canEditGeneral) onEdit!(program)
                        }}
                      >
                        <Pencil className="size-4" />
                        Modifier
                      </DropdownMenuItem>,
                      editDisabledReason,
                    )}
                    {hasCash
                      ? withDisabledTooltip(
                          <DropdownMenuItem
                            disabled={!canEditCashShortcut}
                            onSelect={() => {
                              if (canEditCashShortcut) onEditCash!(program)
                            }}
                          >
                            <HandCoins className="size-4" />
                            Modifier le cash
                          </DropdownMenuItem>,
                          editCashDisabledReason,
                        )
                      : null}
                    {hasRewards
                      ? withDisabledTooltip(
                          <DropdownMenuItem
                            disabled={!canEditRewardsShortcut}
                            onSelect={() => {
                              if (canEditRewardsShortcut) onManageRewards!(program)
                            }}
                          >
                            <Package className="size-4" />
                            Gérer le pack récompenses
                          </DropdownMenuItem>,
                          editRewardsDisabledReason,
                        )
                      : null}
                    {isDraft && program.actions.can_update
                      ? withDisabledTooltip(
                          <DropdownMenuItem
                            disabled={!canActivateProgram}
                            onSelect={() => {
                              if (canActivateProgram) onActivateDraft!(program)
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
                            if (canLiftSuspensionAction) onLiftSuspension!(program)
                          }}
                        >
                          <Undo2 className="size-4" />
                          Lever la suspension
                        </DropdownMenuItem>,
                        liftSuspensionDisabledReason,
                      )
                    ) : !isDraft ? (
                      <>
                        {withDisabledTooltip(
                          <DropdownMenuItem
                            disabled={pauseDisabled}
                            onSelect={() => {
                              if (!pauseDisabled && onTogglePause) onTogglePause(program)
                            }}
                          >
                            {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                            {isPaused ? 'Réactiver' : 'Mettre en pause'}
                          </DropdownMenuItem>,
                          pauseDisabledReason,
                        )}
                        {withDisabledTooltip(
                          <DropdownMenuItem
                            disabled={!canSuspendAction}
                            onSelect={() => {
                              if (canSuspendAction) onSuspend!(program)
                            }}
                          >
                            <OctagonAlert className="size-4" />
                            Suspendre
                          </DropdownMenuItem>,
                          suspendDisabledReason,
                        )}
                      </>
                    ) : null}
                    {withDisabledTooltip(
                      <DropdownMenuItem
                        disabled={!canArchiveAction}
                        onSelect={() => {
                          if (canArchiveAction) onArchive!(program)
                        }}
                      >
                        <Archive className="size-4" />
                        Archiver
                      </DropdownMenuItem>,
                      archiveDisabledReason,
                    )}
                    {withDisabledTooltip(
                      <DropdownMenuItem
                        disabled={!canAssignAction}
                        onSelect={() => {
                          if (canAssignAction) onAssignAgents!(program)
                        }}
                      >
                        <UserPlus className="size-4" />
                        Assigner des agents
                      </DropdownMenuItem>,
                      assignDisabledReason,
                    )}
                    {withDisabledTooltip(
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!canDeleteAction}
                        onSelect={() => {
                          if (canDeleteAction) onDeleteArchived!(program)
                        }}
                      >
                        <Trash2 className="size-4" />
                        Supprimer
                      </DropdownMenuItem>,
                      deleteDisabledReason,
                    )}
                  </>
                )}
              </TooltipProvider>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>

      <CardContent className="space-y-2 px-3 pb-3 pt-0 sm:px-4">
        <div className={cn('grid gap-2 sm:grid-cols-2', mode === 'agent' ? 'xl:grid-cols-3' : undefined)}>
          {mode === 'agent' ? (
            <>
              <ClickableInfoCard onClick={() => setActiveInfoCard('business')}>
                <CompactMetaItem label="Business" value={program.business_name ?? 'Unknown'} />
              </ClickableInfoCard>
              <ClickableInfoCard onClick={() => setActiveInfoCard('points')}>
                <CompactMetaItem label="Points" value={pointsSummary} />
              </ClickableInfoCard>
              <ClickableInfoCard onClick={() => setActiveInfoCard('exchange')}>
                <CompactMetaItem label="Exchange" value={modeConfig.label} />
              </ClickableInfoCard>
            </>
          ) : (
            <>
              <ClickableInfoCard onClick={() => setActiveInfoCard('attribution')}>
                <CompactMetaItem label="Attribution" value={roleSummary(program)} />
              </ClickableInfoCard>
              <ClickableInfoCard onClick={() => setActiveInfoCard('points')}>
                <CompactMetaItem label="Points" value={pointsSummary} />
              </ClickableInfoCard>
            </>
          )}
        </div>

        {hasCash || hasRewards ? (
          <div className="grid gap-2">
            {hasCash ? (
              <ClickableInfoCard onClick={() => setActiveInfoCard('cash')}>
                <CompactMetaToneItem
                  title="Cash"
                  value={
                    <>
                      <strong>{program.points_per_euro ?? '-'} pts</strong> = 1 €
                    </>
                  }
                  tone="cash"
                />
              </ClickableInfoCard>
            ) : null}

            {hasRewards ? (
              <ClickableInfoCard onClick={() => setActiveInfoCard('rewards')}>
                <CompactMetaToneItem
                  title={`Rewards - ${program.exchange_pack?.name ?? 'Pack'}`}
                  value={
                    program.exchange_pack?.items.length
                      ? (
                          <ul className="space-y-1">
                            {program.exchange_pack.items.map((item) => (
                              <li key={item.id}>
                                {item.title} - <strong>{item.points_cost} pts</strong>
                              </li>
                            ))}
                          </ul>
                        )
                      : (
                          'No reward items configured.'
                        )
                  }
                  tone="reward"
                />
              </ClickableInfoCard>
            ) : null}
          </div>
        ) : null}

        {mode === 'owner' ? (
          <ClickableInfoCard onClick={() => setActiveInfoCard('assignments')}>
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2 transition-colors group-hover:border-solid group-focus-visible:border-solid">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {assignedTotal > 9
                  ? `Assignees - ${assignedTotal}`
                  : `Assignments - ${assignedTotal} agent${assignedTotal === 1 ? '' : 's'}`}
              </p>
              <div className="mt-1.5">
                {assignedTotal === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun agent assigné</p>
                ) : (
                  <AvatarGroup className="min-h-8">
                    {assignmentAvatars.map((agent) => (
                      <Avatar key={agent.agent.id}>
                        <AvatarImage
                          src={agent.agent.avatar_url ?? undefined}
                          alt={agent.agent.display_name ?? agent.agent.email ?? 'Agent'}
                        />
                        <AgentAvatarFallback seed={avatarSeedForUser(agent.agent)} className="text-[10px]">
                          {agentInitials(agent.agent.display_name, agent.agent.email)}
                        </AgentAvatarFallback>
                      </Avatar>
                    ))}
                    {showAssignmentCount ? <AvatarGroupCount>{assignedTotal}</AvatarGroupCount> : null}
                  </AvatarGroup>
                )}
              </div>
            </div>
          </ClickableInfoCard>
        ) : null}

        {mode === 'agent' ? (
          <div className="flex items-center gap-2 py-0.5">
            <Avatar className="size-8 rounded-lg shrink-0">
              <AvatarImage src={program.business_logo_url ?? undefined} alt={program.business_name ?? 'Business'} className="object-contain" />
              <AvatarFallback className="rounded-lg bg-background text-xs font-semibold text-muted-foreground">
                {businessInitials(program.business_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {program.business_name ?? 'Business'}
              </p>
              <p className="text-xs text-muted-foreground">{programTimelineLabel(program)}</p>
            </div>
          </div>
        ) : null}

        <Dialog open={isInfoDialogOpen} onOpenChange={(open) => !open && setActiveInfoCard(null)}>
          <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{activeInfoCard ? infoDialogCopy[activeInfoCard].title : 'Détail du programme'}</DialogTitle>
              <DialogDescription>
                {activeInfoCard ? infoDialogCopy[activeInfoCard].description : 'Informations du programme.'}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {activeInfoCard === 'attribution' ? roleSummary(program) : null}
              {activeInfoCard === 'business' ? (
                <div className="space-y-2">
                  <Item variant="outline">
                    <ItemMedia>
                      <Avatar className="size-10 rounded-md">
                        <AvatarImage src={program.business_logo_url ?? undefined} alt={program.business_name ?? 'Business'} className="object-contain" />
                        <AvatarFallback className="rounded-md text-xs font-semibold">
                          {businessInitials(program.business_name)}
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{program.business_name ?? 'Business inconnu'}</ItemTitle>
                      <ItemDescription>
                        {businessPrograms.length} programme{businessPrograms.length === 1 ? '' : 's'} disponible{businessPrograms.length === 1 ? '' : 's'}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onViewBusinessPrograms?.(program)
                          setActiveInfoCard(null)
                        }}
                      >
                        Voir tous les programmes
                      </Button>
                    </ItemActions>
                  </Item>

                  {businessPrograms.length ? (
                    <div className="space-y-2">
                      {businessPrograms.slice(0, 6).map((businessProgram) => (
                        <Item key={businessProgram.id} variant="outline" size="sm">
                          <ItemContent>
                            <ItemTitle>{businessProgram.name}</ItemTitle>
                            <ItemDescription>
                              <Badge
                                variant="outline"
                                size="xs"
                                className={cn(
                                  'w-fit uppercase tracking-wide',
                                  programStatusBadgeClass(businessProgram.status),
                                )}
                              >
                                {statusLabel[businessProgram.status]}
                              </Badge>
                            </ItemDescription>
                          </ItemContent>
                        </Item>
                      ))}
                      {businessPrograms.length > 6 ? (
                        <p className="text-xs text-muted-foreground">
                          +{businessPrograms.length - 6} programme{businessPrograms.length - 6 === 1 ? '' : 's'} supplémentaire{businessPrograms.length - 6 === 1 ? '' : 's'}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                      Aucun autre programme trouvé pour ce business.
                    </p>
                  )}
                </div>
              ) : null}
              {activeInfoCard === 'points' ? pointsSummary : null}
              {activeInfoCard === 'exchange' ? modeConfig.label : null}
              {activeInfoCard === 'cash' ? (
                <div className="rounded-lg border border-dashed border-emerald-500/35 bg-emerald-500/5 p-3">
                  <p className="app-eyebrow text-emerald-800 dark:text-emerald-300">Cash</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {program.points_per_euro
                      ? `${program.points_per_euro.toLocaleString('fr-FR')} pts = 1 €`
                      : 'Cash non configuré'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Règle utilisée pour convertir les points du programme en euros.
                  </p>
                </div>
              ) : null}
              {false && activeInfoCard === 'cash' ? (
                <>
                  <strong>{program.points_per_euro ?? '-'} pts</strong> = 1 €
                </>
              ) : null}
              {activeInfoCard === 'rewards'
                ? (
                    <div className="space-y-2">
                      <Badge variant="outline" className={cn('font-medium', rewardBadgeClass)}>
                        {program.exchange_pack?.name ?? 'No pack linked'}
                      </Badge>
                      {program.exchange_pack?.items.length ? (
                        <div className="space-y-2">
                          {program.exchange_pack.items.map((item, index) => (
                            <Item key={item.id} variant="outline" size="sm">
                              <ItemMedia>
                                <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                                  {index + 1}
                                </div>
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>{item.title}</ItemTitle>
                                <ItemDescription>
                                  <strong>{item.points_cost} pts</strong>
                                </ItemDescription>
                              </ItemContent>
                            </Item>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                          No reward items configured.
                        </p>
                      )}
                    </div>
                  )
                : null}
              {activeInfoCard === 'assignments'
                ? (
                    <div className="space-y-2">
                      {assignedAgentEntries.length ? (
                        assignedAgentEntries.map((entry) => (
                          <Item key={entry.assignment_id} variant="outline">
                            <ItemMedia>
                              <Avatar className="size-9">
                                <AvatarImage
                                  src={entry.agent.avatar_url ?? undefined}
                                  alt={entry.agent.display_name ?? entry.agent.email ?? 'Agent'}
                                />
                                <AgentAvatarFallback seed={avatarSeedForUser(entry.agent)} className="text-[10px]">
                                  {agentInitials(entry.agent.display_name, entry.agent.email)}
                                </AgentAvatarFallback>
                              </Avatar>
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle>{entry.agent.display_name?.trim() || entry.agent.email || 'Agent'}</ItemTitle>
                              <ItemDescription>
                                Last used program: {entry.assigned_at ? compactDate(entry.assigned_at) : 'Not available'}
                              </ItemDescription>
                            </ItemContent>
                          </Item>
                        ))
                      ) : (
                        <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                          Aucun agent assigné.
                        </p>
                      )}
                    </div>
                  )
                : null}
            </div>

            <DialogFooter>
              {activeInfoCard === 'cash' && mode === 'owner'
                ? withDisabledTooltip(
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canEditCashShortcut}
                      onClick={() => {
                        if (!canEditCashShortcut) return
                        onEditCash?.(program)
                        setActiveInfoCard(null)
                      }}
                    >
                      Modifier le cash
                    </Button>,
                    editCashDisabledReason,
                  )
                : null}
              {activeInfoCard === 'rewards' && mode === 'owner' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canEditRewardsShortcut}
                    onClick={() => {
                      onManageRewards?.(program)
                      setActiveInfoCard(null)
                    }}
                  >
                    Changer le pack
                  </Button>
                  <Button
                    type="button"
                    disabled={!canEditRewardsShortcut || !onEditRewardsPack}
                    onClick={() => {
                      if (!canEditRewardsShortcut || !onEditRewardsPack) return
                      onEditRewardsPack?.(program)
                      setActiveInfoCard(null)
                    }}
                  >
                    Modifier le pack
                  </Button>
                </>
              ) : null}
              {activeInfoCard === 'assignments' && mode === 'owner'
                ? withDisabledTooltip(
                    <Button
                      type="button"
                      disabled={!canAssignAction}
                      onClick={() => {
                        if (!canAssignAction) return
                        onAssignAgents?.(program)
                        setActiveInfoCard(null)
                      }}
                    >
                      Assigner des agents
                    </Button>,
                    assignDisabledReason,
                  )
                : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>

      {isPaused && isRevenueTier ? (
        <p className="px-3 pb-3 text-xs text-amber-700 dark:text-amber-400 sm:px-4">
          Les programmes à paliers CA restent en pause jusqu'à ce que les règles de paliers soient configurées.
        </p>
      ) : null}
      {isSuspended ? (
        <div className="space-y-1.5 px-3 pb-3 text-xs text-amber-800 dark:text-amber-300 sm:px-4">
          {program.suspension_deadline_at ? (
            <SuspensionDeadlineCountdown deadlineIso={program.suspension_deadline_at} />
          ) : null}
          <p>
            Suspendu : mode de clôture progressive. Les nouveaux prospects sont bloqués. Vous pouvez lever la suspension pour revenir à l'état actif, ou archiver le programme après la date limite.
          </p>
        </div>
      ) : null}
    </Card>
  )
}

export function ProgramCardSkeleton() {
  return (
    <Card className="rounded-lg border-0 bg-card shadow-none">
      <div className="flex flex-col gap-1.5 p-3 sm:p-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <Skeleton className="size-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-44 max-w-[75%]" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-64 max-w-[90%]" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      <CardContent className="space-y-2 px-3 pb-3 pt-0 sm:px-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/10 px-3 py-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1.5 h-4 w-32" />
          </div>
          <div className="rounded-lg bg-muted/10 px-3 py-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-1.5 h-4 w-20" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="rounded-lg bg-muted/10 px-3 py-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-1.5 h-4 w-24" />
          </div>
          <div className="rounded-lg bg-muted/10 px-3 py-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-1.5 h-3.5 w-52 max-w-[95%]" />
            <Skeleton className="mt-1 h-3.5 w-48 max-w-[90%]" />
          </div>
        </div>

        <div className="rounded-lg bg-muted/10 px-3 py-2">
          <Skeleton className="h-3 w-36" />
          <div className="mt-1.5 flex items-center gap-1.5">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
