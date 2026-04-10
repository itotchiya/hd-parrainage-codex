import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Gift,
  LayoutGrid,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { fetchPointsSummary, fetchPointsLedger } from '../../points/api'
import { fetchProspects } from '../../prospects/api'
import { fetchTransactions } from '../../transactions/api'
import { fetchPrograms } from '../../programs/api'
import { KpiCard, KpiCardSkeleton } from './KpiCard'
import { PerformanceProspectsClientsChart, PerformanceProspectsClientsChartSkeleton } from './PerformanceProspectsClientsChart'
import { PointsBalancePieChart, PointsBalancePieChartSkeleton } from './PointsBalancePieChart'
import { RecentActivityTable, RecentActivityTableSkeleton } from './RecentActivityTable'
import { AgentRecentProspectsTable, AgentRecentProspectsTableSkeleton } from './AgentRecentProspectsTable'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardMetricBadge, DashboardMetricTrendDirection } from '@/types/dashboard'
import type { ProspectRecord } from '@/types/prospects'
import type { TransactionRecord } from '@/types/transactions'
import type { ProgramRecord } from '@/types/programs'

// ---------------------------------------------------------------------------
// Helpers — month-over-month comparison badges
// ---------------------------------------------------------------------------

function getMonthEntries<T>(
  items: T[],
  getDate: (item: T) => Date | null,
  monthOffset: number,
): T[] {
  const now = new Date()
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const targetYear = targetMonth.getFullYear()
  const targetMo = targetMonth.getMonth()

  return items.filter((item) => {
    const d = getDate(item)
    if (!d) return false
    return d.getFullYear() === targetYear && d.getMonth() === targetMo
  })
}

function monthOverMonthBadge(current: number, previous: number): DashboardMetricBadge {
  const diff = current - previous
  let tone: DashboardMetricBadge['tone'] = 'neutral'
  let icon: DashboardMetricTrendDirection = 'neutral'
  let label = '= Identique'

  if (diff > 0) {
    tone = 'success'
    icon = 'up'
    label = `+${diff} ce mois`
  } else if (diff < 0) {
    tone = 'danger'
    icon = 'down'
    label = `${diff} ce mois`
  }

  return { tone, icon, label }
}

function capitalize(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function safeDate(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function AgentDashboardSkeleton() {
  return (
    <section className="min-w-0 space-y-2.5 sm:space-y-3">
      <div className="flex flex-col gap-2 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Skeleton className="h-6 w-52" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:gap-3 xl:grid-cols-5">
        <article className="rounded-lg bg-card p-3 sm:p-4 xl:col-span-3">
          <PerformanceProspectsClientsChartSkeleton />
        </article>
        <article className="rounded-lg bg-card p-3 sm:p-4 xl:col-span-2">
          <PointsBalancePieChartSkeleton />
        </article>
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <AgentRecentProspectsTableSkeleton />
      </article>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <RecentActivityTableSkeleton />
      </article>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Agent Dashboard
// ---------------------------------------------------------------------------

export function AgentDashboard() {

  const pointsSummaryQuery = useQuery({
    queryKey: ['dashboard', 'agent-points-summary'],
    queryFn: () => fetchPointsSummary(),
  })

  const prospectsQuery = useQuery({
    queryKey: ['dashboard', 'agent-prospects'],
    queryFn: fetchProspects,
  })

  const transactionsQuery = useQuery({
    queryKey: ['dashboard', 'agent-transactions'],
    queryFn: () => fetchTransactions(),
  })

  const pointsLedgerQuery = useQuery({
    queryKey: ['dashboard', 'agent-points-ledger'],
    queryFn: () => fetchPointsLedger(),
  })

  const programsQuery = useQuery({
    queryKey: ['dashboard', 'agent-programs'],
    queryFn: fetchPrograms,
  })

  // Resolved data
  const prospects = useMemo(() => prospectsQuery.data?.data ?? [], [prospectsQuery.data])
  const transactions = useMemo(() => transactionsQuery.data?.data ?? [], [transactionsQuery.data])
  const pointsLedger = useMemo(() => pointsLedgerQuery.data?.data ?? [], [pointsLedgerQuery.data])
  const pointsSummary = pointsSummaryQuery.data?.data ?? null
  const programs = useMemo(() => programsQuery.data?.data ?? [], [programsQuery.data])

  // ---------------------------------------------------------------------------
  // KPI computations
  // ---------------------------------------------------------------------------

  const totalProspects = prospects.filter((p) => !p.deleted_at).length
  const convertedProspects = prospects.filter(
    (p) => !p.deleted_at && p.conversion_status === 'converted',
  ).length

  const totalPointsEarned = pointsSummary
    ? pointsSummary.available_points + pointsSummary.consumed_points
    : 0

  // Programs assigned (active programs where agent is present)
  const assignedActivePrograms = programs.filter(
    (p: ProgramRecord) => p.status === 'active',
  ).length

  // Month-over-month calculations
  const thisMonthProspects = getMonthEntries(
    prospects.filter((p: ProspectRecord) => !p.deleted_at),
    (p: ProspectRecord) => safeDate(p.submitted_at),
    0,
  ).length
  const lastMonthProspects = getMonthEntries(
    prospects.filter((p: ProspectRecord) => !p.deleted_at),
    (p: ProspectRecord) => safeDate(p.submitted_at),
    -1,
  ).length

  const thisMonthConverted = getMonthEntries(
    prospects.filter((p: ProspectRecord) => !p.deleted_at && p.conversion_status === 'converted'),
    (p: ProspectRecord) => safeDate(p.converted_at),
    0,
  ).length
  const lastMonthConverted = getMonthEntries(
    prospects.filter((p: ProspectRecord) => !p.deleted_at && p.conversion_status === 'converted'),
    (p: ProspectRecord) => safeDate(p.converted_at),
    -1,
  ).length

  const thisMonthPoints = getMonthEntries(
    pointsLedger.filter((e) => e.points_delta > 0),
    (e) => safeDate(e.effective_at ?? e.created_at),
    0,
  ).reduce((sum, e) => sum + e.points_delta, 0)
  const lastMonthPoints = getMonthEntries(
    pointsLedger.filter((e) => e.points_delta > 0),
    (e) => safeDate(e.effective_at ?? e.created_at),
    -1,
  ).reduce((sum, e) => sum + e.points_delta, 0)

  // Recent prospects (last 5, sorted by submission date)
  const recentProspects = useMemo(() => {
    return [...prospects]
      .filter((p) => !p.deleted_at)
      .sort((a, b) => {
        const ta = new Date(a.submitted_at ?? a.first_synced_at ?? 0).getTime()
        const tb = new Date(b.submitted_at ?? b.first_synced_at ?? 0).getTime()
        return tb - ta
      })
      .slice(0, 5)
  }, [prospects])

  // Recent transactions (last 5)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a: TransactionRecord, b: TransactionRecord) => {
        const la = new Date(a.occurred_at ?? a.created_at ?? 0).getTime()
        const lb = new Date(b.occurred_at ?? b.created_at ?? 0).getTime()
        return lb - la
      })
      .slice(0, 5)
  }, [transactions])

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (
    pointsSummaryQuery.isPending ||
    prospectsQuery.isPending ||
    transactionsQuery.isPending ||
    pointsLedgerQuery.isPending ||
    programsQuery.isPending
  ) {
    return <AgentDashboardSkeleton />
  }

  if (
    pointsSummaryQuery.isError ||
    prospectsQuery.isError ||
    transactionsQuery.isError ||
    pointsLedgerQuery.isError ||
    programsQuery.isError
  ) {
    const message =
      (pointsSummaryQuery.error as ApiError | undefined)?.message ??
      (prospectsQuery.error as ApiError | undefined)?.message ??
      (transactionsQuery.error as ApiError | undefined)?.message ??
      (pointsLedgerQuery.error as ApiError | undefined)?.message ??
      (programsQuery.error as ApiError | undefined)?.message ??
      'Unable to load dashboard data.'

    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
        {message}
      </section>
    )
  }

  const monthLabel = capitalize(
    new Date().toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    }),
  )

  return (
    <section className="min-w-0 space-y-2.5 sm:space-y-3">
      <PageHeader
        title={`Ma performance — ${monthLabel}`}
        right={
          <PageHeaderToolbar>
            <Button asChild variant="default" size="sm" className="w-auto self-start gap-2">
              <Link to="/prospects">
                <Plus className="size-4" aria-hidden />
                Nouveau prospect
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-auto self-start gap-2">
              <Link to="/payouts">
                <Gift className="size-4" aria-hidden />
                Échanger mes points
              </Link>
            </Button>
          </PageHeaderToolbar>
        }
      />

      {/* ── KPI strip — 4 cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Mes Prospects"
          value={totalProspects.toLocaleString('fr-FR')}
          description="Total prospects soumis"
          badge={monthOverMonthBadge(thisMonthProspects, lastMonthProspects)}
          icon={Users}
          tone="primary"
        />
        <KpiCard
          title="Clients Convertis"
          value={convertedProspects.toLocaleString('fr-FR')}
          description="Prospects devenus clients"
          badge={monthOverMonthBadge(thisMonthConverted, lastMonthConverted)}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          title="Points Acquis"
          value={totalPointsEarned.toLocaleString('fr-FR')}
          description="Total points gagnés"
          badge={monthOverMonthBadge(thisMonthPoints, lastMonthPoints)}
          icon={Gift}
          tone="info"
        />
        <KpiCard
          title="Programmes Assignés"
          value={assignedActivePrograms.toLocaleString('fr-FR')}
          description="Programmes actifs"
          badge={{ tone: 'neutral', label: 'Actifs', icon: null }}
          icon={LayoutGrid}
          tone="warning"
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2.5 md:gap-3 xl:grid-cols-5">
        <article className="rounded-lg bg-card p-3 sm:p-4 xl:col-span-3">
          <PerformanceProspectsClientsChart prospects={prospects} transactions={transactions} />
        </article>

        <article className="rounded-lg bg-card p-3 sm:p-4 xl:col-span-2">
          <PointsBalancePieChart ledgerEntries={pointsLedger} />
        </article>
      </div>

      {/* ── Recent prospects ─────────────────────────────────────── */}
      <article className="rounded-lg bg-card p-3 sm:p-4">
        <AgentRecentProspectsTable prospects={recentProspects} />
      </article>

      {/* ── Recent transactions ──────────────────────────────────── */}
      <article className="rounded-lg bg-card p-3 sm:p-4">
        <RecentActivityTable transactions={recentTransactions} />
      </article>
    </section>
  )
}
