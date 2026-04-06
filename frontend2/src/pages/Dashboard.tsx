import { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Briefcase,
  Building2,
  Clock,
  CreditCard,
  Percent,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ProgramsList } from '@/components/dashboard/ProgramsList';
import { BusinessesList } from '@/components/dashboard/BusinessesList';
import { TopBusinesses } from '@/components/dashboard/TopBusinesses';
import { TopAffiliatesByProspects } from '@/components/dashboard/TopAffiliatesByProspects';
import { getAgentPointsMetrics } from '@/lib/agent-points';
import {
  fetchBusinessDashboardSummary,
  fetchFrontend2DashboardSummary,
  type LiveDashboardSummary,
} from '@/lib/live-data';
import type { Agent, Business, ExchangeRequest, Program, Prospect, Transaction, User, UserRole } from '@/types';

interface DashboardProps {
  role: UserRole;
  user: User;
  programs: Program[];
  businesses: Business[];
  agents: Agent[];
  prospects: Prospect[];
  transactions: Transaction[];
  exchangeRequests: ExchangeRequest[];
}

type StatColor = 'primary' | 'cyan' | 'success' | 'warning';

const getConvertedProspectCount = (
  scopedProspects: Array<{ id: string }>,
  scopedTransactions: Array<{ prospectId: string }>
) => {
  const visibleProspectIds = new Set(scopedProspects.map((prospect) => prospect.id));

  return new Set(
    scopedTransactions
      .map((transaction) => transaction.prospectId)
      .filter((prospectId) => prospectId && visibleProspectIds.has(prospectId))
  ).size;
};

const getCardColor = (tone?: string): StatColor => {
  if (tone === 'success') {
    return 'success';
  }

  if (tone === 'warning') {
    return 'warning';
  }

  if (tone === 'info' || tone === 'cyan') {
    return 'cyan';
  }

  return 'primary';
};

const getBusinessCardIcon = (key: string) => {
  switch (key) {
    case 'prospects_synced':
      return Users;
    case 'clients_converted':
      return TrendingUp;
    case 'prospect_to_client_rate':
      return Percent;
    case 'affiliates_contributors':
      return UserCheck;
    case 'points_auto_awarded':
      return Wallet;
    default:
      return TrendingUp;
  }
};

const getPlatformCardIcon = (key: string) => {
  switch (key) {
    case 'points_totaux':
    case 'points_par_entreprise':
      return TrendingUp;
    case 'points_distribues':
      return Wallet;
    case 'entreprises':
      return Building2;
    case 'affilies_actifs':
    case 'activation_affilies':
      return UserCheck;
    case 'points_en_attente':
      return Clock;
    case 'conversion_globale':
      return Percent;
    default:
      return TrendingUp;
  }
};

const getAgentCardIcon = (key: string) => {
  switch (key) {
    case 'available_points':
      return Wallet;
    case 'cash_exchanged':
      return CreditCard;
    case 'redeemed_points':
      return ArrowRightLeft;
    case 'active_programs':
      return Briefcase;
    case 'my_prospects':
      return Users;
    case 'converted_clients':
      return TrendingUp;
    case 'pending_points':
      return Clock;
    case 'conversion_rate':
      return Percent;
    default:
      return Wallet;
  }
};

export function Dashboard({
  role,
  user,
  programs,
  businesses,
  agents,
  prospects,
  transactions,
  exchangeRequests,
}: DashboardProps) {
  const [dashboardSummary, setDashboardSummary] = useState<LiveDashboardSummary | null>(null);

  useEffect(() => {
    let active = true;

    const loadSummary =
      role === 'business-owner' ? fetchBusinessDashboardSummary : fetchFrontend2DashboardSummary;

    void loadSummary()
      .then((summary) => {
        if (active) {
          setDashboardSummary(summary);
        }
      })
      .catch(() => {
        if (active) {
          setDashboardSummary(null);
        }
      });

    return () => {
      active = false;
    };
  }, [role, programs, businesses, agents, prospects, transactions, exchangeRequests]);

  if (role === 'super-admin') {
    const totalRevenue = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalCommissions = transactions.reduce((sum, transaction) => sum + transaction.commission, 0);
    const pendingCommissionsVolume = transactions
      .filter((transaction) => transaction.status === 'pending')
      .reduce((sum, transaction) => sum + transaction.commission, 0);

    const approvedBusinesses = businesses.filter((business) => business.status === 'approved');
    const arpuBusiness =
      approvedBusinesses.length > 0 ? Math.round(totalRevenue / approvedBusinesses.length) : 0;

    const activatedAgentsCount = new Set(transactions.map((transaction) => transaction.agentId)).size;
    const agentActivationRate =
      agents.length > 0 ? Math.round((activatedAgentsCount / agents.length) * 100) : 0;

    const totalClients = getConvertedProspectCount(prospects, transactions);
    const globalConversionRate =
      prospects.length > 0 ? Math.round((totalClients / prospects.length) * 100) : 0;

    const fallbackCards = [
      {
        key: 'points_totaux',
        title: 'Points totaux',
        value: `${totalRevenue.toLocaleString()} pts`,
        description: 'Volume global genere',
        tone: 'primary',
      },
      {
        key: 'points_distribues',
        title: 'Points distribues',
        value: `${totalCommissions.toLocaleString()} pts`,
        description: 'Total valide par la plateforme',
        tone: 'cyan',
      },
      {
        key: 'entreprises',
        title: 'Entreprises',
        value: businesses.length.toLocaleString(),
        description: `${approvedBusinesses.length} approuvees`,
        tone: 'success',
      },
      {
        key: 'affilies_actifs',
        title: 'Affilies actifs',
        value: agents.length.toLocaleString(),
        description: 'Sur la plateforme',
        tone: 'warning',
      },
      {
        key: 'points_en_attente',
        title: 'Points en attente',
        value: `${pendingCommissionsVolume.toLocaleString()} pts`,
        description: 'Volume a regulariser',
        tone: 'warning',
      },
      {
        key: 'points_par_entreprise',
        title: 'Points / Entr. (ARPU)',
        value: `${arpuBusiness.toLocaleString()} pts`,
        description: 'Moyenne par entreprise',
        tone: 'cyan',
      },
      {
        key: 'activation_affilies',
        title: 'Activation Affilies',
        value: `${agentActivationRate}%`,
        description: 'Affilies ayant performe',
        tone: 'success',
      },
      {
        key: 'conversion_globale',
        title: 'Conversion globale',
        value: `${globalConversionRate}%`,
        description: 'Clients / total prospects',
        tone: 'primary',
      },
    ];

    const cards = dashboardSummary?.cards.length ? dashboardSummary.cards : fallbackCards;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <StatCard
              key={card.key}
              title={card.title}
              value={card.value}
              description={card.description}
              helpText={card.description}
              icon={getPlatformCardIcon(card.key)}
              color={getCardColor(card.tone)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <BusinessesList businesses={businesses} />
            <TopBusinesses businesses={businesses} transactions={transactions} />
          </div>
          <div>
            <RecentActivity
              transactions={transactions}
              prospects={prospects}
              exchangeRequests={exchangeRequests}
            />
          </div>
        </div>
      </div>
    );
  }

  if (role === 'business-owner') {
    const businessId = user.companyId;
    const businessPrograms = programs.filter((program) => program.businessId === businessId);
    const businessProspects = prospects.filter((prospect) => prospect.businessId === businessId);
    const businessTransactions = transactions.filter((transaction) => transaction.businessId === businessId);
    const businessExchangeRequests = exchangeRequests.filter((request) => request.businessId === businessId);

    const totalRevenue = businessTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalCommissions = businessTransactions.reduce((sum, transaction) => sum + transaction.commission, 0);
    const convertedClientsCount = getConvertedProspectCount(businessProspects, businessTransactions);
    const contributingAgentsCount = new Set(
      [
        ...businessProspects.map((prospect) => prospect.agentId),
        ...businessTransactions.map((transaction) => transaction.agentId),
      ].filter(Boolean)
    ).size;
    const businessConversionRate =
      businessProspects.length > 0 ? Math.round((convertedClientsCount / businessProspects.length) * 100) : 0;

    const topAffiliatesByProspects = Array.from(
      businessProspects
        .reduce<Map<string, { id: string; name: string; totalProspects: number }>>((map, prospect) => {
          const existing = map.get(prospect.agentId);

          if (existing) {
            existing.totalProspects += 1;
            return map;
          }

          map.set(prospect.agentId, {
            id: prospect.agentId,
            name: prospect.agentName,
            totalProspects: 1,
          });

          return map;
        }, new Map())
        .values()
    ).sort((left, right) => right.totalProspects - left.totalProspects || left.name.localeCompare(right.name));

    const fallbackCards = [
      {
        key: 'prospects_synced',
        title: 'Prospects synchronises',
        value: businessProspects.length.toLocaleString(),
        description: 'Tous statuts IACRM',
        tone: 'primary',
        helpText: 'Nombre total de prospects synchronises depuis IACRM sur vos programmes.',
      },
      {
        key: 'clients_converted',
        title: 'Clients convertis',
        value: convertedClientsCount.toLocaleString(),
        description: 'Transactions synchronisees',
        tone: 'success',
        helpText: 'Chaque transaction synchronisee correspond ici a un client converti.',
      },
      {
        key: 'prospect_to_client_rate',
        title: 'Taux prospect -> client',
        value: `${businessConversionRate}%`,
        description: 'Conversion via IACRM',
        tone: 'warning',
        helpText: 'Part des prospects synchronises qui ont ensuite genere une transaction client.',
      },
      {
        key: 'affiliates_contributors',
        title: 'Affilies contributeurs',
        value: contributingAgentsCount.toLocaleString(),
        description: 'Sources actives',
        tone: 'primary',
        helpText: 'Affilies qui ont alimente votre pipeline en prospects ou en clients convertis.',
      },
      {
        key: 'points_auto_awarded',
        title: 'Points attribues auto',
        value: `${totalCommissions.toLocaleString()} pts`,
        description: `${totalRevenue.toLocaleString()} pts de volume`,
        tone: 'cyan',
        helpText: 'Points attribues automatiquement a partir des transactions synchronisees.',
      },
    ];

    const cards = dashboardSummary?.cards.length ? dashboardSummary.cards : fallbackCards;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <StatCard
              key={card.key}
              title={card.title}
              value={card.value}
              description={card.description}
              helpText={'badge' in card ? card.badge.helper_text ?? card.description : card.helpText}
              icon={getBusinessCardIcon(card.key)}
              color={getCardColor('badge' in card ? card.badge.tone || card.tone : card.tone)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ProgramsList programs={businessPrograms} />
            <TopAffiliatesByProspects affiliates={topAffiliatesByProspects} />
          </div>
          <div>
            <RecentActivity
              transactions={businessTransactions}
              prospects={businessProspects}
              exchangeRequests={businessExchangeRequests}
            />
          </div>
        </div>
      </div>
    );
  }

  const agentId = user.agentProfileId;
  const agentTransactions = agentId
    ? transactions.filter((transaction) => transaction.agentId === agentId)
    : [];
  const agentProspects = agentId ? prospects.filter((prospect) => prospect.agentId === agentId) : [];
  const agentExchangeRequests = agentId
    ? exchangeRequests.filter((request) => request.agentId === agentId)
    : [];
  const agentMetrics = agentId
    ? getAgentPointsMetrics(agentId, transactions, exchangeRequests)
    : getAgentPointsMetrics('__missing_agent__', [], []);

  const activeProgramIds = new Set(
    [...agentTransactions.map((transaction) => transaction.programId), ...agentProspects.map((prospect) => prospect.programId)]
      .filter(Boolean)
  );
  const agentPrograms = programs.filter((program) => activeProgramIds.has(program.id));
  const activeProgramsCount = agentPrograms.filter((program) => program.status === 'active').length;
  const totalHotProspects = agentProspects.filter((prospect) => prospect.status === 'prospect-chaud').length;
  const totalClients = getConvertedProspectCount(agentProspects, agentTransactions);
  const conversionRate =
    agentProspects.length > 0 ? Math.round((totalClients / agentProspects.length) * 100) : 0;

  const fallbackAgentCards = [
    {
      key: 'available_points',
      title: 'Solde de points disponible',
      value: `${agentMetrics.totalAvailablePoints.toLocaleString()} pts`,
      description: 'Meme solde que la page Points',
      tone: 'primary',
    },
    {
      key: 'cash_exchanged',
      title: 'Argent echange',
      value: `${agentMetrics.totalCashExchanged.toFixed(2)} EUR`,
      description: 'Conversions en argent approuvees',
      tone: 'success',
    },
    {
      key: 'redeemed_points',
      title: 'Points consommes',
      value: `${agentMetrics.totalRedeemed.toLocaleString()} pts`,
      description: 'Points engages dans vos demandes',
      tone: 'warning',
    },
    {
      key: 'active_programs',
      title: 'Programmes actifs',
      value: activeProgramsCount.toLocaleString(),
      description: 'Programmes sur lesquels vous performez',
      tone: 'cyan',
    },
    {
      key: 'my_prospects',
      title: 'Mes prospects',
      value: agentProspects.length.toLocaleString(),
      description: `${totalHotProspects} demandes de devis`,
      tone: 'primary',
    },
    {
      key: 'converted_clients',
      title: 'Clients convertis',
      value: totalClients.toLocaleString(),
      description: `${agentMetrics.totalGeneratedPoints.toLocaleString()} pts attribues`,
      tone: 'cyan',
    },
    {
      key: 'pending_points',
      title: 'Points en attente',
      value: `${agentMetrics.totalPending.toLocaleString()} pts`,
      description: 'Transactions pas encore finalisees',
      tone: 'warning',
    },
    {
      key: 'conversion_rate',
      title: 'Taux de conversion',
      value: `${conversionRate}%`,
      description: 'Prospects devenus clients',
      tone: 'success',
    },
  ];

  const agentCards = dashboardSummary?.cards.length ? dashboardSummary.cards : fallbackAgentCards;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {agentCards.slice(0, 4).map((card, index) => (
          <StatCard
            key={card.key}
            title={card.title}
            value={card.value}
            description={card.description}
            helpText={card.description}
            icon={getAgentCardIcon(card.key)}
            color={getCardColor(card.tone)}
            fullBackground={index === 0}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {agentCards.slice(4).map((card) => (
          <StatCard
            key={card.key}
            title={card.title}
            value={card.value}
            description={card.description}
            helpText={card.description}
            icon={getAgentCardIcon(card.key)}
            color={getCardColor(card.tone)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProgramsList programs={agentPrograms} />
        </div>
        <div>
          <RecentActivity
            transactions={agentTransactions}
            prospects={agentProspects}
            exchangeRequests={agentExchangeRequests}
          />
        </div>
      </div>
    </div>
  );
}
