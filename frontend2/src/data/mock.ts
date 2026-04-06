import type {
  Agent,
  Business,
  DashboardStats,
  ExchangePack,
  Notification,
  Payout,
  Program,
  Prospect,
  Transaction,
  User,
} from '@/types';

type AgentSeed = {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  leadBase: string;
  programs: string[];
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const addDays = (isoDate: string, days: number) => {
  const nextDate = new Date(isoDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString();
};

export const currentUser: User = {
  id: 'user-1',
  name: 'havetdigital',
  email: 'contact@havetdigital.fr',
  role: 'super-admin',
  status: 'active',
  createdAt: '2024-01-15T10:00:00Z',
};

const agentSeeds: AgentSeed[] = [
  {
    id: 'agent-1',
    userId: 'user-3',
    name: 'Pierre Bernard',
    email: 'pierre.bernard@gmail.com',
    createdAt: '2024-02-10T09:15:00Z',
    leadBase: 'Atlas',
    programs: ['prog-1', 'prog-2', 'prog-3'],
  },
  {
    id: 'agent-2',
    userId: 'user-4',
    name: 'Sophie Leroy',
    email: 'sophie.leroy@marketing-pro.fr',
    createdAt: '2024-02-15T11:45:00Z',
    leadBase: 'Mistral',
    programs: ['prog-1', 'prog-2'],
  },
  {
    id: 'agent-3',
    userId: 'user-6',
    name: 'Thomas Moreau',
    email: 'thomas.moreau@email.com',
    createdAt: '2024-02-20T08:30:00Z',
    leadBase: 'Nova',
    programs: ['prog-3'],
  },
  {
    id: 'agent-4',
    userId: 'user-7',
    name: 'Nadia El Amrani',
    email: 'nadia.elamrani@partnerhub.ma',
    createdAt: '2024-02-24T09:00:00Z',
    leadBase: 'Sirocco',
    programs: ['prog-1'],
  },
  {
    id: 'agent-5',
    userId: 'user-8',
    name: 'Karim Ouali',
    email: 'karim.ouali@b2bconnect.fr',
    createdAt: '2024-02-28T10:20:00Z',
    leadBase: 'Cedar',
    programs: ['prog-2'],
  },
  {
    id: 'agent-6',
    userId: 'user-9',
    name: 'Salma Idrissi',
    email: 'salma.idrissi@growthcircle.ma',
    createdAt: '2024-03-03T14:00:00Z',
    leadBase: 'Dune',
    programs: ['prog-3'],
  },
  {
    id: 'agent-7',
    userId: 'user-10',
    name: 'Yassine Berrada',
    email: 'yassine.berrada@leadbridge.io',
    createdAt: '2024-03-06T09:40:00Z',
    leadBase: 'Orion',
    programs: ['prog-1', 'prog-3'],
  },
  {
    id: 'agent-8',
    userId: 'user-11',
    name: 'Lina Haddad',
    email: 'lina.haddad@revopslab.co',
    createdAt: '2024-03-09T13:20:00Z',
    leadBase: 'Pulsar',
    programs: ['prog-2'],
  },
  {
    id: 'agent-9',
    userId: 'user-12',
    name: 'Mehdi Rahali',
    email: 'mehdi.rahali@partnerflow.net',
    createdAt: '2024-03-12T10:10:00Z',
    leadBase: 'Vertex',
    programs: ['prog-1', 'prog-2'],
  },
  {
    id: 'agent-10',
    userId: 'user-14',
    name: 'Imane Jaziri',
    email: 'imane.jaziri@marketlink.ma',
    createdAt: '2024-03-16T15:00:00Z',
    leadBase: 'Helios',
    programs: ['prog-3'],
  },
];

export const users: User[] = [
  currentUser,
  {
    id: 'user-2',
    name: 'Marie Martin',
    email: 'marie@techsolutions.fr',
    role: 'business-owner',
    companyId: 'biz-1',
    status: 'active',
    createdAt: '2024-02-01T14:30:00Z',
  },
  {
    id: 'user-5',
    name: 'Lucas Petit',
    email: 'lucas@consulting-expert.fr',
    role: 'business-owner',
    companyId: 'biz-2',
    status: 'active',
    createdAt: '2024-03-01T16:00:00Z',
  },
  {
    id: 'user-13',
    name: 'Sanae Boussoufi',
    email: 'sanae@digitalagencypro.fr',
    role: 'business-owner',
    companyId: 'biz-3',
    status: 'active',
    createdAt: '2024-03-10T10:00:00Z',
  },
  ...agentSeeds.map<User>((agent) => ({
    id: agent.userId,
    name: agent.name,
    email: agent.email,
    role: 'agent',
    status: 'active',
    createdAt: agent.createdAt,
  })),
];

export const businesses: Business[] = [
  {
    id: 'biz-1',
    name: 'havetdigital',
    ownerId: 'user-2',
    status: 'approved',
    industry: 'Technologie & Conseil',
    website: 'https://havetdigital.fr',
    createdAt: '2024-02-01T14:30:00Z',
  },
  {
    id: 'biz-2',
    name: 'Consulting Expert',
    ownerId: 'user-5',
    status: 'approved',
    industry: 'Conseil',
    website: 'https://consulting-expert.fr',
    createdAt: '2024-03-01T16:00:00Z',
  },
  {
    id: 'biz-3',
    name: 'Digital Agency Pro',
    ownerId: 'user-13',
    status: 'pending',
    industry: 'Marketing Digital',
    website: 'https://digitalagencypro.fr',
    createdAt: '2024-03-10T10:00:00Z',
  },
];

export const programs: Program[] = [
  {
    id: 'prog-1',
    name: 'Creation de Sites Vitrines',
    description:
      'Aidez les entreprises a lancer leur presence en ligne avec des sites vitrines modernes, responsives et optimises SEO.',
    businessId: 'biz-1',
    businessName: 'havetdigital',
    commissionType: 'per-transaction',
    exchangeMode: 'both',
    pointsPerTransaction: 1000,
    pointsPerEuro: 100,
    exchangePackId: 'starter',
    redemptionOptions: ['Audit SEO express', 'Landing page offerte'],
    status: 'active',
    eligibilityCriteria: 'Reseau B2B (artisans, TPE, commercants)',
    createdAt: '2024-02-05T10:00:00Z',
  },
  {
    id: 'prog-2',
    name: 'SaaS & Automatisation sur mesure',
    description:
      'Recommandez notre expertise en outils SaaS et automatisation des processus metiers pour les PME en croissance.',
    businessId: 'biz-1',
    businessName: 'havetdigital',
    commissionType: 'per-transaction',
    exchangeMode: 'both',
    pointsPerTransaction: 2250,
    pointsPerEuro: 120,
    exchangePackId: 'digital',
    redemptionOptions: ['Pack automatisation starter', 'Credit accompagnement SaaS'],
    status: 'active',
    eligibilityCriteria: 'Reseau de decideurs, PME en croissance, tech',
    createdAt: '2024-03-05T14:00:00Z',
  },
  {
    id: 'prog-3',
    name: 'Solutions Print & Identite Visuelle',
    description:
      'Cartes de visite, plaquettes commerciales, flyers et supports de communication de haute qualite.',
    businessId: 'biz-1',
    businessName: 'havetdigital',
    commissionType: 'revenue-tier',
    exchangeMode: 'both',
    pointsPerTransaction: 780,
    pointsPerEuro: 90,
    exchangePackId: 'premium',
    redemptionOptions: ['Pack cartes de visite premium', 'Refonte mini charte visuelle'],
    status: 'active',
    eligibilityCriteria: 'Reseau cherchant a ameliorer son image de marque',
    createdAt: '2024-03-12T09:00:00Z',
  },
];

export const exchangePacks: ExchangePack[] = [
  {
    id: 'starter',
    name: 'Starter',
    items: [
      { id: 'starter-item-1', label: 'Audit SEO gratuit pour votre site', pointsCost: 500 },
      { id: 'starter-item-2', label: '-10% sur landing page de votre business', pointsCost: 800 },
      { id: 'starter-item-3', label: 'Pack cartes de visite offert', pointsCost: 1200 },
    ],
    updatedAt: '2024-03-01T10:00:00Z',
  },
  {
    id: 'digital',
    name: 'Digital',
    items: [
      { id: 'digital-item-1', label: 'Landing page offerte', pointsCost: 1500 },
      { id: 'digital-item-2', label: 'Credit automation', pointsCost: 2250 },
      { id: 'digital-item-3', label: 'Mini tunnel de conversion', pointsCost: 2800 },
    ],
    updatedAt: '2024-03-05T10:00:00Z',
  },
  {
    id: 'premium',
    name: 'Premium',
    items: [
      { id: 'premium-item-1', label: 'Coaching business 1h', pointsCost: 900 },
      { id: 'premium-item-2', label: 'Sprint design', pointsCost: 1500 },
      { id: 'premium-item-3', label: 'Pack accompagnement VIP', pointsCost: 2400 },
    ],
    updatedAt: '2024-03-10T10:00:00Z',
  },
];

export const programPointRedemptions = {
  'prog-1': [
    {
      id: 'reward-prog-1-1',
      title: 'Audit SEO express',
      description: 'Analyse rapide du site et plan d actions priorise.',
      pointsCost: 1000,
      delivery: 'Livraison en 48h',
      type: 'service',
    },
    {
      id: 'reward-prog-1-2',
      title: 'Landing page offerte',
      description: 'Creation d une page de conversion pour une campagne ciblee.',
      pointsCost: 2500,
      delivery: 'Design + integration',
      type: 'bonus',
    },
  ],
  'prog-2': [
    {
      id: 'reward-prog-2-1',
      title: 'Pack automatisation starter',
      description: 'Mise en place d un scenario simple Make ou Zapier.',
      pointsCost: 1500,
      delivery: '1 workflow livre',
      type: 'service',
    },
    {
      id: 'reward-prog-2-2',
      title: 'Credit accompagnement SaaS',
      description: 'Bon de reduction sur un projet d automatisation sur mesure.',
      pointsCost: 2250,
      delivery: 'Credit projet de 300 EUR',
      type: 'credit',
    },
  ],
  'prog-3': [
    {
      id: 'reward-prog-3-1',
      title: 'Pack cartes de visite premium',
      description: 'Impression premium avec finition soft touch.',
      pointsCost: 500,
      delivery: '250 exemplaires',
      type: 'print',
    },
    {
      id: 'reward-prog-3-2',
      title: 'Refonte mini charte visuelle',
      description: 'Palette, typographie et declinaisons essentielles.',
      pointsCost: 780,
      delivery: 'Livraison sous 5 jours',
      type: 'design',
    },
  ],
} as const;

const programById = Object.fromEntries(programs.map((program) => [program.id, program]));
const prospectStatuses: Prospect['status'][] = [
  'suspect',
  'prospect-froid',
  'prospect-tiede',
  'prospect-chaud',
];
const companyVariants = ['Conseil', 'Retail', 'Studio', 'Labs'];

export const prospects: Prospect[] = agentSeeds.flatMap((agent, agentIndex) =>
  prospectStatuses.map((status, statusIndex) => {
    const programId = agent.programs[statusIndex % agent.programs.length];
    const program = programById[programId];
    const clientName = `${agent.leadBase} ${companyVariants[statusIndex]}`;
    const clientEmail = `${slugify(agent.leadBase)}-${statusIndex + 1}@example.fr`;
    const submittedAt = new Date(
      Date.UTC(2024, 1 + Math.floor(agentIndex / 3), 3 + agentIndex * 2 + statusIndex, 9 + statusIndex, 15)
    ).toISOString();

    return {
      id: `prosp-${agent.id}-${status}`,
      agentId: agent.id,
      agentName: agent.name,
      programId,
      programName: program.name,
      businessId: program.businessId,
      businessName: program.businessName,
      clientName,
      clientEmail,
      clientPhone: `+212 6${String(70000000 + agentIndex * 111111 + statusIndex * 2222).slice(0, 8)}`,
      status,
      submittedAt,
    };
  })
);

const hotProspects = prospects.filter((prospect) => prospect.status === 'prospect-chaud');
const transactionStatuses: Transaction['status'][] = ['paid', 'validated', 'pending'];

export const transactions: Transaction[] = hotProspects.map((prospect, index) => {
  const program = programById[prospect.programId];
  const amountByProgram: Record<string, number> = {
    'prog-1': 18000 + index * 1200,
    'prog-2': 26000 + index * 1500,
    'prog-3': 9500 + index * 700,
  };
  const status = transactionStatuses[index % transactionStatuses.length];

  return {
    id: `trans-${index + 1}`,
    prospectId: prospect.id,
    agentId: prospect.agentId,
    agentName: prospect.agentName,
    programId: prospect.programId,
    programName: prospect.programName,
    businessId: prospect.businessId,
    businessName: prospect.businessName,
    clientName: prospect.clientName,
    amount: amountByProgram[prospect.programId],
    currency: 'PTS',
    commission: program.pointsPerTransaction ?? 0,
    status,
    invoiceStatus: status === 'pending' ? 'pending' : 'paid',
    createdAt: addDays(prospect.submittedAt, 10 + (index % 4)),
  };
});

export const payouts: Payout[] = [
  {
    id: 'pay-1',
    agentId: 'agent-1',
    agentName: 'Pierre Bernard',
    amount: 900,
    currency: 'PTS',
    status: 'completed',
    requestedAt: '2024-03-20T09:00:00Z',
    processedAt: '2024-03-23T14:00:00Z',
  },
  {
    id: 'pay-2',
    agentId: 'agent-2',
    agentName: 'Sophie Leroy',
    amount: 600,
    currency: 'PTS',
    status: 'completed',
    requestedAt: '2024-03-18T10:30:00Z',
    processedAt: '2024-03-21T16:00:00Z',
  },
  {
    id: 'pay-3',
    agentId: 'agent-3',
    agentName: 'Thomas Moreau',
    amount: 300,
    currency: 'PTS',
    status: 'requested',
    requestedAt: '2024-03-26T11:00:00Z',
  },
  {
    id: 'pay-4',
    agentId: 'agent-4',
    agentName: 'Nadia El Amrani',
    amount: 400,
    currency: 'PTS',
    status: 'completed',
    requestedAt: '2024-03-24T09:15:00Z',
    processedAt: '2024-03-25T10:00:00Z',
  },
  {
    id: 'pay-5',
    agentId: 'agent-6',
    agentName: 'Salma Idrissi',
    amount: 250,
    currency: 'PTS',
    status: 'processing',
    requestedAt: '2024-03-27T13:20:00Z',
  },
];

const payoutsByAgent = payouts.reduce<Record<string, number>>((accumulator, payout) => {
  if (payout.status === 'rejected') {
    return accumulator;
  }

  accumulator[payout.agentId] = (accumulator[payout.agentId] || 0) + payout.amount;
  return accumulator;
}, {});

export const agents: Agent[] = agentSeeds.map((seed) => {
  const agentTransactions = transactions.filter((transaction) => transaction.agentId === seed.id);
  const totalEarnings = agentTransactions.reduce((sum, transaction) => sum + transaction.commission, 0);
  const pendingCommissions = agentTransactions
    .filter((transaction) => transaction.status === 'pending' || transaction.status === 'validated')
    .reduce((sum, transaction) => sum + transaction.commission, 0);
  const availableBalance = Math.max(totalEarnings - (payoutsByAgent[seed.id] || 0), 0);

  return {
    id: seed.id,
    userId: seed.userId,
    name: seed.name,
    email: seed.email,
    status: 'approved',
    programs: seed.programs,
    totalEarnings,
    availableBalance,
    pendingCommissions,
    createdAt: seed.createdAt,
  };
});

const convertedProspectCount = new Set(transactions.map((transaction) => transaction.prospectId)).size;

export const dashboardStats: DashboardStats = {
  totalRevenue: transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
  totalCommissions: transactions.reduce((sum, transaction) => sum + transaction.commission, 0),
  totalBusinesses: businesses.length,
  totalPrograms: programs.length,
  totalAgents: agents.length,
  conversionRate: prospects.length > 0 ? Math.round((convertedProspectCount / prospects.length) * 100) : 0,
  activePrograms: programs.filter((program) => program.status === 'active').length,
  pendingApplications: businesses.filter((business) => business.status === 'pending').length,
};

export const notifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Nouvelle synchronisation IACRM',
    message: '10 affilies actifs, 40 prospects synchronises et 10 clients convertis sont maintenant visibles.',
    type: 'info',
    read: false,
    createdAt: '2024-03-28T08:00:00Z',
    audience: ['super-admin', 'business-owner'],
  },
  {
    id: 'notif-2',
    title: 'Programme actif',
    message: 'Les 3 programmes Havetdigital sont disponibles pour vos affilies invites.',
    type: 'success',
    read: false,
    createdAt: '2024-03-27T10:00:00Z',
    audience: ['business-owner'],
  },
  {
    id: 'notif-3',
    title: 'Nouveaux clients convertis',
    message: 'De nouvelles transactions synchronisees depuis IACRM ont genere automatiquement des points.',
    type: 'info',
    read: true,
    createdAt: '2024-03-26T15:30:00Z',
    audience: ['business-owner', 'super-admin'],
  },
];

export const iacrmProducts = [
  { id: 'prod-1', name: 'Site Vitrine Standard', category: 'Web' },
  { id: 'prod-2', name: 'Site E-commerce', category: 'Web' },
  { id: 'prod-3', name: 'Logiciel SaaS RH', category: 'Logiciel' },
  { id: 'prod-4', name: 'Automatisation Make/Zapier', category: 'Service' },
  { id: 'prod-5', name: 'Impression Plaquettes (1000ex)', category: 'Print' },
  { id: 'prod-6', name: 'Identite Visuelle Complete', category: 'Design' },
  { id: 'prod-7', name: 'Consulting SEO B2B', category: 'Conseil' },
];
