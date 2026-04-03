import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  Building2,
  CirclePlus,
  ExternalLink,
  Gift,
  HandCoins,
  Landmark,
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

import {
  AgentAvatarFallback,
  Avatar,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import { avatarSeedForUser } from '@/lib/avatar-fallback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IconTile } from '@/components/ui/icon-tile'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { programStatusBadgeClass } from '@/features/dashboard/utils/semanticBadges'
import type { AssignedAgent, ProgramRecord, ProgramStatus } from '@/types/programs'
import { SuspensionDeadlineCountdown } from './SuspensionDeadlineCountdown'

const statusLabel: Record<ProgramStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  paused: 'Paused',
  suspended: 'Suspended',
  archived: 'Archived',
}

const cashBadgeClass =
  'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
const rewardBadgeClass =
  'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-300'
const VISIBLE_AVATARS = 3

export type ProgramCardMode = 'owner' | 'agent'

function roleSummary(program: ProgramRecord) {
  if (program.commission_type === 'per-transaction') {
    return program.points_per_transaction === null
      ? 'Per transaction'
      : `${program.points_per_transaction.toLocaleString()} pts / transaction`
  }

  return 'Revenue tier'
}

function exchangeModeConfig(mode: ProgramRecord['exchange_mode']) {
  if (mode === 'both') {
    return {
      icon: Landmark,
      tileClass: 'bg-blue-500 text-white',
      label: 'Rewards + cash',
    }
  }
  if (mode === 'cash') {
    return {
      icon: HandCoins,
      tileClass: 'bg-emerald-500 text-white',
      label: 'Cash only',
    }
  }
  return {
    icon: Gift,
    tileClass: 'bg-amber-500 text-white',
    label: 'Rewards only',
  }
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

function agentAvailability(program: ProgramRecord, canSubmitProspect: boolean) {
  if (!canSubmitProspect) {
    return {
      label: 'Read only',
      toneClass: 'border-border bg-muted/40 text-muted-foreground',
      helper: 'Prospect submission is not enabled for this workspace.',
    }
  }

  if (program.status === 'active') {
    return {
      label: 'Ready for prospects',
      toneClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      helper: 'You can open the program or submit a new prospect immediately.',
    }
  }

  if (program.status === 'paused') {
    return {
      label: 'Temporarily paused',
      toneClass: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      helper: 'Review the program details. New prospect intake is paused for now.',
    }
  }

  if (program.status === 'suspended') {
    return {
      label: 'Intake blocked',
      toneClass: 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300',
      helper: 'The owner is winding this program down. New prospects are blocked.',
    }
  }

  return {
    label: 'Unavailable',
    toneClass: 'border-border bg-muted/40 text-muted-foreground',
    helper: 'This program is not currently open for new submissions.',
  }
}

function compactDate(value: string | null | undefined) {
  if (!value) return 'Not started'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

interface ProgramCardProps {
  program: ProgramRecord
  mode?: ProgramCardMode
  canSubmitProspect?: boolean
  prospectCreateHref?: string
  onEdit?: (program: ProgramRecord) => void
  onTogglePause?: (program: ProgramRecord) => void
  onSuspend?: (program: ProgramRecord) => void
  onArchive?: (program: ProgramRecord) => void
  onAssignAgents?: (program: ProgramRecord) => void
  onDeleteArchived?: (program: ProgramRecord) => void
  onLiftSuspension?: (program: ProgramRecord) => void
  onActivateDraft?: (program: ProgramRecord) => void
  togglePending?: boolean
}

export function ProgramCard({
  program,
  mode = 'owner',
  canSubmitProspect = false,
  prospectCreateHref,
  onEdit,
  onTogglePause,
  onSuspend,
  onArchive,
  onAssignAgents,
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
  const pointsLabel =
    program.points_per_transaction === null
      ? 'Not configured'
      : `${program.points_per_transaction.toLocaleString()} pts`
  const availability = agentAvailability(program, canSubmitProspect)

  const [agentsDialogOpen, setAgentsDialogOpen] = useState(false)

  const assignedAgents = useMemo(() => {
    const rows: AssignedAgent[] = program.assigned_agents ?? []
    return rows.map((row) => row.agent).filter((a): a is NonNullable<typeof a> => a !== null)
  }, [program.assigned_agents])

  const assignedTotal = program.assigned_agents_count ?? assignedAgents.length
  const avatarPreview = assignedAgents.slice(0, VISIBLE_AVATARS)
  const showTotalInFourthCircle = assignedTotal > VISIBLE_AVATARS

  const canEditGeneral = Boolean(canEdit && onEdit)
  const canEditCashShortcut = Boolean(hasCash && program.actions.can_edit_cash && onEdit)
  const canEditRewardsShortcut = Boolean(hasRewards && program.actions.can_edit_rewards && onEdit)
  const canTogglePauseAction = Boolean((canPause || canReactivate) && onTogglePause)
  const pauseDisabled = !canTogglePauseAction || isToggleDisabled
  const canSuspendAction = Boolean(canSuspend && onSuspend)
  const canLiftSuspensionAction = Boolean(canLiftSuspension && onLiftSuspension)
  const canArchiveAction = Boolean(canArchive && onArchive)
  const canAssignAction = Boolean(
    canAssignAgent && onAssignAgents && !isSuspended && program.status !== 'archived',
  )
  const canDeleteAction = Boolean(canSoftDelete && onDeleteArchived)
  const hasManagementActions =
    canEditGeneral ||
    canEditCashShortcut ||
    canEditRewardsShortcut ||
    canActivateProgram ||
    canTogglePauseAction ||
    canSuspendAction ||
    canLiftSuspensionAction ||
    canArchiveAction ||
    canAssignAction ||
    canDeleteAction
  const canCreateProspect = Boolean(prospectCreateHref && canSubmitProspect && program.status === 'active')

  return (
    <Card className="border shadow-none">
      <CardHeader className="gap-3 p-4">
        <div className="flex min-w-0 items-start gap-3">
          {mode === 'agent' ? (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/30 text-sm font-semibold text-foreground">
              {businessInitials(program.business_name)}
            </div>
          ) : (
            <IconTile icon={modeConfig.icon} size="md" className={modeConfig.tileClass} />
          )}

          <div className="min-w-0 flex-1">
            {mode === 'agent' ? (
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {program.business_name ?? 'Business'}
              </p>
            ) : null}

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <CardTitle className="truncate text-sm font-semibold leading-tight sm:text-base">
                {program.name}
              </CardTitle>
              <Badge
                variant="outline"
                size="xs"
                className={cn(
                  'shrink-0 uppercase tracking-wide',
                  programStatusBadgeClass(program.status),
                )}
              >
                {statusLabel[program.status]}
              </Badge>
            </div>

            {mode === 'agent' ? (
              <CardDescription className="mt-1.5 text-xs leading-relaxed">
                {availability.helper}
              </CardDescription>
            ) : (
              <CardDescription className="mt-1.5 line-clamp-2 text-xs leading-relaxed">
                {program.description ?? 'No description available.'}
              </CardDescription>
            )}
          </div>

          {mode === 'owner' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Program actions"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to={`/programs/${program.id}`} className="flex cursor-pointer items-center gap-2">
                    <ExternalLink className="size-4" />
                    Open program
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canEditGeneral}
                  onSelect={() => {
                    if (canEditGeneral) onEdit!(program)
                  }}
                >
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                {hasCash ? (
                  <DropdownMenuItem
                    disabled={!canEditCashShortcut}
                    onSelect={() => {
                      if (canEditCashShortcut) onEdit!(program)
                    }}
                  >
                    <HandCoins className="size-4" />
                    Edit cash
                  </DropdownMenuItem>
                ) : null}
                {hasRewards ? (
                  <DropdownMenuItem
                    disabled={!canEditRewardsShortcut}
                    onSelect={() => {
                      if (canEditRewardsShortcut) onEdit!(program)
                    }}
                  >
                    <Package className="size-4" />
                    Manage reward pack
                  </DropdownMenuItem>
                ) : null}
                {isDraft && program.actions.can_update ? (
                  <DropdownMenuItem
                    disabled={!canActivateProgram}
                    onSelect={() => {
                      if (canActivateProgram) onActivateDraft!(program)
                    }}
                  >
                    <Zap className="size-4" />
                    Activate program
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                {isSuspended ? (
                  <DropdownMenuItem
                    disabled={!canLiftSuspensionAction}
                    onSelect={() => {
                      if (canLiftSuspensionAction) onLiftSuspension!(program)
                    }}
                  >
                    <Undo2 className="size-4" />
                    Lift suspension
                  </DropdownMenuItem>
                ) : !isDraft ? (
                  <>
                    <DropdownMenuItem
                      disabled={pauseDisabled}
                      onSelect={() => {
                        if (!pauseDisabled && onTogglePause) onTogglePause(program)
                      }}
                    >
                      {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                      {isPaused ? 'Reactivate' : 'Pause'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canSuspendAction}
                      onSelect={() => {
                        if (canSuspendAction) onSuspend!(program)
                      }}
                    >
                      <OctagonAlert className="size-4" />
                      Suspend
                    </DropdownMenuItem>
                  </>
                ) : null}
                <DropdownMenuItem
                  disabled={!canArchiveAction}
                  onSelect={() => {
                    if (canArchiveAction) onArchive!(program)
                  }}
                >
                  <Archive className="size-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canAssignAction}
                  onSelect={() => {
                    if (canAssignAction) onAssignAgents!(program)
                  }}
                >
                  <UserPlus className="size-4" />
                  Assign agents
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!canDeleteAction}
                  onSelect={() => {
                    if (canDeleteAction) onDeleteArchived!(program)
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {mode === 'agent' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('font-medium', availability.toneClass)}>
              {availability.label}
            </Badge>
            <Badge variant="secondary" className="font-medium">
              {modeConfig.label}
            </Badge>
          </div>
        ) : null}

        <div className="grid gap-2.5 sm:grid-cols-3">
          {mode === 'agent' ? (
            <>
              <StatTile
                label="Business"
                value={program.business_name ?? 'Unknown'}
                hint="Tenant attached to this assignment"
              />
              <StatTile
                label="Points rule"
                value={roleSummary(program)}
                hint={program.points_per_transaction === null ? 'Configured by revenue tiers' : 'Awarded on each validated transaction'}
              />
              <StatTile
                label="Availability"
                value={program.status === 'active' ? 'Open now' : statusLabel[program.status]}
                hint={hasCash ? `${program.points_per_euro ?? '-'} pts / EUR` : 'Reward-only exchange'}
              />
            </>
          ) : (
            <>
              <StatTile
                label="Attribution"
                value={roleSummary(program)}
                hint={isRevenueTier ? 'Tier rules stay owner-managed' : 'Fixed earning rule'}
              />
              <StatTile
                label="Points"
                value={pointsLabel}
                hint={hasCash ? `${program.points_per_euro ?? '-'} pts / EUR cash rule` : 'No cash conversion'}
              />
              <StatTile
                label="Agents"
                value={assignedTotal === 0 ? 'None' : `${assignedTotal}`}
                hint={program.has_open_prospects ? 'Open prospects are still active' : 'No open prospect lock'}
              />
            </>
          )}
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          'space-y-3 px-4 pb-3',
          hasCash || hasRewards ? 'pt-1' : 'pt-0',
        )}
      >
        {hasCash ? (
          <div className="min-w-0 space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn('font-medium', cashBadgeClass)}>
                Cash path
              </Badge>
              <span className="text-xs text-muted-foreground">
                Convert points into currency
              </span>
            </div>
            <Badge variant="secondary" className="font-medium">
              {program.points_per_euro ?? '-'} pts = 1 EUR
            </Badge>
          </div>
        ) : null}

        {hasRewards ? (
          <div className="min-w-0 space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn('font-medium', rewardBadgeClass)}>
                {program.exchange_pack?.name
                  ? `Reward pack - ${program.exchange_pack.name}`
                  : 'Reward path'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {program.exchange_pack?.items.length ? (
                program.exchange_pack.items.map((item) => (
                  <Badge key={item.id} variant="secondary" className="font-normal">
                    {item.title} - {item.points_cost} pts
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No reward pack items configured.</p>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border/60 p-4">
        {mode === 'agent' ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gap-2">
                <Link to={`/programs/${program.id}`}>
                  Open program
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              {canCreateProspect ? (
                <Button asChild variant="outline" className="gap-2">
                  <Link to={prospectCreateHref!}>
                    <CirclePlus className="size-4" />
                    Add prospect
                  </Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" className="gap-2" disabled>
                  <CirclePlus className="size-4" />
                  Add prospect
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-background text-muted-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {program.business_name ?? 'Business'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Activated {compactDate(program.activated_at ?? program.created_at)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex min-h-8 items-center">
              {assignedTotal === 0 ? (
                <span className="text-xs text-muted-foreground">No agents assigned</span>
              ) : (
                <Dialog open={agentsDialogOpen} onOpenChange={setAgentsDialogOpen}>
                  <button
                    type="button"
                    className="rounded-md outline-none ring-offset-background transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`View ${assignedTotal} assigned agent${assignedTotal === 1 ? '' : 's'}`}
                    onClick={() => setAgentsDialogOpen(true)}
                  >
                    <AvatarGroup>
                      {avatarPreview.map((agent) => (
                        <Avatar key={agent.id}>
                          <AvatarImage
                            src={agent.avatar_url ?? undefined}
                            alt={agent.display_name ?? agent.email ?? 'Agent'}
                          />
                          <AgentAvatarFallback
                            seed={avatarSeedForUser(agent)}
                            className="text-[10px]"
                          >
                            {agentInitials(agent.display_name, agent.email)}
                          </AgentAvatarFallback>
                        </Avatar>
                      ))}
                      {showTotalInFourthCircle ? (
                        <AvatarGroupCount>{assignedTotal}</AvatarGroupCount>
                      ) : null}
                    </AvatarGroup>
                  </button>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Assigned agents</DialogTitle>
                      <DialogDescription>
                        {assignedTotal} agent{assignedTotal === 1 ? '' : 's'} on "{program.name}"
                      </DialogDescription>
                    </DialogHeader>
                    <ul className="max-h-[min(50vh,320px)] space-y-2 overflow-y-auto pr-1">
                      {assignedAgents.map((agent) => (
                        <li
                          key={agent.id}
                          className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                        >
                          <Avatar className="size-9">
                            <AvatarImage
                              src={agent.avatar_url ?? undefined}
                              alt={agent.display_name ?? agent.email ?? 'Agent'}
                            />
                            <AgentAvatarFallback seed={avatarSeedForUser(agent)} className="text-xs">
                              {agentInitials(agent.display_name, agent.email)}
                            </AgentAvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {agent.display_name?.trim() || 'Agent'}
                            </p>
                            {agent.email ? (
                              <p className="truncate text-xs text-muted-foreground">{agent.email}</p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="gap-2">
                <Link to={`/programs/${program.id}`}>
                  <ExternalLink className="size-4" />
                  Open program
                </Link>
              </Button>
              {canAssignAction ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => onAssignAgents?.(program)}
                >
                  <UserPlus className="size-4" />
                  Assign agents
                </Button>
              ) : null}
              {!hasManagementActions ? (
                <Badge variant="secondary" className="font-medium">
                  Read only
                </Badge>
              ) : null}
            </div>
          </>
        )}
      </CardFooter>

      {isPaused && isRevenueTier ? (
        <p className="px-4 pb-3 text-xs text-amber-700 dark:text-amber-400">
          Revenue-tier programs stay paused until tier rules are modeled in the backend.
        </p>
      ) : null}
      {isSuspended ? (
        <div className="space-y-2 px-4 pb-3 text-xs text-amber-800 dark:text-amber-300">
          {program.suspension_deadline_at ? (
            <SuspensionDeadlineCountdown deadlineIso={program.suspension_deadline_at} />
          ) : null}
          <p>
            Suspended: wind-down mode. New prospects blocked; you can lift suspension to return to
            active, or archive after the deadline.
          </p>
        </div>
      ) : null}
    </Card>
  )
}
