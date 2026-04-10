import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { AgentAvatarFallback, Avatar, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { agentStatusBadgeClass } from '../utils/semanticBadges'

export interface TopAffiliateTableRow {
  rank: number
  agentId: string
  displayName: string
  email: string | null
  avatarUrl?: string | null
  status: string | null
  joinedAt: string | null
  prospectCount: number
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function formatShortId(id: string) {
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}

function formatJoined(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface TopAffiliatesByProspectsTableProps {
  rows: TopAffiliateTableRow[]
}

export function TopAffiliatesByProspectsTable({ rows }: TopAffiliatesByProspectsTableProps) {
  const headerActions = (
    <Button asChild variant="ghost" size="sm" className="gap-1.5">
      <Link to="/agents">
        Voir tous les affiliés
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Button>
  )

  return (
    <>
      <DashboardSectionHeader title="Top affiliés par prospects" actions={headerActions} />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
          Aucune activité affilié pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Affilié</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Statut</TableHead>
                <TableHead>Adhésion</TableHead>
                <TableHead className="text-right">Prospects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.agentId}>
                  <TableCell className="text-center text-muted-foreground">{row.rank}</TableCell>
                  <TableCell>
                    <Link
                      to={`/agents/${row.agentId}`}
                      className="group -m-1 flex min-w-0 items-center gap-2.5 rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label={`Voir le profil de ${row.displayName}`}
                    >
                      <Avatar className="size-9 shrink-0">
                        <AvatarImage src={row.avatarUrl ?? undefined} alt={row.displayName} />
                        <AgentAvatarFallback seed={row.agentId} className="text-xs font-medium">
                          {initials(row.displayName)}
                        </AgentAvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-primary underline-offset-2 group-hover:underline">
                          {row.displayName}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {formatShortId(row.agentId)}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden max-w-[12rem] truncate sm:table-cell">
                    {row.email ?? '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {row.status ? (
                      <Badge
                        variant="outline"
                        className={`capitalize ${agentStatusBadgeClass(row.status)}`}
                      >
                        {row.status.replace(/_/g, ' ')}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatJoined(row.joinedAt)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-primary">
                    {row.prospectCount.toLocaleString('fr-FR')}
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

export function TopAffiliatesByProspectsTableSkeleton() {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="overflow-x-auto rounded-lg bg-muted/10">
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-[40px_1.6fr_1.2fr_1fr_1fr_90px] gap-3">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="ml-auto h-4 w-14" />
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[40px_1.6fr_1.2fr_1fr_1fr_90px] gap-3">
              <Skeleton className="h-9 w-6" />
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="ml-auto h-9 w-14" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
