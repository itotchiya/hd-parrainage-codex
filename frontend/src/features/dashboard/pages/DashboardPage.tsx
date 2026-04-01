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

  const winPanelStyle: React.CSSProperties = {
    background: '#D4D0C8',
    border: '2px solid',
    borderColor: '#FFFFFF #808080 #808080 #FFFFFF',
    padding: '6px',
    fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  if (!isBusinessOwner) {
    return (
      <div style={{ ...winPanelStyle, color: '#808080' }}>
        Dashboard non disponible — réservé aux propriétaires d&apos;entreprise.
      </div>
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
      <div style={winPanelStyle}>
        {/* Win2000-style progress indicator */}
        <div
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid',
            borderColor: '#808080 #FFFFFF #FFFFFF #808080',
            background: '#1084D0',
            animation: 'none',
          }}
        />
        <span style={{ color: '#000080', fontWeight: 'bold' }}>
          Chargement du tableau de bord...
        </span>
      </div>
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
      'Impossible de charger les données du tableau de bord.'

    return (
      <div
        style={{
          background: '#D4D0C8',
          border: '2px solid',
          borderColor: '#FFFFFF #808080 #808080 #FFFFFF',
          padding: '8px',
          fontFamily: 'Tahoma, sans-serif',
          fontSize: '11px',
        }}
      >
        {/* Win2000 error dialog style */}
        <div
          style={{
            background: 'linear-gradient(to right, #800000, #C00000)',
            color: '#FFFFFF',
            padding: '3px 6px',
            fontWeight: 'bold',
            marginBottom: '6px',
          }}
        >
          Erreur — Tableau de bord
        </div>
        <div
          style={{
            background: '#FFFFFF',
            border: '2px solid',
            borderColor: '#808080 #FFFFFF #FFFFFF #808080',
            padding: '8px',
            color: '#800000',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              background: '#FF0000',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '12px',
              flexShrink: 0,
            }}
          >
            !
          </div>
          {message}
        </div>
      </div>
    )
  }

  const programs = programsQuery.data?.data ?? []
  const prospects = prospectsQuery.data?.data ?? []
  const transactions = transactionsQuery.data?.data ?? []
  const pointsLedger = pointsLedgerQuery.data?.data ?? []
  const agents = agentsQuery.data?.data ?? []
  const summaryCards = summaryQuery.data?.data.cards ?? []

  const sortedPrograms = useMemo(() => {
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

  const recentTransactions = [...transactions]
    .sort((a, b) => {
      const left = new Date(a.occurred_at ?? a.created_at ?? 0).getTime()
      const right = new Date(b.occurred_at ?? b.created_at ?? 0).getTime()
      return right - left
    })
    .slice(0, 6)

  const topAffiliatesByProspects = Array.from(
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

  const agentsById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents])

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

  const kpiIcons: Record<DashboardMetricKey, typeof Users> = {
    prospects_synced: Users,
    clients_converted: TrendingUp,
    prospect_to_client_rate: Percent,
    affiliates_contributors: UserCheck,
    points_auto_awarded: Wallet,
  }

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
        fontSize: '11px',
      }}
    >
      {/* KPI cards row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '6px',
        }}
      >
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

      {/* Charts row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '6px',
        }}
      >
        <div>
          <PerformanceProspectsClientsChart prospects={prospects} transactions={transactions} />
        </div>
        <div>
          <PointsBalancePieChart ledgerEntries={pointsLedger} />
        </div>
      </div>

      {/* Tables */}
      <TopAffiliatesByProspectsTable rows={topAffiliateRows} />
      <RecentActivityTable transactions={recentTransactions} />
      <ProgramsOverviewTable
        programs={sortedPrograms}
        defaultBusinessName={user?.primary_business?.display_name ?? undefined}
      />
    </section>
  )
}
