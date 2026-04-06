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
import { formatDashboardDateFr, transactionStatusBadgeClass } from '../utils/semanticBadges'
import type { TransactionRecord } from '@/types/transactions'

interface RecentActivityTableProps {
  transactions: TransactionRecord[]
}

export function RecentActivityTable({ transactions }: RecentActivityTableProps) {
  const headerActions = (
    <Button asChild variant="ghost" size="sm" className="gap-1.5">
      <Link to="/transactions">
        Voir les transactions
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Button>
  )

  return (
    <>
      <DashboardSectionHeader title="Activité récente" actions={headerActions} />

      {transactions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
          Aucune transaction récente.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden min-w-[7rem] sm:table-cell">Référence</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead className="hidden lg:table-cell">Affilié</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const label = t.prospect_name ?? t.product_name ?? '—'
                const when = t.occurred_at ?? t.created_at
                return (
                  <TableRow key={t.id}>
                    <TableCell className="hidden max-w-[8rem] truncate font-mono text-xs sm:table-cell">
                      {t.transaction_reference}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{label}</p>
                        <p className="truncate text-xs text-muted-foreground sm:hidden">
                          {t.transaction_reference}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-[10rem] truncate lg:table-cell">
                      {t.agent_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`uppercase ${transactionStatusBadgeClass(t.status)}`}
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatDashboardDateFr(when)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.points_awarded !== null ? (
                        <span className="font-medium text-primary">
                          +{t.points_awarded.toLocaleString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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

export function RecentActivityTableSkeleton() {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="overflow-x-auto rounded-lg bg-muted/10">
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-[1.1fr_1.3fr_1fr_130px_110px_90px] gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="ml-auto h-4 w-12" />
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1.1fr_1.3fr_1fr_130px_110px_90px] gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="ml-auto h-9 w-14" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
