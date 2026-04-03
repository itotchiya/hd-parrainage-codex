import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ExternalLink,
  Gift,
  HandCoins,
  Landmark,
  MoreVertical,
  Package,
  Pause,
  Pencil,
  Play,
  Trash2,
  UserPlus,
  OctagonAlert,
  Undo2,
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
    }
  }
  if (mode === 'cash') {
    return {
      icon: HandCoins,
      tileClass: 'bg-emerald-500 text-white',
    }
  }
  return {
    icon: Gift,
    tileClass: 'bg-amber-500 text-white',
  }
}

const cashBadgeClass =
  'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
const rewardBadgeClass =
  'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-300'

const VISIBLE_AVATARS = 3

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

interface ProgramCardProps {
  program: ProgramRecord
  onEdit?: (program: ProgramRecord) => void
  onTogglePause?: (program: ProgramRecord) => void
  onSuspend?: (program: ProgramRecord) => void
  onArchive?: (program: ProgramRecord) => void
  onAssignAgents?: (program: ProgramRecord) => void
  onDeleteArchived?: (program: ProgramRecord) => void
  /** Clears suspension (same POST /reactivate as resuming from paused). */
  onLiftSuspension?: (program: ProgramRecord) => void
  onActivateDraft?: (program: ProgramRecord) => void
  togglePending?: boolean
}

export function ProgramCard({
  program,
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
  const mode = exchangeModeConfig(program.exchange_mode)
  const pointsLabel =
    program.points_per_transaction === null
      ? 'Not configured'
      : `${program.points_per_transaction.toLocaleString()} pts`

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

  return (
    <Card className="border shadow-none">
      <CardHeader className="gap-1.5 p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <IconTile icon={mode.icon} size="md" className={mode.tileClass} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
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
          </div>
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
                  Modifier cash
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
                  Gerer le pack
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
        </div>
        <CardDescription className="line-clamp-2 text-[11px] leading-relaxed sm:text-xs">
          {program.description ?? 'No description available.'}
        </CardDescription>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          <div>
            <p className="text-xs font-normal text-muted-foreground">Mode d'attribution</p>
            <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground sm:text-sm">
              {roleSummary(program)}
            </p>
          </div>
          <div>
            <p className="text-xs font-normal text-muted-foreground">Points attribués</p>
            <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground sm:text-sm">{pointsLabel}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          'space-y-3 px-3 pb-2.5 sm:px-4 sm:pb-3',
          hasCash || hasRewards ? 'pt-2.5 sm:pt-3' : 'pt-0',
        )}
      >
        {hasCash ? (
          <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={cn('font-medium', cashBadgeClass)}>
                  Voie Cash
                </Badge>
                <span className="text-xs text-muted-foreground">Conversion des points en devise</span>
              </div>
              <Badge variant="secondary" className="font-medium">
                Conversion {program.points_per_euro ?? '—'} pts = 1 EUR
              </Badge>
          </div>
        ) : null}

        {hasRewards ? (
          <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={cn('font-medium', rewardBadgeClass)}>
                  {program.exchange_pack?.name
                    ? `Voie Recompenses - ${program.exchange_pack.name}`
                    : 'Voie Recompenses'}
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

      <CardFooter className="border-t-0 p-3 pt-2 sm:p-4 sm:pt-2">
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
      </CardFooter>

      {isPaused && isRevenueTier ? (
        <p className="px-3 pb-2.5 text-xs text-amber-700 dark:text-amber-400 sm:px-4 sm:pb-3">
          Revenue-tier programs stay paused until tier rules are modeled in the backend.
        </p>
      ) : null}
      {isSuspended ? (
        <div className="space-y-2 px-3 pb-2.5 text-xs text-amber-800 dark:text-amber-300 sm:px-4 sm:pb-3">
          {program.suspension_deadline_at ? (
            <SuspensionDeadlineCountdown deadlineIso={program.suspension_deadline_at} />
          ) : null}
          <p>
            Suspended: wind-down mode. New prospects blocked; you can lift suspension to return to active, or archive
            after the deadline.
          </p>
        </div>
      ) : null}
    </Card>
  )
}
