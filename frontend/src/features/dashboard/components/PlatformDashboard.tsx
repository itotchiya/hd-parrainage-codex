import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Receipt,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { approveBusiness, fetchBusinesses, rejectBusiness } from '../../businesses/api'
import { useAuthSession } from '../../auth/session'
import { KpiCard, KpiCardSkeleton, kpiSnapshotBadge } from './KpiCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'border-emerald-400 bg-emerald-500/10 text-emerald-800',
    pending: 'border-amber-300 bg-amber-500/10 text-amber-800',
    rejected: 'border-red-300 bg-red-500/10 text-red-800',
  }
  const labels: Record<string, string> = {
    approved: 'Approuvé',
    pending: 'En attente',
    rejected: 'Rejeté',
  }
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border bg-muted/40 text-muted-foreground'}>
      {labels[status] ?? status}
    </Badge>
  )
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PlatformDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Platform Dashboard
// ---------------------------------------------------------------------------

export function PlatformDashboard() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthSession()
  const canApprove = hasPermission('business.approve')
  const canReject = hasPermission('business.reject')

  const query = useQuery({
    queryKey: ['businesses', 'list'],
    queryFn: fetchBusinesses,
  })

  const approveMutation = useMutation({
    mutationFn: approveBusiness,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: rejectBusiness,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })

  const businesses = query.data?.data ?? []

  const summary = useMemo(
    () =>
      businesses.reduce(
        (acc, b) => {
          acc.total++
          if (b.status === 'pending') acc.pending++
          if (b.status === 'approved') acc.approved++
          acc.programs += b.program_count ?? 0
          acc.agents += b.agent_count ?? 0
          acc.transactions += b.transaction_count ?? 0
          return acc
        },
        { total: 0, pending: 0, approved: 0, programs: 0, agents: 0, transactions: 0 },
      ),
    [businesses],
  )

  const pendingBusinesses = useMemo(
    () => businesses.filter((b) => b.status === 'pending'),
    [businesses],
  )

  const approvedBusinesses = useMemo(
    () => businesses.filter((b) => b.status === 'approved'),
    [businesses],
  )

  const isMutating = approveMutation.isPending || rejectMutation.isPending

  if (query.isPending) return <PlatformDashboardSkeleton />

  if (query.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {(query.error as ApiError).message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── KPI strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Businesses"
          value={summary.total.toString()}
          description="Entités gouvernées"
          badge={kpiSnapshotBadge('Total')}
          icon={Building2}
          tone="primary"
        />
        <KpiCard
          title="En attente"
          value={summary.pending.toString()}
          description="Demandes d'approbation"
          badge={{ tone: summary.pending > 0 ? 'warning' : 'neutral', label: summary.pending > 0 ? 'Action requise' : 'File vide', icon: null }}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          title="Approuvés"
          value={summary.approved.toString()}
          description="Businesses actifs"
          badge={kpiSnapshotBadge('Actifs')}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          title="Programmes"
          value={summary.programs.toString()}
          description="Programmes sur la plateforme"
          badge={kpiSnapshotBadge('Total')}
          icon={Briefcase}
          tone="info"
        />
        <KpiCard
          title="Affiliés"
          value={summary.agents.toString()}
          description="Tous les affiliés inscrits"
          badge={kpiSnapshotBadge('Total')}
          icon={UserCheck}
          tone="info"
        />
        <KpiCard
          title="Transactions"
          value={summary.transactions.toString()}
          description="Transactions liées"
          badge={kpiSnapshotBadge('Total')}
          icon={Receipt}
          tone="info"
        />
      </div>

      {/* ── Pending review queue ────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                File d'approbation
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {pendingBusinesses.length === 0
                  ? 'Aucune demande en attente'
                  : `${pendingBusinesses.length} business${pendingBusinesses.length > 1 ? 'es' : ''} à approuver`}
              </p>
            </div>
            {summary.pending > 0 ? (
              <Badge variant="outline" className="border-amber-300 bg-amber-500/10 text-amber-800 shrink-0">
                {summary.pending} en attente
              </Badge>
            ) : null}
          </div>

          {pendingBusinesses.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="size-9 text-emerald-400" />
              <p className="mt-3 text-sm font-medium text-foreground">File d'attente vide</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tous les businesses ont été examinés.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Secteur</TableHead>
                  <TableHead>Soumis le</TableHead>
                  {(canApprove || canReject) ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBusinesses.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div>
                        <Link
                          to={`/businesses/${b.id}`}
                          className="font-medium text-foreground hover:underline underline-offset-4"
                        >
                          {b.display_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{b.legal_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{b.owner?.display_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{b.owner?.email ?? ''}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.industry ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(b.created_at)}
                    </TableCell>
                    {(canApprove || canReject) ? (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canApprove ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isMutating}
                              onClick={() => approveMutation.mutate(b.id)}
                            >
                              <CheckCircle2 className="mr-1.5 size-3.5" />
                              Approuver
                            </Button>
                          ) : null}
                          {canReject ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isMutating}
                              onClick={() => rejectMutation.mutate(b.id)}
                            >
                              <XCircle className="mr-1.5 size-3.5" />
                              Rejeter
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Approved businesses overview ────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Businesses approuvés
            </p>
            <p className="mt-0.5 text-base font-semibold text-foreground">
              {approvedBusinesses.length} entité{approvedBusinesses.length !== 1 ? 's' : ''} active{approvedBusinesses.length !== 1 ? 's' : ''}
            </p>
          </div>

          {approvedBusinesses.length === 0 ? (
            <div className="px-5 pb-8 text-center">
              <p className="text-sm text-muted-foreground">Aucun business approuvé pour l'instant.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Secteur</TableHead>
                  <TableHead>Programmes</TableHead>
                  <TableHead>Affiliés</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedBusinesses.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link
                        to={`/businesses/${b.id}`}
                        className="font-medium text-foreground hover:underline underline-offset-4"
                      >
                        {b.display_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.owner?.display_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.industry ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {b.program_count ?? 0}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {b.agent_count ?? 0}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {b.transaction_count ?? 0}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
