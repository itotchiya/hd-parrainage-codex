import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { formatDashboardDateFr } from '../utils/semanticBadges'
import type { ProspectRecord } from '@/types/prospects'

// ---------------------------------------------------------------------------
// Badge styling helpers
// ---------------------------------------------------------------------------

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  suspect: 'Suspect',
  prospect_froid: 'Froid',
  prospect_tiede: 'Tiède',
  prospect_chaud: 'Chaud',
}

function pipelineStageBadgeClass(stage: string): string {
  switch (stage) {
    case 'prospect_chaud':
      return 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    case 'prospect_tiede':
      return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
    case 'prospect_froid':
      return 'border-transparent bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300'
    default:
      return 'border-transparent bg-muted text-muted-foreground'
  }
}

const CONVERSION_STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  converted: 'Converti',
  lost: 'Perdu',
  locked: 'Verrouillé',
}

function conversionStatusBadgeClass(status: string): string {
  switch (status) {
    case 'converted':
      return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'lost':
      return 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    case 'locked':
      return 'border-transparent bg-violet-500/15 text-violet-900 dark:bg-violet-500/20 dark:text-violet-300'
    default:
      return 'border-transparent bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300'
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AgentRecentProspectsTableProps {
  prospects: ProspectRecord[]
}

export function AgentRecentProspectsTable({ prospects }: AgentRecentProspectsTableProps) {
  const headerActions = (
    <Button asChild variant="ghost" size="sm" className="gap-1.5">
      <Link to="/prospects">
        Voir tous mes prospects
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Button>
  )

  return (
    <>
      <DashboardSectionHeader title="Mes derniers prospects" actions={headerActions} />

      {prospects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
          Aucun prospect soumis pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden sm:table-cell">Entreprise</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Conversion</TableHead>
                <TableHead className="hidden md:table-cell">Soumis le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prospects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{p.contact_name}</p>
                      <p className="truncate text-xs text-muted-foreground sm:hidden">
                        {p.company_name ?? '—'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-[10rem] truncate text-muted-foreground sm:table-cell">
                    {p.company_name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={pipelineStageBadgeClass(p.pipeline_stage)}>
                      {PIPELINE_STAGE_LABELS[p.pipeline_stage] ?? p.pipeline_stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={conversionStatusBadgeClass(p.conversion_status)}>
                      {CONVERSION_STATUS_LABELS[p.conversion_status] ?? p.conversion_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDashboardDateFr(p.submitted_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function AgentRecentProspectsTableSkeleton() {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="overflow-x-auto rounded-lg bg-muted/10">
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-[1.3fr_1.1fr_110px_110px_100px] gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1.3fr_1.1fr_110px_110px_100px] gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
