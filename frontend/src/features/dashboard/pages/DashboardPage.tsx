import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Percent, Plus, TrendingUp, UserCheck, Users, Wallet } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { isCurrentBusinessAgent, isCurrentBusinessOwner, isSuperAdminUser } from '../../../lib/auth-scope'
import { useAuthSession } from '../../auth/session'
import { fetchAgents } from '../../agents/api'
import { fetchBusinessDashboardSummary } from '../api'
import { fetchPointsLedger } from '../../points/api'
import { fetchPrograms } from '../../programs/api'
import { fetchProspects } from '../../prospects/api'
import { fetchTransactions } from '../../transactions/api'
import { PointsBalancePieChart } from '../components/PointsBalancePieChart'
import { PerformanceProspectsClientsChart } from '../components/PerformanceProspectsClientsChart'
import { ProgramsOverviewTable } from '../components/ProgramsOverviewTable'
import { RecentActivityTable } from '../components/RecentActivityTable'
import { TopAffiliatesByProspectsTable } from '../components/TopAffiliatesByProspectsTable'
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProgramRecord } from '../../../types/programs'
import type { DashboardMetricCardRecord, DashboardMetricKey } from '../../../types/dashboard'
import { PerformanceProspectsClientsChartSkeleton } from '../components/PerformanceProspectsClientsChart'
import { PointsBalancePieChartSkeleton } from '../components/PointsBalancePieChart'
import { TopAffiliatesByProspectsTableSkeleton } from '../components/TopAffiliatesByProspectsTable'
import { RecentActivityTableSkeleton } from '../components/RecentActivityTable'
import { ProgramsOverviewTableSkeleton } from '../components/ProgramsOverviewTable'
import { PlatformDashboard } from '../components/PlatformDashboard'
import { AgentDashboard } from '../components/AgentDashboard'

function capitalize(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function DashboardPageSkeleton() {
  return (
    <section className="min-w-0 space-y-2.5 sm:space-y-3">
      <div className="flex flex-col gap-2 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
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
        <TopAffiliatesByProspectsTableSkeleton />
      </article>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <RecentActivityTableSkeleton />
      </article>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <ProgramsOverviewTableSkeleton />
      </article>
    </section>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuthSession()
  const isSuperAdmin = isSuperAdminUser(user)
  const isBusinessOwner = isCurrentBusinessOwner(user)
  const isAgent = isCurrentBusinessAgent(user)

  const programsQuery = useQuery({
    queryKey: ['dashboard', 'programs'],
    queryFn: fetchPrograms,
    enabled: isBusinessOwner,
  })
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'business-summary'],
    queryFn: fetchBusinessDashboardSummary,
    enabled: isBusinessOwner,
  })
  const prospectsQuery = useQuery({
    queryKey: ['dashboard', 'prospects'],
    queryFn: fetchProspects,
    enabled: isBusinessOwner,
  })
  const transactionsQuery = useQuery({
    queryKey: ['dashboard', 'transactions'],
    queryFn: () => fetchTransactions(),
    enabled: isBusinessOwner,
  })
  const pointsLedgerQuery = useQuery({
    queryKey: ['dashboard', 'points-ledger'],
    queryFn: () => fetchPointsLedger(),
    enabled: isBusinessOwner,
  })
  const agentsQuery = useQuery({
    queryKey: ['dashboard', 'agents'],
    queryFn: fetchAgents,
    enabled: isBusinessOwner,
  })

  const programs = useMemo(() => programsQuery.data?.data ?? [], [programsQuery.data])
  const prospects = useMemo(() => prospectsQuery.data?.data ?? [], [prospectsQuery.data])
  const transactions = useMemo(() => transactionsQuery.data?.data ?? [], [transactionsQuery.data])
  const pointsLedger = useMemo(() => pointsLedgerQuery.data?.data ?? [], [pointsLedgerQuery.data])
  const agents = useMemo(() => agentsQuery.data?.data ?? [], [agentsQuery.data])
  const summaryCards = summaryQuery.data?.data.cards ?? []

  const sortedPrograms = useMemo(() => {
    if (programs.length === 0) return []
    const order: Record<ProgramRecord['status'], number> = {
      active: 0,
      paused: 1,
      suspended: 2,
      draft: 3,
      archived: 4,
    }
    return [...programs].sort((a, b) => {
      const diff = order[a.status] - order[b.status]
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name, 'fr')
    })
  }, [programs])

  const agentsById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents])

  const topAffiliatesByProspects = useMemo(() => {
    if (prospects.length === 0) return []
    return Array.from(
      prospects.reduce<Map<string, { id: string; name: string; totalProspects: number }>>(
        (acc, prospect) => {
          const existing = acc.get(prospect.agent_id)
          if (existing) {
            existing.totalProspects += 1
            return acc
          }

          acc.set(prospect.agent_id, {
            id: prospect.agent_id,
            name: prospect.agent_name ?? 'Unknown affiliate',
            totalProspects: 1,
          })
          return acc
        },
        new Map(),
      ).values(),
    )
      .sort((a, b) => b.totalProspects - a.totalProspects || a.name.localeCompare(b.name))
      .slice(0, 5)
  }, [prospects])

  const topAffiliateRows = useMemo(() => {
    return topAffiliatesByProspects.map((aff, index) => {
      const agent = agentsById.get(aff.id)
      const joinedAt = agent?.activated_at ?? agent?.invited_at ?? agent?.created_at ?? null
      return {
        rank: index + 1,
        agentId: aff.id,
        displayName: agent?.display_name?.trim() || aff.name,
        email: agent?.email ?? null,
        avatarUrl: agent?.avatar_url ?? null,
        status: agent?.status ?? null,
        joinedAt,
        prospectCount: aff.totalProspects,
      }
    })
  }, [agentsById, topAffiliatesByProspects])

  const recentTransactions = useMemo(() => {
    if (transactions.length === 0) return []
    return [...transactions]
      .sort((a, b) => {
        const left = new Date(a.occurred_at ?? a.created_at ?? 0).getTime()
        const right = new Date(b.occurred_at ?? b.created_at ?? 0).getTime()
        return right - left
      })
      .slice(0, 5)
  }, [transactions])

  const kpiIcons: Record<DashboardMetricKey, typeof Users> = {
    prospects_synced: Users,
    clients_converted: TrendingUp,
    prospect_to_client_rate: Percent,
    affiliates_contributors: UserCheck,
    points_auto_awarded: Wallet,
  }

  // Role-based dashboard routing
  // Priority: super-admin → business owner → agent → platform fallback
  if (isSuperAdmin) {
    return <PlatformDashboard />
  }

  if (!isBusinessOwner) {
    if (isAgent) {
      return <AgentDashboard />
    }
    return <PlatformDashboard />
  }

  if (
    summaryQuery.isPending ||
    programsQuery.isPending ||
    prospectsQuery.isPending ||
    transactionsQuery.isPending ||
    pointsLedgerQuery.isPending ||
    agentsQuery.isPending
  ) {
    return <DashboardPageSkeleton />
  }

  if (
    summaryQuery.isError ||
    programsQuery.isError ||
    prospectsQuery.isError ||
    transactionsQuery.isError ||
    pointsLedgerQuery.isError ||
    agentsQuery.isError
  ) {
    const message =
      (summaryQuery.error as ApiError | undefined)?.message ??
      (programsQuery.error as ApiError | undefined)?.message ??
      (prospectsQuery.error as ApiError | undefined)?.message ??
      (transactionsQuery.error as ApiError | undefined)?.message ??
      (pointsLedgerQuery.error as ApiError | undefined)?.message ??
      (agentsQuery.error as ApiError | undefined)?.message ??
      t('dashboard.errors.loadFailed')

    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {message}
      </section>
    )
  }

  const monthLabel = capitalize(
    new Date().toLocaleDateString(t('language') === 'fr' ? 'fr-FR' : 'en-US', {
      month: 'long',
      year: 'numeric',
    }),
  )

  return (
    <section className="min-w-0 space-y-2.5 sm:space-y-3">
      <PageHeader
        title={`${t('dashboard.performanceTitle')} — ${monthLabel}`}
        right={
          <PageHeaderToolbar>
            <Button asChild variant="default" size="sm" className="w-auto self-start gap-2">
              <Link to="/agents">
                <Plus className="size-4" aria-hidden />
                {t('dashboard.addAffiliate')}
              </Link>
            </Button>
          </PageHeaderToolbar>
        }
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card: DashboardMetricCardRecord) => (
          <KpiCard
            key={card.key}
            title={card.title}
            value={card.value}
            description={card.description}
            badge={card.badge}
            icon={kpiIcons[card.key]}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:gap-3 xl:grid-cols-5">
        <article className="rounded-lg bg-card p-3 sm:p-4 xl:col-span-3">
          <PerformanceProspectsClientsChart prospects={prospects} transactions={transactions} />
        </article>

        <article className="rounded-lg bg-card p-3 sm:p-4 xl:col-span-2">
          <PointsBalancePieChart ledgerEntries={pointsLedger} />
        </article>
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <TopAffiliatesByProspectsTable rows={topAffiliateRows} />
      </article>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <RecentActivityTable transactions={recentTransactions} />
      </article>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <ProgramsOverviewTable
          programs={sortedPrograms.slice(0, 5)}
          defaultBusinessName={user?.primary_business?.display_name ?? undefined}
        />
      </article>
    </section>
  )
}
