import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRightLeft,
  Clock3,
  Coins,
  FilterX,
  Lock,
  Search,
  Undo2,
  Wallet,
} from 'lucide-react'

import { useAuthSession } from '@/features/auth/session'
import { fetchAgents } from '@/features/agents/api'
import { KpiCard, KpiCardSkeleton } from '@/features/dashboard/components/KpiCard'
import { DashboardSectionHeader } from '@/features/dashboard/components/DashboardSectionHeader'
import { formatDashboardDateTimeFr } from '@/features/dashboard/utils/semanticBadges'
import { fetchPrograms } from '@/features/programs/api'
import { buildProspectDetailPath } from '@/features/prospects/paths'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ApiError } from '@/lib/api'
import type {
  PointsLedgerEntryStatus,
  PointsLedgerRecord,
  PointsProgramBalanceRecord,
  PointsQueryParams,
} from '@/types/points'

import { fetchPointsByProgram, fetchPointsLedger, fetchPointsSummary } from '../api'

type ProgramWalletSortKey =
  | 'program'
  | 'exchange'
  | 'available'
  | 'pending'
  | 'reserved'
  | 'consumed'
  | 'open-prospects'

type LedgerSortKey =
  | 'entry'
  | 'status'
  | 'delta'
  | 'program'
  | 'prospect'
  | 'transaction'
  | 'effective'

const statusPresentation: Record<PointsLedgerEntryStatus, { label: string; className: string }> = {
  pending: {
    label: 'En attente',
    className: 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  },
  available: {
    label: 'Disponible',
    className: 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  locked: {
    label: 'Réservé',
    className: 'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
  consumed: {
    label: 'Consommé',
    className: 'border-transparent bg-muted text-muted-foreground',
  },
  reversed: {
    label: 'Annulé',
    className: 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  },
}

const ledgerStatusSortOrder: Record<PointsLedgerEntryStatus, number> = {
  pending: 0,
  available: 1,
  locked: 2,
  consumed: 3,
  reversed: 4,
}

function formatSignedPoints(value: number) {
  return `${value > 0 ? '+' : ''}${value.toLocaleString('fr-FR')} pts`
}

function pointsTime(value: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

function exchangeModeLabel(mode: string | null) {
  if (mode === 'reward') return 'Récompense uniquement'
  if (mode === 'cash') return 'Cash uniquement'
  if (mode === 'both') return 'Récompense + cash'
  return 'Non configuré'
}

function ledgerEntryLabel(entry: PointsLedgerRecord) {
  switch (entry.entry_type) {
    case 'accrual':
      return entry.entry_status === 'pending' ? 'Acquisition projetée' : 'Acquisition confirmée'
    case 'hold':
      return 'Libération en attente'
    case 'release':
      return 'Libération disponible'
    case 'spend':
      return 'Consommation (échange)'
    case 'refund':
      return 'Remboursement'
    case 'adjustment':
      return 'Ajustement manuel'
    case 'reversal':
      return 'Annulation'
    default:
      return entry.source
  }
}

function ledgerEntryDescription(entry: PointsLedgerRecord) {
  if (entry.entry_type === 'accrual' && entry.entry_status === 'pending') {
    return 'Points projetés en attente de validation. Non dépensables.'
  }

  if (entry.entry_type === 'accrual' && entry.entry_status === 'available') {
    return 'Transaction validée et points convertis (dépensables).'
  }

  return entry.description ?? entry.source
}

function ledgerDeltaClassName(entry: PointsLedgerRecord) {
  if (entry.points_delta < 0) {
    return 'text-rose-600 dark:text-rose-300'
  }

  if (entry.entry_status === 'pending') {
    return 'text-amber-700 dark:text-amber-300'
  }

  if (entry.entry_status === 'available') {
    return 'text-emerald-600 dark:text-emerald-300'
  }

  return 'text-foreground'
}

function compareProgramWallets(
  left: PointsProgramBalanceRecord,
  right: PointsProgramBalanceRecord,
  key: ProgramWalletSortKey,
  direction: SortDirection,
) {
  const modifier = direction === 'asc' ? 1 : -1
  const result =
    key === 'available'
      ? left.available_points - right.available_points
      : key === 'pending'
        ? left.pending_points - right.pending_points
        : key === 'reserved'
          ? left.locked_points - right.locked_points
          : key === 'consumed'
            ? left.consumed_points - right.consumed_points
            : key === 'open-prospects'
              ? left.open_prospect_count - right.open_prospect_count
              : key === 'exchange'
                ? exchangeModeLabel(left.exchange_mode).localeCompare(exchangeModeLabel(right.exchange_mode))
                : (left.program_name ?? left.program_slug ?? '').localeCompare(
                    right.program_name ?? right.program_slug ?? '',
                  )

  return result * modifier
}

function compareLedgerEntries(
  left: PointsLedgerRecord,
  right: PointsLedgerRecord,
  key: LedgerSortKey,
  direction: SortDirection,
) {
  const modifier = direction === 'asc' ? 1 : -1
  const result =
    key === 'effective'
      ? pointsTime(left.effective_at) - pointsTime(right.effective_at)
      : key === 'delta'
        ? left.points_delta - right.points_delta
        : key === 'status'
          ? ledgerStatusSortOrder[left.entry_status] - ledgerStatusSortOrder[right.entry_status]
          : key === 'program'
            ? (left.program_name ?? '').localeCompare(right.program_name ?? '')
            : key === 'prospect'
              ? (left.prospect_name ?? '').localeCompare(right.prospect_name ?? '')
              : key === 'transaction'
                ? (left.transaction_reference ?? '').localeCompare(right.transaction_reference ?? '')
                : ledgerEntryLabel(left).localeCompare(ledgerEntryLabel(right))

  return result * modifier
}

function PointsPageSkeleton() {
  return (
    <section className="app-section">
      <PageHeader
        title={<Skeleton className="h-6 w-32" />}
        right={
          <PageHeaderToolbar>
            <Skeleton className="h-8 w-full sm:w-[240px]" />
            <Skeleton className="h-8 w-full sm:w-[150px]" />
            <Skeleton className="h-8 w-full sm:w-[150px]" />
            <Skeleton className="h-8 w-full sm:w-[170px]" />
            <Skeleton className="h-8 w-full sm:w-[140px]" />
            <Skeleton className="h-8 w-full sm:w-[140px]" />
            <Skeleton className="h-8 w-40 rounded-md" />
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <div className="mb-3 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="overflow-hidden rounded-lg bg-background/40">
          <div className="h-11 bg-muted/30" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 border-t border-border/50 bg-card/70 first:border-t-0" />
          ))}
        </div>
      </article>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <div className="mb-3 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <div className="overflow-hidden rounded-lg bg-background/40">
          <div className="h-11 bg-muted/30" />
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-16 border-t border-border/50 bg-card/70 first:border-t-0" />
          ))}
        </div>
      </article>
    </section>
  )
}

export function PointsPage() {
  const { user, hasPermission } = useAuthSession()
  const isAgentView = Boolean(user?.agent_profile)
  const canViewAgents = !isAgentView && hasPermission('agent.view')
  const canViewPrograms = hasPermission('program.view')


  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PointsLedgerEntryStatus>('all')
  const [programFilter, setProgramFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'all' ||
    programFilter !== 'all' ||
    agentFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== ''

  const [walletPage, setWalletPage] = useState(1)
  const [walletPageSize, setWalletPageSize] = useState(10)
  const [ledgerPage, setLedgerPage] = useState(1)
  const [ledgerPageSize, setLedgerPageSize] = useState(10)
  const [walletSortKey, setWalletSortKey] = useState<ProgramWalletSortKey>('available')
  const [walletSortDirection, setWalletSortDirection] = useState<SortDirection>('desc')
  const [ledgerSortKey, setLedgerSortKey] = useState<LedgerSortKey>('effective')
  const [ledgerSortDirection, setLedgerSortDirection] = useState<SortDirection>('desc')

  const scopedQueryParams = useMemo<PointsQueryParams>(
    () => ({
      programId: programFilter,
      agentId: canViewAgents ? agentFilter : undefined,
      dateFrom,
      dateTo,
    }),
    [agentFilter, canViewAgents, dateFrom, dateTo, programFilter],
  )

  const ledgerQueryParams = useMemo<PointsQueryParams>(
    () => ({
      ...scopedQueryParams,
      search,
      entryStatus: statusFilter,
    }),
    [scopedQueryParams, search, statusFilter],
  )

  const summaryQuery = useQuery({
    queryKey: ['points', 'summary', scopedQueryParams],
    queryFn: () => fetchPointsSummary(scopedQueryParams),
    placeholderData: keepPreviousData,
  })

  const byProgramQuery = useQuery({
    queryKey: ['points', 'by-program', scopedQueryParams],
    queryFn: () => fetchPointsByProgram(scopedQueryParams),
    placeholderData: keepPreviousData,
  })

  const ledgerQuery = useQuery({
    queryKey: ['points', 'ledger', ledgerQueryParams],
    queryFn: () => fetchPointsLedger(ledgerQueryParams),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })

  const programsQuery = useQuery({
    queryKey: ['points', 'program-options'],
    queryFn: fetchPrograms,
    enabled: canViewPrograms,
  })

  const agentsQuery = useQuery({
    queryKey: ['points', 'agent-options'],
    queryFn: fetchAgents,
    enabled: canViewAgents,
  })

  const summary = summaryQuery.data?.data
  const programWallets = byProgramQuery.data?.data ?? []
  const ledgerEntries = ledgerQuery.data?.data ?? []
  const projectedPoints = summary?.projected_points ?? summary?.forecast_points ?? 0

  const programOptions = useMemo(() => {
    if (programsQuery.data?.data) {
      return programsQuery.data.data
        .map((program) => ({ id: program.id, name: program.name }))
        .sort((left, right) => left.name.localeCompare(right.name))
    }

    return Array.from(
      new Map(
        programWallets
          .filter((wallet) => wallet.program_id && wallet.program_name)
          .map((wallet) => [wallet.program_id, { id: wallet.program_id, name: wallet.program_name ?? 'Programme' }]),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name))
  }, [programWallets, programsQuery.data?.data])

  const agentOptions = useMemo(() => {
    if (agentsQuery.data?.data) {
      return agentsQuery.data.data
        .map((agent) => ({ id: agent.id, name: agent.display_name ?? agent.email ?? 'Affiliate' }))
        .sort((left, right) => left.name.localeCompare(right.name))
    }

    return Array.from(
      new Map(
        ledgerEntries
          .filter((entry) => entry.agent_id && entry.agent_name)
          .map((entry) => [entry.agent_id, { id: entry.agent_id, name: entry.agent_name ?? 'Affilié' }]),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name))
  }, [agentsQuery.data?.data, ledgerEntries])

  const sortedProgramWallets = useMemo(
    () =>
      [...programWallets].sort((left, right) =>
        compareProgramWallets(left, right, walletSortKey, walletSortDirection),
      ),
    [programWallets, walletSortDirection, walletSortKey],
  )

  const sortedLedgerEntries = useMemo(
    () =>
      [...ledgerEntries].sort((left, right) =>
        compareLedgerEntries(left, right, ledgerSortKey, ledgerSortDirection),
      ),
    [ledgerEntries, ledgerSortDirection, ledgerSortKey],
  )

  function handleWalletSort(nextKey: ProgramWalletSortKey) {
    setWalletPage(1)
    if (walletSortKey === nextKey) {
      setWalletSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setWalletSortKey(nextKey)
    setWalletSortDirection(['available', 'pending', 'reserved', 'consumed', 'open-prospects'].includes(nextKey) ? 'desc' : 'asc')
  }

  function handleLedgerSort(nextKey: LedgerSortKey) {
    setLedgerPage(1)
    if (ledgerSortKey === nextKey) {
      setLedgerSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setLedgerSortKey(nextKey)
    setLedgerSortDirection(['delta', 'effective'].includes(nextKey) ? 'desc' : 'asc')
  }

  useEffect(() => {
    setLedgerPage(1)
  }, [search, statusFilter, programFilter, agentFilter, dateFrom, dateTo])

  useEffect(() => {
    setWalletPage(1)
  }, [programFilter, agentFilter, dateFrom, dateTo])

  const totalWallets = sortedProgramWallets.length
  const totalWalletPages = Math.max(1, Math.ceil(totalWallets / walletPageSize))
  const safeWalletPage = Math.min(walletPage, totalWalletPages)
  const walletSlice = useMemo(() => {
    const start = (safeWalletPage - 1) * walletPageSize
    return sortedProgramWallets.slice(start, start + walletPageSize)
  }, [safeWalletPage, sortedProgramWallets, walletPageSize])

  useEffect(() => {
    if (walletPage !== safeWalletPage) setWalletPage(safeWalletPage)
  }, [safeWalletPage, walletPage])

  const totalLedgerEntries = sortedLedgerEntries.length
  const totalLedgerPages = Math.max(1, Math.ceil(totalLedgerEntries / ledgerPageSize))
  const safeLedgerPage = Math.min(ledgerPage, totalLedgerPages)
  const ledgerSlice = useMemo(() => {
    const start = (safeLedgerPage - 1) * ledgerPageSize
    return sortedLedgerEntries.slice(start, start + ledgerPageSize)
  }, [ledgerPageSize, safeLedgerPage, sortedLedgerEntries])

  useEffect(() => {
    if (ledgerPage !== safeLedgerPage) setLedgerPage(safeLedgerPage)
  }, [ledgerPage, safeLedgerPage])

  const isInitialLoading = summaryQuery.isLoading || byProgramQuery.isLoading || ledgerQuery.isLoading
  const isStale = summaryQuery.isPlaceholderData || byProgramQuery.isPlaceholderData || ledgerQuery.isPlaceholderData

  if (isInitialLoading) {
    return <PointsPageSkeleton />
  }

  if (summaryQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(summaryQuery.error as ApiError).message}
      </article>
    )
  }

  if (byProgramQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(byProgramQuery.error as ApiError).message}
      </article>
    )
  }

  if (ledgerQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(ledgerQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Points"
        right={
          <PageHeaderToolbar>
            {hasActiveFilters ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setSearch('')
                        setStatusFilter('all')
                        setProgramFilter('all')
                        setAgentFilter('all')
                        setDateFrom('')
                        setDateTo('')
                      }}
                      aria-label="Effacer les filtres"
                    >
                      <FilterX className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Effacer les filtres</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}

            <div className="relative w-full sm:w-[240px] shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | PointsLedgerEntryStatus)}>
              <SelectTrigger aria-label="Filter by ledger status" className="w-full sm:w-[160px] shrink-0"><SelectValue placeholder="Tous statuts" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Statut</SelectLabel>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="locked">Réservé</SelectItem>
                    <SelectItem value="consumed">Consommé</SelectItem>
                    <SelectItem value="reversed">Annulé</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger aria-label="Filter by program" className="w-full sm:w-[180px] shrink-0"><SelectValue placeholder="All programs" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Programme</SelectLabel>
                    <SelectItem value="all">Tous programmes</SelectItem>
                    {programOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
            </Select>

            {canViewAgents ? (
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger aria-label="Filter by agent" className="w-full sm:w-[180px] shrink-0"><SelectValue placeholder="Tous affiliés" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Affilié</SelectLabel>
                    <SelectItem value="all">Tous affiliés</SelectItem>
                    {agentOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full sm:w-[148px]"
              aria-label="Date de début"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full sm:w-[148px]"
              aria-label="Date de fin"
            />
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Solde disponible" value={(summary?.available_points ?? 0).toLocaleString('fr-FR')} description="Prêt à l'emploi" icon={Wallet} tone="success" variant="solid" help="Formule du solde disponible : somme des entrées du registre avec statut = disponible. Les libérations en attente, les réservations pour échange, les éléments consommés et annulés sont exclus." isLoading={isStale} />
        <KpiCard title="Libération en attente" value={(summary?.pending_points ?? 0).toLocaleString('fr-FR')} description="En attente de validation" icon={Clock3} tone="warning" variant="solid" help="Somme des points en attente. Non utilisables pour le moment." isLoading={isStale} />
        <KpiCard title="Réservé pour échange" value={(summary?.locked_points ?? 0).toLocaleString('fr-FR')} description="Bloqué dans les demandes" icon={Lock} tone="info" variant="solid" help="Montant actuellement bloqué depuis le portefeuille disponible (statut = réservé)." isLoading={isStale} />
        <KpiCard title="Consommé" value={(summary?.consumed_points ?? 0).toLocaleString('fr-FR')} description="Déjà dépensé" icon={ArrowRightLeft} tone="danger" variant="solid" help="Point déjà consommés (échangés)." isLoading={isStale} />
        <KpiCard title="Annulé" value={(summary?.reversed_points ?? 0).toLocaleString('fr-FR')} description="Retiré ou repris" icon={Undo2} tone="warning" className="lg:col-span-2" help="Points retirés." isLoading={isStale} />
        <KpiCard title="Points projetés" value={projectedPoints.toLocaleString('fr-FR')} description="Des prospects ouverts" icon={Coins} tone="primary" className="lg:col-span-2" help="Formule de projection : somme des points estimés pour chaque prospect en cours, via la règle du programme." isLoading={isStale} />
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader title={isAgentView ? 'Mes portefeuilles' : 'Portefeuilles des programmes'} />

        {totalWallets === 0 ? (
          <p className="rounded-lg border border-border px-4 py-5 text-sm text-muted-foreground">
            Aucun portefeuille n'est disponible pour la sélection actuelle.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead sortKey="program" activeKey={walletSortKey} direction={walletSortDirection} onSort={handleWalletSort}>Programme</SortableTableHead>
                    <SortableTableHead sortKey="exchange" activeKey={walletSortKey} direction={walletSortDirection} onSort={handleWalletSort} className="hidden md:table-cell">Mode d'échange</SortableTableHead>
                    <SortableTableHead sortKey="available" activeKey={walletSortKey} direction={walletSortDirection} onSort={handleWalletSort} className="text-right" align="right">Disponible</SortableTableHead>
                    <SortableTableHead sortKey="pending" activeKey={walletSortKey} direction={walletSortDirection} onSort={handleWalletSort} className="hidden md:table-cell text-right" align="right">En attente</SortableTableHead>
                    <SortableTableHead sortKey="reserved" activeKey={walletSortKey} direction={walletSortDirection} onSort={handleWalletSort} className="hidden xl:table-cell text-right" align="right">Réservé</SortableTableHead>
                    <SortableTableHead sortKey="consumed" activeKey={walletSortKey} direction={walletSortDirection} onSort={handleWalletSort} className="hidden xl:table-cell text-right" align="right">Consommé</SortableTableHead>
                    <SortableTableHead sortKey="open-prospects" activeKey={walletSortKey} direction={walletSortDirection} onSort={handleWalletSort} className="hidden lg:table-cell text-right" align="right">Prospects en cours</SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {walletSlice.map((wallet) => (
                    <TableRow key={wallet.program_id}>
                      <TableCell className="min-w-[240px]">
                        <div className="space-y-1">
                          <Link to={`/programs/${wallet.program_id}`} className="font-medium text-foreground underline underline-offset-4 decoration-border transition-colors hover:text-primary hover:decoration-primary">{wallet.program_name ?? wallet.program_slug ?? 'Programme'}</Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{wallet.ledger_entry_count.toLocaleString('fr-FR')} entrées</span>
                            {wallet.exchange_pack_name ? <span>{wallet.exchange_pack_name}</span> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{exchangeModeLabel(wallet.exchange_mode)}</p>
                          <p className="text-xs text-muted-foreground">{wallet.exchange_pack_name ?? 'Aucun pack actif'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right"><span className="text-sm font-semibold text-foreground">{wallet.available_points.toLocaleString('fr-FR')}</span></TableCell>
                      <TableCell className="hidden md:table-cell text-right text-muted-foreground">{wallet.pending_points.toLocaleString('fr-FR')}</TableCell>
                      <TableCell className="hidden xl:table-cell text-right text-muted-foreground">{wallet.locked_points.toLocaleString('fr-FR')}</TableCell>
                      <TableCell className="hidden xl:table-cell text-right text-muted-foreground">{wallet.consumed_points.toLocaleString('fr-FR')}</TableCell>
                      <TableCell className="hidden lg:table-cell text-right"><Badge variant="secondary">{wallet.open_prospect_count.toLocaleString('fr-FR')}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePaginationBar page={walletPage} pageSize={walletPageSize} totalItems={totalWallets} onPageChange={setWalletPage} onPageSizeChange={setWalletPageSize} />
          </div>
        )}
      </article>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader
          title={isAgentView ? 'Mon historique de points' : 'Historique des points'}
        />

        {totalLedgerEntries === 0 ? (
          <p className="rounded-lg border border-border px-4 py-5 text-sm text-muted-foreground">
            Aucune entrée ne correspond aux filtres.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead sortKey="entry" activeKey={ledgerSortKey} direction={ledgerSortDirection} onSort={handleLedgerSort}>Entrée</SortableTableHead>
                    <SortableTableHead sortKey="status" activeKey={ledgerSortKey} direction={ledgerSortDirection} onSort={handleLedgerSort}>Statut</SortableTableHead>
                    <SortableTableHead sortKey="delta" activeKey={ledgerSortKey} direction={ledgerSortDirection} onSort={handleLedgerSort} className="text-right" align="right">Montant</SortableTableHead>
                    <SortableTableHead sortKey="program" activeKey={ledgerSortKey} direction={ledgerSortDirection} onSort={handleLedgerSort} className="hidden lg:table-cell">Programme</SortableTableHead>
                    <SortableTableHead sortKey="prospect" activeKey={ledgerSortKey} direction={ledgerSortDirection} onSort={handleLedgerSort} className="hidden xl:table-cell">Prospect</SortableTableHead>
                    <SortableTableHead sortKey="transaction" activeKey={ledgerSortKey} direction={ledgerSortDirection} onSort={handleLedgerSort} className="hidden xl:table-cell">Transaction</SortableTableHead>
                    <SortableTableHead sortKey="effective" activeKey={ledgerSortKey} direction={ledgerSortDirection} onSort={handleLedgerSort} className="text-right" align="right">Date</SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerSlice.map((entry) => {
                    const prospectPath = entry.prospect_id && entry.agent_id ? buildProspectDetailPath({ agentId: entry.agent_id, prospectId: entry.prospect_id }) : null

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="min-w-[240px]">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{ledgerEntryLabel(entry)}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{ledgerEntryDescription(entry)}</span>
                              {entry.exchange_request_id ? <Link to={`/payouts/${entry.exchange_request_id}`} className="underline underline-offset-4 decoration-border transition-colors hover:text-primary hover:decoration-primary">Voir l'échange</Link> : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge className={statusPresentation[entry.entry_status].className}>{statusPresentation[entry.entry_status].label}</Badge></TableCell>
                        <TableCell className={`text-right font-medium ${ledgerDeltaClassName(entry)}`}>{formatSignedPoints(entry.points_delta)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {entry.program_id ? <Link to={`/programs/${entry.program_id}`} className="underline underline-offset-4 decoration-border transition-colors hover:text-primary hover:decoration-primary">{entry.program_name ?? 'Programme'}</Link> : <span className="text-muted-foreground">Sans programme</span>}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {prospectPath ? <Link to={prospectPath} className="underline underline-offset-4 decoration-border transition-colors hover:text-primary hover:decoration-primary">{entry.prospect_name ?? 'Prospect'}</Link> : <span className="text-muted-foreground">Sans prospect</span>}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {entry.transaction_id ? <Link to={`/transactions/${entry.transaction_id}`} className="underline underline-offset-4 decoration-border transition-colors hover:text-primary hover:decoration-primary">{entry.transaction_reference ?? 'Transaction'}</Link> : <span className="text-muted-foreground">Sans transaction</span>}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{entry.effective_at ? formatDashboardDateTimeFr(entry.effective_at) : 'Indisponible'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePaginationBar page={ledgerPage} pageSize={ledgerPageSize} totalItems={totalLedgerEntries} onPageChange={setLedgerPage} onPageSizeChange={setLedgerPageSize} />
          </div>
        )}
      </article>
    </section>
  )
}
