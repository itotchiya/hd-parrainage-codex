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
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { programStatusBadgeClass } from '../utils/semanticBadges'
import type { ProgramRecord } from '@/types/programs'

function commissionLabel(type: ProgramRecord['commission_type']) {
  return type === 'per-transaction' ? 'Par transaction' : 'Par tranche de CA'
}

function exchangeModeLabel(mode: ProgramRecord['exchange_mode']) {
  if (mode === 'cash') return 'Espèces'
  if (mode === 'reward') return 'Récompenses'
  return 'Espèces + récompenses'
}

const STATUS_LABEL_FR: Record<ProgramRecord['status'], string> = {
  active: 'Actif',
  paused: 'En pause',
  draft: 'Brouillon',
  archived: 'Archivé',
}

interface ProgramsOverviewTableProps {
  programs: ProgramRecord[]
  defaultBusinessName?: string
}

export function ProgramsOverviewTable({ programs, defaultBusinessName }: ProgramsOverviewTableProps) {
  const headerActions = (
    <Button asChild variant="ghost" size="sm" className="gap-1.5">
      <Link to="/programs">
        Voir tous les programmes
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Button>
  )

  return (
    <>
      <DashboardSectionHeader title="Programmes" actions={headerActions} />

      {programs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
          Aucun programme pour ce compte.
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programme</TableHead>
                <TableHead className="hidden md:table-cell">Entreprise</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden lg:table-cell">Rémunération</TableHead>
                <TableHead className="hidden xl:table-cell">Échange</TableHead>
                <TableHead className="text-right">Affiliés</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((p) => {
                const business = p.business_name ?? defaultBusinessName ?? '—'
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        to={`/programs/${p.id}`}
                        className="group block min-w-0 font-medium text-primary underline-offset-2 hover:underline"
                      >
                        <span className="line-clamp-2 text-foreground group-hover:text-primary">
                          {p.name}
                        </span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">
                          {p.slug}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">
                          {business}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden max-w-[14rem] truncate text-muted-foreground md:table-cell">
                      {business}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={programStatusBadgeClass(p.status)}
                      >
                        {STATUS_LABEL_FR[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {commissionLabel(p.commission_type)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      {exchangeModeLabel(p.exchange_mode)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {typeof p.assigned_agents_count === 'number'
                        ? p.assigned_agents_count.toLocaleString('fr-FR')
                        : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
