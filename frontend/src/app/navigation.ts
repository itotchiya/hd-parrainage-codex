export interface AppModuleRoute {
  path: string
  label: string
  icon: NavigationIconKey
  title: string
  eyebrow: string
  description: string
  permissions: string[]
}

export type NavigationIconKey =
  | 'dashboard'
  | 'businesses'
  | 'programs'
  | 'exchange-packs'
  | 'agents'
  | 'prospects'
  | 'transactions'
  | 'points'
  | 'exchanges'
  | 'notifications'
  | 'settings'
  | 'iacrm'

export const dashboardPermissionIds = [
  'dashboard.view-platform',
  'dashboard.view-business',
  'dashboard.view-own',
]

export const settingsPermissionIds = [
  'settings.view-platform',
  'settings.view-business',
  'settings.view-own',
]

export const dashboardRoute: AppModuleRoute = {
  path: '/dashboard',
  label: 'Tableau de bord',
  icon: 'dashboard',
  title: 'Tableau de bord',
  eyebrow: 'Accueil et performances',
  description:
    'Vue d\'ensemble des KPI, contexte d\'affaires et actions en attente pour votre profil actuel.',
  permissions: dashboardPermissionIds,
}

export const appModuleRoutes: AppModuleRoute[] = [
  {
    path: '/businesses',
    label: 'Businesses',
    icon: 'businesses',
    title: 'Businesses',
    eyebrow: 'Gouvernance de la plateforme',
    description:
      'Gouvernance des entreprises par le super-admin, suivi des intégrations territoriales.',
    permissions: ['business.view'],
  },
  {
    path: '/programs',
    label: 'Programmes',
    icon: 'programs',
    title: 'Programmes',
    eyebrow: 'Opérations',
    description:
      'Cycle de vie des programmes, assignations et règles de commission pour les convertis.',
    permissions: ['program.view'],
  },
  {
    path: '/exchange-packs',
    label: 'Packs de points',
    icon: 'exchange-packs',
    title: 'Packs de points',
    eyebrow: 'Catalogue',
    description:
      'Gestion et consultation des packs de récompenses disponibles pour échange.',
    permissions: ['exchange-pack.view'],
  },
  {
    path: '/agents',
    label: 'Affiliés',
    icon: 'agents',
    title: 'Affiliés',
    eyebrow: 'Gestion du réseau',
    description:
      'Invitations, attributions et contrôle des profils des affiliés / parrains.',
    permissions: ['agent.view'],
  },
  {
    path: '/prospects',
    label: 'Filleuls',
    icon: 'prospects',
    title: 'Filleuls',
    eyebrow: 'Suivi des recommandations',
    description:
      'Soumission, état de synchronisation et cycle de vie des filleuls parrainés.',
    permissions: ['prospect.view'],
  },
  {
    path: '/transactions',
    label: 'Transactions',
    icon: 'transactions',
    title: 'Transactions',
    eyebrow: 'Historique des revenus',
    description:
      'Transactions converties, attribution de points et résultats commerciaux issus du CRM.',
    permissions: ['transaction.view'],
  },
  {
    path: '/commissions',
    label: 'Points',
    icon: 'points',
    title: 'Points et Portefeuille',
    eyebrow: 'Soldes',
    description:
      'Historique de vos points, cumuls, et éligibilité aux différentes récompenses.',
    permissions: ['points.view'],
  },
  {
    path: '/payouts',
    label: 'Demandes',
    icon: 'exchanges',
    title: 'Demandes',
    eyebrow: 'Traitement des échanges',
    description:
      'Consultation et traitement des demandes d\'échange des points en cadeaux ou virements.',
    permissions: ['exchange-request.view'],
  },
  {
    path: '/notifications',
    label: 'Notifications',
    icon: 'notifications',
    title: 'Notifications',
    eyebrow: 'Alertes',
    description:
      'Historique de vos alertes, événements et messages liés au compte.',
    permissions: ['notification.view'],
  },
  {
    path: '/settings',
    label: 'Paramètres',
    icon: 'settings',
    title: 'Paramètres',
    eyebrow: 'Profil et configuration',
    description:
      'Gestion de votre profil, préférences de sécurité et paramétrages d\'intégration.',
    permissions: settingsPermissionIds,
  },
  {
    path: '/iacrm',
    label: 'IACRM',
    icon: 'iacrm',
    title: 'IACRM',
    eyebrow: 'External CRM',
    description:
      'IACRM integration dashboard showing services, clients, pipeline, and invoicing from the external CRM system.',
    permissions: ['iacrm.sync-view'],
  },
]

export const authenticatedNavigation = [dashboardRoute, ...appModuleRoutes]
