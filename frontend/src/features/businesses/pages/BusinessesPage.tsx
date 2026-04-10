import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Eye,
  FilterX,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import {
  approveBusiness,
  fetchBusinesses,
  inviteBusiness,
  rejectBusiness,
  resendBusinessInvitation,
} from '../api'
import { InviteBusinessDialog } from '../../dashboard/components/InviteBusinessDialog'
import { KpiCard, KpiCardSkeleton, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { DashboardSectionHeader } from '../../dashboard/components/DashboardSectionHeader'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

type BusinessSortKey = 'business' | 'status' | 'programs' | 'agents' | 'transactions'

function businessStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
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
  const style = map[status] ?? {
    label: status,
    className: 'border-border bg-muted/40 text-muted-foreground',
  }
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  )
}

function compareBusinesses(a: BusinessRecord, b: BusinessRecord, key: BusinessSortKey, dir: SortDirection) {
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

function BusinessesPageSkeleton() {
  return (
    <section className="app-section">
      <PageHeader
        title={<Skeleton className="h-6 w-24" />}
        right={<Skeleton className="h-9 w-28 rounded-md" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 border-t border-border/50 bg-card/70 first:border-t-0" />
          ))}
        </div>
      </article>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BusinessesPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthSession()
  const canApprove = hasPermission('business.approve')
  const canReject = hasPermission('business.reject')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<BusinessSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  const records = query.data?.data ?? []

  const summary = useMemo(() => {
    return records.reduce(
      (acc, b) => {
        acc.total++
        if (b.status === 'pending') acc.pending++
        else if (b.status === 'approved') acc.approved++
        acc.programs += b.program_count ?? 0
        acc.agents += b.agent_count ?? 0
        acc.transactions += b.transaction_count ?? 0
        return acc
      },
      { total: 0, pending: 0, approved: 0, programs: 0, agents: 0, transactions: 0 },
    )
  }, [records])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return records.filter((item) => {
      const matchStatus = statusFilter === 'all' || item.status === statusFilter
      const matchSearch =
        !q ||
        item.display_name.toLowerCase().includes(q) ||
        item.legal_name.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        (item.industry ?? '').toLowerCase().includes(q) ||
        (item.owner?.display_name ?? '').toLowerCase().includes(q) ||
        (item.owner?.email ?? '').toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [records, search, statusFilter])

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== 'all'

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => compareBusinesses(a, b, sortKey, sortDirection))
  }, [filtered, sortKey, sortDirection])

  function handleSort(key: BusinessSortKey) {
    setPage(1)
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

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

  // Existing IACRM IDs for the InviteBusinessDialog
  const existingIacrmIds = useMemo(() => {
    const ids = new Set<string>()
    for (const b of records) {
      if (b.iacrm_business_id) ids.add(b.iacrm_business_id)
      if (b.slug) ids.add(b.slug)
    }
    return ids
  }, [records])

  const isMutating = approveMutation.isPending || rejectMutation.isPending || resendMutation.isPending

  if (query.isPending) return <BusinessesPageSkeleton />

  if (query.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
        {(query.error as ApiError).message}
      </article>
    )
  }

  return (
    <>
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

      <section className="app-section">
        <PageHeader
          title="Businesses"
          titleAddon={
            <Badge variant="outline">{summary.total}</Badge>
          }
          right={
            <PageHeaderToolbar>
              <div className="relative w-full sm:w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="businesses-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9"
                />
              </div>
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
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                  }}
                  className="gap-1.5 text-muted-foreground"
                >
                  <FilterX className="size-3.5" aria-hidden />
                  Réinitialiser
                </Button>
              ) : null}
              <Button
                type="button"
                className="gap-2 shrink-0"
                onClick={() => setInviteOpen(true)}
              >
                <Plus className="size-4" aria-hidden />
                Inviter un business
              </Button>
            </PageHeaderToolbar>
          }
        />

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Businesses"
            value={summary.total.toLocaleString('fr-FR')}
            description="Entités gouvernées sur la plateforme"
            badge={kpiSnapshotBadge('Total')}
            icon={Building2}
            tone="primary"
          />
          <KpiCard
            title="Programmes"
            value={summary.programs.toLocaleString('fr-FR')}
            description="Programmes sur les businesses listés"
            badge={kpiSnapshotBadge('Catalogue')}
            icon={LayoutGrid}
            tone="info"
          />
          <KpiCard
            title="Affiliés"
            value={summary.agents.toLocaleString('fr-FR')}
            description="Agents affiliés sous gouvernance"
            badge={kpiSnapshotBadge('Réseau')}
            icon={Users}
            tone="warning"
          />
          <KpiCard
            title="Transactions"
            value={summary.transactions.toLocaleString('fr-FR')}
            description="Résultats commerciaux attribués"
            badge={kpiSnapshotBadge('Revenu')}
            icon={Receipt}
            tone="success"
          />
        </div>

        {/* Table */}
        <article className="rounded-lg bg-card p-3 sm:p-4">
          <DashboardSectionHeader title="Businesses" />

          {totalFiltered === 0 ? (
            <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center text-sm text-muted-foreground">
              Aucun business ne correspond au filtre actif.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
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
                          {businessStatusBadge(item.status)}
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
                                  {canApprove ? (
                                    <DropdownMenuItem
                                      disabled={isMutating}
                                      onClick={() => approveMutation.mutate(item.id)}
                                    >
                                      <CheckCircle2 className="mr-2 size-3.5 text-emerald-600" />
                                      Approuver
                                    </DropdownMenuItem>
                                  ) : null}
                                  {canReject ? (
                                    <DropdownMenuItem
                                      disabled={isMutating}
                                      onClick={() => rejectMutation.mutate(item.id)}
                                    >
                                      <XCircle className="mr-2 size-3.5 text-red-600" />
                                      Rejeter
                                    </DropdownMenuItem>
                                  ) : null}
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
      </section>
    </>
  )
}
