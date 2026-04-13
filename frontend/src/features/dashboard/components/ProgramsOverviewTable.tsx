import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
import { programStatusBadgeClass } from '../utils/semanticBadges'
import type { ProgramRecord } from '@/types/programs'
import { formatAppNumber } from '@/lib/locale'

function commissionLabel(type: ProgramRecord['commission_type'], t: (key: string) => string) {
  return type === 'per-transaction'
    ? t('dashboard.programsOverview.commission.perTransaction')
    : t('dashboard.programsOverview.commission.revenueTier')
}

function exchangeModeLabel(mode: ProgramRecord['exchange_mode'], t: (key: string) => string) {
  if (mode === 'cash') return t('programs.exchangeModes.cash')
  if (mode === 'reward') return t('programs.exchangeModes.reward')
  return t('programs.exchangeModes.both')
}

interface ProgramsOverviewTableProps {
  programs: ProgramRecord[]
  defaultBusinessName?: string
}

export function ProgramsOverviewTable({ programs, defaultBusinessName }: ProgramsOverviewTableProps) {
  const { t } = useTranslation()

  const headerActions = (
    <Button asChild variant="ghost" size="sm" className="gap-1.5">
      <Link to="/programs">
        {t('dashboard.programsOverview.viewAll')}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Button>
  )

  return (
    <>
      <DashboardSectionHeader title={t('dashboard.sections.programsOverview')} actions={headerActions} />

      {programs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
          {t('dashboard.programsOverview.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard.programsOverview.columns.program')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('dashboard.programsOverview.columns.business')}</TableHead>
                <TableHead>{t('dashboard.programsOverview.columns.status')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('dashboard.programsOverview.columns.commission')}</TableHead>
                <TableHead className="hidden xl:table-cell">{t('dashboard.programsOverview.columns.exchange')}</TableHead>
                <TableHead className="text-right">{t('dashboard.programsOverview.columns.affiliates')}</TableHead>
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
                      <Badge variant="outline" className={programStatusBadgeClass(p.status)}>
                        {t(`programs.status.${p.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {commissionLabel(p.commission_type, t)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      {exchangeModeLabel(p.exchange_mode, t)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {typeof p.assigned_agents_count === 'number'
                        ? formatAppNumber(p.assigned_agents_count)
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

export function ProgramsOverviewTableSkeleton() {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="overflow-x-auto rounded-lg bg-muted/10">
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-[1.4fr_1fr_130px_1fr_1fr_100px] gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-4 w-14" />
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1.4fr_1fr_130px_1fr_1fr_100px] gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="ml-auto h-9 w-14" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
