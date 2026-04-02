import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { programStatusBadgeClass } from '@/features/dashboard/utils/semanticBadges'
import type { ProgramRecord, ProgramStatus } from '@/types/programs'

const statusLabel: Record<ProgramStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  paused: 'Paused',
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

function exchangeSummary(program: ProgramRecord) {
  const base =
    program.exchange_mode === 'both'
      ? 'Rewards + cash'
      : program.exchange_mode === 'reward'
        ? 'Rewards only'
        : 'Cash only'

  if (program.points_per_euro === null || program.exchange_mode === 'reward') {
    return base
  }

  return `${base} / ${program.points_per_euro} pts = 1 EUR`
}

function MiniPanel({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <article className="app-panel-muted">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
    </article>
  )
}

interface ProgramCardProps {
  program: ProgramRecord
  onEdit?: (program: ProgramRecord) => void
  onTogglePause?: (program: ProgramRecord) => void
  togglePending?: boolean
}

export function ProgramCard({ program, onEdit, onTogglePause, togglePending = false }: ProgramCardProps) {
  const canEdit = program.actions.can_update
  const canPause = program.actions.can_pause
  const isPaused = program.status === 'paused'
  const isRevenueTier = program.commission_type === 'revenue-tier'
  const isToggleDisabled = togglePending || (isPaused && isRevenueTier)

  return (
    <article className="app-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {program.business_name ?? 'Business'}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{program.name}</h3>
        </div>
        <Badge variant="outline" className={`uppercase ${programStatusBadgeClass(program.status)}`}>
          {statusLabel[program.status]}
        </Badge>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {program.description ?? 'No description available.'}
      </p>

      <div className="mt-5 app-grid md:grid-cols-2">
        <MiniPanel
          label="Earning rule"
          value={roleSummary(program)}
          meta={`Rule v${program.rule_version}`}
        />
        <MiniPanel
          label="Exchange mode"
          value={exchangeSummary(program)}
          meta={`Pack: ${program.exchange_pack?.name ?? 'None'}`}
        />
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/15 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Eligibility
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {program.eligibility_criteria ?? 'No eligibility rules defined.'}
        </p>
      </div>

      {program.exchange_pack?.items.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {program.exchange_pack.items.map((item) => (
            <Badge key={item.id} variant="outline" className="border-border/60 bg-muted/10 text-foreground">
              {item.title} / {item.points_cost} pts
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Assigned agents: {program.assigned_agents_count ?? 0}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/programs/${program.id}`}>Open</Link>
          </Button>
          {canEdit && onEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(program)}>
              Edit
            </Button>
          ) : null}
          {canPause && onTogglePause ? (
            <Button
              type="button"
              size="sm"
              onClick={() => onTogglePause(program)}
              disabled={isToggleDisabled}
            >
              {isPaused ? 'Reactivate' : 'Pause'}
            </Button>
          ) : null}
        </div>
      </div>

      {isPaused && isRevenueTier ? (
        <p className="mt-4 text-sm text-amber-700">
          Revenue-tier programs stay paused until tier rules are modeled in the backend.
        </p>
      ) : null}
    </article>
  )
}

