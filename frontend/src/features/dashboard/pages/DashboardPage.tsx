import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Percent, TrendingUp, UserCheck, Users, Wallet } from 'lucide-react'
import { ApiError } from '../../../lib/api'
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
import { KpiCard } from '../components/KpiCard'
import type { ProgramRecord } from '../../../types/programs'
import type { DashboardMetricCardRecord, DashboardMetricKey } from '../../../types/dashboard'

export function DashboardPage() {
  const { user } = useAuthSession()
  const isBusinessOwner = Boolean(
    user?.roles.some((role) => role.slug === 'business-owner' || role.name === 'Business Owner'),
  )

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
    queryFn: fetchTransactions,
    enabled: isBusinessOwner,
  })
  const pointsLedgerQuery = useQuery({
    queryKey: ['dashboard', 'points-ledger'],
    queryFn: fetchPointsLedger,
    enabled: isBusinessOwner,
  })
  const agentsQuery = useQuery({
    queryKey: ['dashboard', 'agents'],
    queryFn: fetchAgents,
    enabled: isBusinessOwner,
  })

  const programs = programsQuery.data?.data ?? []
  const prospects = prospectsQuery.data?.data ?? []
  const transactions = transactionsQuery.data?.data ?? []
  const pointsLedger = pointsLedgerQuery.data?.data ?? []
  const agents = agentsQuery.data?.data ?? []
  const summaryCards = summaryQuery.data?.data.cards ?? []

  const sortedPrograms = useMemo(() => {
    if (programs.length === 0) return []
    const order: Record<ProgramRecord['status'], number> = {
      active: 0,
      paused: 1,
      draft: 2,
      archived: 3,
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
      .slice(0, 8)
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
      .slice(0, 6)
  }, [transactions])

  const kpiIcons: Record<DashboardMetricKey, typeof Users> = {
    prospects_synced: Users,
    clients_converted: TrendingUp,
    prospect_to_client_rate: Percent,
    affiliates_contributors: UserCheck,
    points_auto_awarded: Wallet,
  }

  if (!isBusinessOwner) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Dashboard customization is currently focused on the business-owner experience first.
      </section>
    )
  }

  if (
    summaryQuery.isPending ||
    programsQuery.isPending ||
    prospectsQuery.isPending ||
    transactionsQuery.isPending ||
    pointsLedgerQuery.isPending ||
    agentsQuery.isPending
  ) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading business dashboard...
      </section>
    )
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
      'Unable to load dashboard data.'

    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {message}
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
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

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <article className="app-card-padding rounded-lg bg-card xl:col-span-3">
          <PerformanceProspectsClientsChart prospects={prospects} transactions={transactions} />
        </article>

        <article className="app-card-padding rounded-lg bg-card xl:col-span-2">
          <PointsBalancePieChart ledgerEntries={pointsLedger} />
        </article>
      </div>

      <article className="app-card-padding rounded-lg bg-card">
        <TopAffiliatesByProspectsTable rows={topAffiliateRows} />
      </article>

      <article className="app-card-padding rounded-lg bg-card">
        <RecentActivityTable transactions={recentTransactions} />
      </article>

      <article className="app-card-padding rounded-lg bg-card">
        <ProgramsOverviewTable
          programs={sortedPrograms}
          defaultBusinessName={user?.primary_business?.display_name ?? undefined}
        />
      </article>
    </section>
  )
}
