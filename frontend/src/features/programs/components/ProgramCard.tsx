import { type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { getAppLocale } from '@/lib/locale'
import { programStatusBadgeClass } from '@/features/dashboard/utils/semanticBadges'
import type { ProgramRecord, ProgramStatus } from '@/types/programs'
import { SuspensionDeadlineCountdown } from './SuspensionDeadlineCountdown'

function statusLabel(status: ProgramStatus, t: (key: string) => string): string {
  const key: Record<ProgramStatus, string> = {
    active: 'programs.status.active',
    draft: 'programs.status.draft',
    paused: 'programs.status.paused',
    suspended: 'programs.status.suspended',
    archived: 'programs.status.archived',
  }

  return t(key[status])
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

function roleSummary(
  program: ProgramRecord,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string,
) {
  if (program.commission_type === 'per-transaction') {
    return program.points_per_transaction === null
      ? t('programs.card.roleSummary.perTransactionFallback')
      : t('programs.card.roleSummary.perTransactionValue', {
          count: program.points_per_transaction.toLocaleString(locale),
        })
  }

  return t('programs.card.roleSummary.revenueTier')
}

function exchangeModeConfig(
  mode: ProgramRecord['exchange_mode'],
  t: (key: string) => string,
) {
  if (mode === 'both') {
    return {
      icon: Briefcase,
      tileClass: 'bg-blue-500 text-white',
      label: t('programs.card.exchangeMode.both'),
      badgeClass: 'border-blue-500/25 bg-blue-500/10 text-blue-800 dark:text-blue-300',
    }
  }
  if (mode === 'cash') {
    return {
      icon: HandCoins,
      tileClass: 'bg-emerald-500 text-white',
      label: t('programs.card.exchangeMode.cash'),
      badgeClass: cashBadgeClass,
    }
  }
  return {
    icon: Gift,
    tileClass: 'bg-amber-500 text-white',
    label: t('programs.card.exchangeMode.reward'),
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

function agentAvailability(
  program: ProgramRecord,
  canSubmitProspect: boolean,
  t: (key: string) => string,
) {
  if (!canSubmitProspect) {
    return {
      label: t('programs.card.availability.readOnly'),
      toneClass: 'border-border bg-muted/40 text-muted-foreground',
      helper: t('programs.card.availability.readOnlyHelp'),
    }
  }

  if (program.status === 'active') {
    return {
      label: t('programs.card.availability.ready'),
      toneClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      helper: t('programs.card.availability.readyHelp'),
    }
  }

  if (program.status === 'paused') {
    return {
      label: t('programs.card.availability.paused'),
      toneClass: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      helper: t('programs.card.availability.pausedHelp'),
    }
  }

  if (program.status === 'suspended') {
    return {
      label: t('programs.card.availability.blocked'),
      toneClass: 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300',
      helper: t('programs.card.availability.blockedHelp'),
    }
  }

  return {
    label: t('programs.card.availability.unavailable'),
    toneClass: 'border-border bg-muted/40 text-muted-foreground',
    helper: t('programs.card.availability.unavailableHelp'),
  }
}

function compactDate(
  value: string | null | undefined,
  locale: string,
  t: (key: string) => string,
) {
  if (!value) return t('programs.card.timeline.notStarted')
  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function programTimelineLabel(
  program: ProgramRecord,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (program.status === 'suspended') {
    return t('programs.card.timeline.suspended', {
      date: compactDate(program.suspended_at, locale, t),
    })
  }
  if (program.status === 'paused') {
    return t('programs.card.timeline.paused', {
      date: compactDate(program.paused_at, locale, t),
    })
  }
  if (program.status === 'active') {
    return t('programs.card.timeline.active', {
      date: compactDate(program.activated_at ?? program.created_at, locale, t),
    })
  }
  if (program.status === 'archived') {
    return t('programs.card.timeline.archived', {
      date: compactDate(program.updated_at, locale, t),
    })
  }
  return t('programs.card.timeline.created', {
    date: compactDate(program.created_at, locale, t),
  })
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
  const { t } = useTranslation()
  const locale = getAppLocale()
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
  const modeConfig = exchangeModeConfig(program.exchange_mode, t)
  const availability = agentAvailability(program, canSubmitProspect, t)

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
      ? t('programs.card.points.toConfigure')
      : `${program.points_per_transaction.toLocaleString(locale)} ${t('common.pts')}`
  const isInfoDialogOpen = activeInfoCard !== null
  const editDisabledReason = canEditGeneral
    ? null
    : program.status === 'archived'
      ? t('programs.card.tooltip.editDisabledArchived')
      : assignedTotal > 0
        ? t('programs.card.tooltip.editDisabledAssigned')
        : t('programs.card.tooltip.editDisabledFallback')
  const editCashDisabledReason = canEditCashShortcut
    ? null
    : !hasCash
      ? t('programs.card.tooltip.editCashDisabledNoCash')
      : program.status === 'archived'
        ? t('programs.card.tooltip.editCashDisabledArchived')
        : assignedTotal > 0
          ? t('programs.card.tooltip.editCashDisabledAssigned')
          : t('programs.card.tooltip.editCashDisabledFallback')
  const editRewardsDisabledReason = canEditRewardsShortcut
    ? null
    : !hasRewards
      ? t('programs.card.tooltip.editRewardsDisabledNoRewards')
      : program.status === 'archived'
        ? t('programs.card.tooltip.editRewardsDisabledArchived')
        : t('programs.card.tooltip.editRewardsDisabledFallback')
  const activateDisabledReason = canActivateProgram
    ? null
    : program.status !== 'draft'
      ? t('programs.card.tooltip.activateDisabledNotDraft')
      : t('programs.card.tooltip.activateDisabledFallback')
  const liftSuspensionDisabledReason = canLiftSuspensionAction
    ? null
    : program.status !== 'suspended'
      ? t('programs.card.tooltip.liftSuspensionDisabledNotSuspended')
      : t('programs.card.tooltip.liftSuspensionDisabledFallback')
  const pauseDisabledReason = pauseDisabled
    ? togglePending
      ? t('programs.card.tooltip.pauseDisabledPending')
      : isPaused && isRevenueTier
        ? t('programs.card.tooltip.pauseDisabledRevenueTier')
        : isPaused
          ? t('programs.card.tooltip.pauseDisabledReactivate')
          : t('programs.card.tooltip.pauseDisabledPause')
    : null
  const suspendDisabledReason = canSuspendAction
    ? null
    : program.status !== 'active' && program.status !== 'paused'
      ? t('programs.card.tooltip.suspendDisabledNotActive')
      : program.has_open_prospects
        ? t('programs.card.tooltip.suspendDisabledOpenProspects')
        : t('programs.card.tooltip.suspendDisabledFallback')
  const archiveDisabledReason = canArchiveAction
    ? null
    : program.status !== 'suspended'
      ? t('programs.card.tooltip.archiveDisabledNotSuspended')
      : !program.suspension_deadline_at
        ? t('programs.card.tooltip.archiveDisabledNoDeadline')
        : t('programs.card.tooltip.archiveDisabledFallback')
  const assignDisabledReason = canAssignAction
    ? null
    : isSuspended || program.status === 'archived'
      ? t('programs.card.tooltip.assignDisabledBlocked')
      : t('programs.card.tooltip.assignDisabledFallback')
  const deleteDisabledReason = canDeleteAction
    ? null
    : program.status === 'archived'
      ? t('programs.card.tooltip.deleteDisabledArchived')
      : assignedTotal > 0
        ? t('programs.card.tooltip.deleteDisabledAssigned')
        : t('programs.card.tooltip.deleteDisabledFallback')
  const addProspectDisabledReason = canCreateProspect
    ? null
    : !canSubmitProspect
      ? t('programs.card.tooltip.addProspectDisabledNoPermission')
      : program.status !== 'active'
        ? t('programs.card.tooltip.addProspectDisabledNotActive')
        : t('programs.card.tooltip.addProspectDisabledFallback')

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

  const infoDialogCopy: Record<ProgramInfoCardKey, { title: string; description: string }> = {
    business: {
      title: t('programs.card.businessScope.title'),
      description:
        mode === 'agent'
          ? t('programs.card.businessScope.descriptionAgent')
          : t('programs.card.businessScope.descriptionOwner'),
    },
    attribution: {
      title: t('programs.card.info.attributionTitle'),
      description:
        mode === 'owner'
          ? t('programs.card.info.attributionDescriptionOwner')
          : t('programs.card.info.attributionDescriptionAgent'),
    },
    points: {
      title: t('programs.card.info.pointsTitle'),
      description:
        mode === 'owner'
          ? t('programs.card.info.pointsDescriptionOwner')
          : t('programs.card.info.pointsDescriptionAgent'),
    },
    exchange: {
      title: t('programs.card.info.exchangeTitle'),
      description:
        mode === 'agent'
          ? t('programs.card.info.exchangeDescriptionAgent')
          : t('programs.card.info.exchangeDescriptionOwner'),
    },
    cash: {
      title: t('programs.card.info.cashTitle'),
      description:
        mode === 'owner'
          ? t('programs.card.info.cashDescriptionOwner')
          : t('programs.card.info.cashDescriptionAgent'),
    },
    rewards: {
      title: t('programs.card.info.rewardsTitle'),
      description:
        mode === 'owner'
          ? t('programs.card.info.rewardsDescriptionOwner')
          : t('programs.card.info.rewardsDescriptionAgent'),
    },
    assignments: {
      title: t('programs.card.info.assignmentsTitle'),
      description:
        mode === 'owner'
          ? t('programs.card.info.assignmentsDescriptionOwner')
          : t('programs.card.info.assignmentsDescriptionAgent'),
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
                {statusLabel(program.status, t)}
                </Badge>
              }
              description={
                mode === 'agent'
                  ? availability.helper
                  : program.description ?? t('programs.card.noDescription')
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
                aria-label={t('programs.card.actionsLabel')}
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
                        {t('programs.card.viewProgram')}
                      </Link>
                    </DropdownMenuItem>
                    {withDisabledTooltip(
                      <DropdownMenuItem
                        disabled={!canCreateProspect}
                        onClick={() => { if (canCreateProspect) onAddProspect?.(program) }}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Zap className="size-4" />
                        {t('programs.card.addProspect')}
                      </DropdownMenuItem>,
                      addProspectDisabledReason,
                    )}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to={`/programs/${program.id}`} className="flex cursor-pointer items-center gap-2">
                        <ExternalLink className="size-4" />
                        {t('programs.card.viewProgram')}
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
                        {t('programs.card.edit')}
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
                            {t('programs.card.editCash')}
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
                            {t('programs.card.manageRewards')}
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
                            {t('programs.card.activate')}
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
                          {t('programs.card.liftSuspension')}
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
                            {isPaused ? t('programs.card.reactivate') : t('programs.card.pause')}
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
                            {t('programs.card.suspend')}
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
                        {t('programs.card.archive')}
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
                        {t('programs.card.assignAgents')}
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
                        {t('programs.card.delete')}
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
                <CompactMetaItem
                  label={t('programs.card.meta.business')}
                  value={program.business_name ?? t('programs.card.businessScope.unknown')}
                />
              </ClickableInfoCard>
              <ClickableInfoCard onClick={() => setActiveInfoCard('points')}>
                <CompactMetaItem label={t('programs.card.meta.points')} value={pointsSummary} />
              </ClickableInfoCard>
              <ClickableInfoCard onClick={() => setActiveInfoCard('exchange')}>
                <CompactMetaItem label={t('programs.card.meta.exchange')} value={modeConfig.label} />
              </ClickableInfoCard>
            </>
          ) : (
            <>
              <ClickableInfoCard onClick={() => setActiveInfoCard('attribution')}>
                <CompactMetaItem
                  label={t('programs.card.meta.attribution')}
                  value={roleSummary(program, t, locale)}
                />
              </ClickableInfoCard>
              <ClickableInfoCard onClick={() => setActiveInfoCard('points')}>
                <CompactMetaItem label={t('programs.card.meta.points')} value={pointsSummary} />
              </ClickableInfoCard>
            </>
          )}
        </div>

        {hasCash || hasRewards ? (
          <div className="grid gap-2">
            {hasCash ? (
              <ClickableInfoCard onClick={() => setActiveInfoCard('cash')}>
                <CompactMetaToneItem
                  title={t('programs.card.meta.cash')}
                  value={
                    <>
                      <strong>{program.points_per_euro?.toLocaleString(locale) ?? '-'}</strong> {t('common.pts')} = 1 EUR
                    </>
                  }
                  tone="cash"
                />
              </ClickableInfoCard>
            ) : null}

            {hasRewards ? (
              <ClickableInfoCard onClick={() => setActiveInfoCard('rewards')}>
                <CompactMetaToneItem
                  title={t('programs.card.meta.rewards', {
                    name: program.exchange_pack?.name ?? t('programs.card.meta.defaultPack'),
                  })}
                  value={
                    program.exchange_pack?.items.length
                      ? (
                          <ul className="space-y-1">
                            {program.exchange_pack.items.map((item) => (
                              <li key={item.id}>
                                {t('programs.card.rewards.itemCost', {
                                  title: item.title,
                                  count: item.points_cost.toLocaleString(locale),
                                })}
                              </li>
                            ))}
                          </ul>
                        )
                      : (
                          t('programs.card.rewards.noItems')
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
                  ? t('programs.card.assignments.assignees', { count: assignedTotal })
                  : t('programs.card.assignments.summary', { count: assignedTotal })}
              </p>
              <div className="mt-1.5">
                {assignedTotal === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('programs.card.assignments.none')}</p>
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
                {program.business_name ?? t('programs.card.businessScope.unknown')}
              </p>
              <p className="text-xs text-muted-foreground">{programTimelineLabel(program, locale, t)}</p>
            </div>
          </div>
        ) : null}

        <Dialog open={isInfoDialogOpen} onOpenChange={(open) => !open && setActiveInfoCard(null)}>
          <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {activeInfoCard
                  ? infoDialogCopy[activeInfoCard].title
                  : t('programs.card.info.programDetailFallbackTitle')}
              </DialogTitle>
              <DialogDescription>
                {activeInfoCard
                  ? infoDialogCopy[activeInfoCard].description
                  : t('programs.card.info.programDetailFallbackDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {activeInfoCard === 'attribution' ? roleSummary(program, t, locale) : null}
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
                      <ItemTitle>{program.business_name ?? t('programs.card.businessScope.unknown')}</ItemTitle>
                      <ItemDescription>
                        {t('programs.card.businessScope.availablePrograms', {
                          count: businessPrograms.length,
                        })}
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
                        {t('programs.card.businessScope.viewAll')}
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
                                {statusLabel(businessProgram.status, t)}
                              </Badge>
                            </ItemDescription>
                          </ItemContent>
                        </Item>
                      ))}
                      {businessPrograms.length > 6 ? (
                        <p className="text-xs text-muted-foreground">
                          {t('programs.card.businessScope.additionalPrograms', {
                            count: businessPrograms.length - 6,
                          })}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                      {t('programs.card.businessScope.noOtherPrograms')}
                    </p>
                  )}
                </div>
              ) : null}
              {activeInfoCard === 'points' ? pointsSummary : null}
              {activeInfoCard === 'exchange' ? modeConfig.label : null}
              {activeInfoCard === 'cash' ? (
                <div className="rounded-lg border border-dashed border-emerald-500/35 bg-emerald-500/5 p-3">
                  <p className="app-eyebrow text-emerald-800 dark:text-emerald-300">{t('programs.card.meta.cash')}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {program.points_per_euro
                      ? t('programs.card.cash.rate', {
                          points: program.points_per_euro.toLocaleString(locale),
                        })
                      : t('programs.card.cash.notConfigured')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('programs.card.cash.helper')}
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
                        {program.exchange_pack?.name ?? t('programs.detail.exchangeConfig.noPackLinked')}
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
                                  {t('programs.card.rewards.itemCost', { points: item.points_cost })}
                                </ItemDescription>
                              </ItemContent>
                            </Item>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                          {t('programs.card.rewards.noItems')}
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
                                {t('programs.card.assignments.lastUsedProgram', {
                                  date: entry.assigned_at
                                    ? compactDate(entry.assigned_at, locale, t)
                                    : t('common.notAvailable'),
                                })}
                              </ItemDescription>
                            </ItemContent>
                          </Item>
                        ))
                      ) : (
                        <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                          {t('programs.card.assignments.none')}
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
                      {t('programs.card.dialog.editCash')}
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
                    {t('programs.card.dialog.changePack')}
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
                    {t('programs.card.dialog.editPack')}
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
                      {t('programs.card.actions.assignAgents')}
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
          {t('programs.card.revenueTierPauseNotice')}
        </p>
      ) : null}
      {isSuspended ? (
        <div className="space-y-1.5 px-3 pb-3 text-xs text-amber-800 dark:text-amber-300 sm:px-4">
          {program.suspension_deadline_at ? (
            <SuspensionDeadlineCountdown deadlineIso={program.suspension_deadline_at} />
          ) : null}
          <p>
            {t('programs.card.suspension.notice')}
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

