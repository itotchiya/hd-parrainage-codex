export interface AppModuleRoute {
  path: string
  labelKey: string
  icon: NavigationIconKey
  titleKey: string
  eyebrowKey: string
  descriptionKey: string
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
  labelKey: 'navigation.dashboard',
  icon: 'dashboard',
  titleKey: 'dashboard.title',
  eyebrowKey: 'dashboard.eyebrow',
  descriptionKey: 'dashboard.description',
  permissions: dashboardPermissionIds,
}

export const appModuleRoutes: AppModuleRoute[] = [
  {
    path: '/businesses',
    labelKey: 'navigation.businesses',
    icon: 'businesses',
    titleKey: 'businesses.title',
    eyebrowKey: 'businesses.eyebrow',
    descriptionKey: 'businesses.description',
    permissions: ['business.view'],
  },
  {
    path: '/programs',
    labelKey: 'navigation.programs',
    icon: 'programs',
    titleKey: 'programs.title',
    eyebrowKey: 'programs.eyebrow',
    descriptionKey: 'programs.description',
    permissions: ['program.view'],
  },
  {
    path: '/exchange-packs',
    labelKey: 'navigation.exchangePacks',
    icon: 'exchange-packs',
    titleKey: 'exchangePacks.title',
    eyebrowKey: 'exchangePacks.eyebrow',
    descriptionKey: 'exchangePacks.description',
    permissions: ['exchange-pack.view'],
  },
  {
    path: '/agents',
    labelKey: 'navigation.agents',
    icon: 'agents',
    titleKey: 'agents.title',
    eyebrowKey: 'agents.eyebrow',
    descriptionKey: 'agents.description',
    permissions: ['agent.view'],
  },
  {
    path: '/prospects',
    labelKey: 'navigation.prospects',
    icon: 'prospects',
    titleKey: 'prospects.title',
    eyebrowKey: 'prospects.eyebrow',
    descriptionKey: 'prospects.description',
    permissions: ['prospect.view'],
  },
  {
    path: '/transactions',
    labelKey: 'navigation.transactions',
    icon: 'transactions',
    titleKey: 'transactions.title',
    eyebrowKey: 'transactions.eyebrow',
    descriptionKey: 'transactions.description',
    permissions: ['transaction.view'],
  },
  {
    path: '/commissions',
    labelKey: 'navigation.points',
    icon: 'points',
    titleKey: 'points.title',
    eyebrowKey: 'points.eyebrow',
    descriptionKey: 'points.description',
    permissions: ['points.view'],
  },
  {
    path: '/payouts',
    labelKey: 'navigation.payouts',
    icon: 'exchanges',
    titleKey: 'payouts.title',
    eyebrowKey: 'payouts.eyebrow',
    descriptionKey: 'payouts.description',
    permissions: ['exchange-request.view'],
  },
  {
    path: '/notifications',
    labelKey: 'navigation.notifications',
    icon: 'notifications',
    titleKey: 'notifications.title',
    eyebrowKey: 'notifications.eyebrow',
    descriptionKey: 'notifications.description',
    permissions: ['notification.view'],
  },
  {
    path: '/settings',
    labelKey: 'navigation.settings',
    icon: 'settings',
    titleKey: 'settings.title',
    eyebrowKey: 'settings.eyebrow',
    descriptionKey: 'settings.description',
    permissions: settingsPermissionIds,
  },
  {
    path: '/iacrm',
    labelKey: 'navigation.iacrm',
    icon: 'iacrm',
    titleKey: 'iacrm.title',
    eyebrowKey: 'iacrm.eyebrow',
    descriptionKey: 'iacrm.description',
    permissions: ['iacrm.sync-view'],
  },
]

export const authenticatedNavigation = [dashboardRoute, ...appModuleRoutes]
