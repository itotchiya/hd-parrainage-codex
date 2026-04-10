import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Globe,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import {
  fetchBusinesses,
  inviteBusiness,
  resendBusinessInvitation,
} from '../../businesses/api'
import { useIacrmPlatformBusinesses } from '../../iacrm/hooks'
import { KpiCard, KpiCardSkeleton, kpiSnapshotBadge } from './KpiCard'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { InviteBusinessDialog } from './InviteBusinessDialog'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BusinessInvitePayload, BusinessRecord } from '../../../types/businesses'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DashboardSortKey = 'business' | 'status' | 'programs' | 'agents' | 'transactions'

function statusBadge(status: string) {
  const styles: Record<string, { label: string; className: string }> = {
    approved: {
      label: 'Actif',
      className: 'border-emerald-400 bg-emerald-500/10 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
    pending: {
      label: 'En attente',
      className: 'border-amber-300 bg-amber-500/10 text-amber-800 dark:border-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    },
    rejected: {
      label: 'Rejeté',
      className: 'border-red-300 bg-red-500/10 text-red-800 dark:border-red-700 dark:bg-red-500/20 dark:text-red-300',
    },
  }
  const s = styles[status] ?? { label: status, className: 'border-border bg-muted/40 text-muted-foreground' }
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  )
}

function compareBusinesses(a: BusinessRecord, b: BusinessRecord, key: DashboardSortKey, dir: SortDirection) {
  const m = dir === 'asc' ? 1 : -1
  switch (key) {
    case 'business':
      return a.display_name.localeCompare(b.display_name) * m
    case 'status':
      return a.status.localeCompare(b.status) * m
    case 'programs':
      return ((a.program_count ?? 0) - (b.program_count ?? 0)) * m
    case 'agents':
      return ((a.agent_count ?? 0) - (b.agent_count ?? 0)) * m
    case 'transactions':
      return ((a.transaction_count ?? 0) - (b.transaction_count ?? 0)) * m
    default:
      return 0
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PlatformDashboardSkeleton() {
  return (
    <section className="app-section">
      <PageHeader
        title={<Skeleton className="h-6 w-52" />}
        right={<Skeleton className="h-9 w-36 rounded-md" />}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
      <article className="rounded-lg bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-24" />
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Skeleton className="h-9 w-full sm:w-[260px]" />
            <Skeleton className="h-9 w-full sm:w-[150px]" />
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg bg-background/40">
          <div className="h-11 bg-muted/30" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 border-t border-border/50 bg-card/70 first:border-t-0" />
          ))}
        </div>
      </article>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Platform Dashboard
// ---------------------------------------------------------------------------

export function PlatformDashboard() {
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<DashboardSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const businessesQuery = useQuery({
    queryKey: ['businesses', 'list'],
    queryFn: fetchBusinesses,
  })

  const iacrmQuery = useIacrmPlatformBusinesses()

  const inviteMutation = useMutation({
    mutationFn: (payload: BusinessInvitePayload) => inviteBusiness(payload),
    onSuccess: async () => {
      setInviteOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })

  const resendMutation = useMutation({
    mutationFn: resendBusinessInvitation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })

  const businesses = businessesQuery.data?.data ?? []
  const iacrmBusinesses = iacrmQuery.data?.data ?? []

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

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return businesses.filter((b) => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter
      const matchSearch =
        !q ||
        b.display_name.toLowerCase().includes(q) ||
        b.legal_name.toLowerCase().includes(q) ||
        (b.industry ?? '').toLowerCase().includes(q) ||
        (b.owner?.display_name ?? '').toLowerCase().includes(q) ||
        (b.owner?.email ?? '').toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [businesses, search, statusFilter])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => compareBusinesses(a, b, sortKey, sortDirection))
  }, [filtered, sortKey, sortDirection])

  function handleSort(key: DashboardSortKey) {
    setPage(1)
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  useEffect(() => { setPage(1) }, [search, statusFilter])

  const totalFiltered = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const pageSafe = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, pageSafe, pageSize])

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

  // Existing IACRM IDs set
  const existingIacrmIds = useMemo(() => {
    const ids = new Set<string>()
    for (const b of businesses) {
      if (b.iacrm_business_id) ids.add(b.iacrm_business_id)
      if (b.slug) ids.add(b.slug)
    }
    return ids
  }, [businesses])

  const isMutating = inviteMutation.isPending || resendMutation.isPending

  if (businessesQuery.isPending) return <PlatformDashboardSkeleton />

  if (businessesQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
        {(businessesQuery.error as ApiError).message}
      </div>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Gouvernance de la plateforme"
        right={
          <PageHeaderToolbar>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setInviteOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Inviter un business
            </Button>
          </PageHeaderToolbar>
        }
      />

      {/* ── KPI strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Businesses Invités"
          value={summary.total.toString()}
          description="Entités sur la plateforme"
          badge={kpiSnapshotBadge('Total')}
          icon={Building2}
          tone="primary"
        />
        <KpiCard
          title="En Attente"
          value={summary.pending.toString()}
          description="Invitations non acceptées"
          badge={{
            tone: summary.pending > 0 ? 'warning' : 'neutral',
            label: summary.pending > 0 ? 'Action requise' : 'File vide',
            icon: null,
          }}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          title="Actifs"
          value={summary.approved.toString()}
          description="Businesses opérationnels"
          badge={kpiSnapshotBadge('Actifs')}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          title="Businesses IACRM"
          value={iacrmQuery.isPending ? '...' : iacrmBusinesses.length.toString()}
          description="Disponibles dans IACRM"
          badge={kpiSnapshotBadge('Source')}
          icon={Globe}
          tone="info"
        />
      </div>

      {/* ── Business table ─────────────────────────────────────── */}
      <article className="rounded-lg bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <DashboardSectionHeader title="Businesses" />
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Field className="w-full sm:w-auto">
              <div className="relative w-full sm:w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dashboard-business-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9"
                />
              </div>
            </Field>
            <Select
              value={statusFilter}
              onValueChange={(v: 'all' | 'pending' | 'approved' | 'rejected') => setStatusFilter(v)}
            >
              <SelectTrigger className="w-full sm:w-[160px] shrink-0">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Statut</SelectLabel>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="approved">Actif</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {totalFiltered === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
            Aucun business ne correspond au filtre actif.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <SortableTableHead
                      sortKey="business"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Business
                    </SortableTableHead>
                    <TableHead className="hidden sm:table-cell">Propriétaire</TableHead>
                    <TableHead className="hidden md:table-cell">Secteur</TableHead>
                    <SortableTableHead
                      sortKey="status"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden md:table-cell"
                    >
                      Statut
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="programs"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden lg:table-cell"
                      align="right"
                    >
                      Prog.
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="agents"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden lg:table-cell"
                      align="right"
                    >
                      Affiliés
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="transactions"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="hidden xl:table-cell"
                      align="right"
                    >
                      Transactions
                    </SortableTableHead>
                    <TableHead className="w-10 pe-2 text-end">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageSlice.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {(pageSafe - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/businesses/${item.id}`}
                          className="group -m-1 flex min-w-0 items-center gap-2.5 rounded-md p-1 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Avatar className="size-9 shrink-0 rounded-md">
                            <AvatarImage src={item.logo_url ?? undefined} alt={item.display_name} className="object-contain" />
                            <AvatarFallback className="rounded-md text-xs font-semibold">
                              {item.display_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground underline-offset-4 group-hover:underline">
                              {item.display_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{item.legal_name}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div>
                          <p className="text-sm">{item.owner?.display_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{item.owner?.email ?? ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {item.industry ?? '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {statusBadge(item.status)}
                      </TableCell>
                      <TableCell className="hidden text-right text-sm font-medium lg:table-cell">
                        {(item.program_count ?? 0).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell className="hidden text-right text-sm font-medium lg:table-cell">
                        {(item.agent_count ?? 0).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell className="hidden text-right text-sm font-medium xl:table-cell">
                        {(item.transaction_count ?? 0).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell className="pe-2 text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Actions">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/businesses/${item.id}`}>
                                <Eye className="mr-2 size-3.5" />
                                Voir les détails
                              </Link>
                            </DropdownMenuItem>
                            {item.status === 'pending' ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={isMutating}
                                  onClick={() => resendMutation.mutate(item.id)}
                                >
                                  <RefreshCw className="mr-2 size-3.5" />
                                  Relancer l'invitation
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePaginationBar
              page={pageSafe}
              pageSize={pageSize}
              totalItems={totalFiltered}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </article>

      {/* ── Invite Dialog ──────────────────────────────────────── */}
      <InviteBusinessDialog
        open={inviteOpen}
        isPending={inviteMutation.isPending}
        error={inviteMutation.isError ? (inviteMutation.error as ApiError) : null}
        existingIacrmIds={existingIacrmIds}
        onClose={() => {
          setInviteOpen(false)
          inviteMutation.reset()
        }}
        onSubmit={(payload) => inviteMutation.mutate(payload)}
      />
    </section>
  )
}
