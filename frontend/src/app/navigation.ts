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
  label: 'Dashboard',
  icon: 'dashboard',
  title: 'Dashboard',
  eyebrow: 'Role-aware home',
  description:
    'KPI overview, business context, and next-action visibility for the current authenticated role.',
  permissions: dashboardPermissionIds,
}

export const appModuleRoutes: AppModuleRoute[] = [
  {
    path: '/businesses',
    label: 'Businesses',
    icon: 'businesses',
    title: 'Businesses',
    eyebrow: 'Platform governance',
    description:
      'Super-admin business governance, onboarding review, and tenant overview surfaces will land here next.',
    permissions: ['business.view'],
  },
  {
    path: '/programs',
    label: 'Programs',
    icon: 'programs',
    title: 'Programs',
    eyebrow: 'Tenant operations',
    description:
      'Program lifecycle, assignments, and conversion-ready referral rules will be driven from this surface.',
    permissions: ['program.view'],
  },
  {
    path: '/exchange-packs',
    label: 'Exchange packs',
    icon: 'exchange-packs',
    title: 'Exchange packs',
    eyebrow: 'Rewards catalog',
    description:
      'Reward packs, pack items, and later redemption eligibility controls belong in this module.',
    permissions: ['exchange-pack.view'],
  },
  {
    path: '/agents',
    label: 'Agents',
    icon: 'agents',
    title: 'Agents',
    eyebrow: 'Affiliate management',
    description:
      'Affiliate invitations, assignments, and profile controls will extend this guarded module.',
    permissions: ['agent.view'],
  },
  {
    path: '/prospects',
    label: 'Prospects',
    icon: 'prospects',
    title: 'Prospects',
    eyebrow: 'Funnel tracking',
    description:
      'Prospect submission, sync status, and lifecycle visibility will build on this screen.',
    permissions: ['prospect.view'],
  },
  {
    path: '/transactions',
    label: 'Transactions',
    icon: 'transactions',
    title: 'Transactions',
    eyebrow: 'Revenue visibility',
    description:
      'Converted transactions, attribution, and IACRM-sourced commercial outcomes will render here.',
    permissions: ['transaction.view'],
  },
  {
    path: '/commissions',
    label: 'Points',
    icon: 'points',
    title: 'Points',
    eyebrow: 'Balances and rewards',
    description:
      'Points history, totals, and exchange eligibility will be driven from this route.',
    permissions: ['points.view'],
  },
  {
    path: '/payouts',
    label: 'Exchanges',
    icon: 'exchanges',
    title: 'Exchanges',
    eyebrow: 'Redemption workflow',
    description:
      'Reward and cash exchange requests, approvals, and fulfillment state belong in this workflow.',
    permissions: ['exchange-request.view'],
  },
  {
    path: '/notifications',
    label: 'Notifications',
    icon: 'notifications',
    title: 'Notifications',
    eyebrow: 'Operational follow-up',
    description:
      'Read state, delivery events, and action-triggered notifications will use this module shell.',
    permissions: ['notification.view'],
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: 'settings',
    title: 'Settings',
    eyebrow: 'Profile and configuration',
    description:
      'Profile, security, business preferences, and integration-facing configuration will collect here.',
    permissions: settingsPermissionIds,
  },
]

export const authenticatedNavigation = [dashboardRoute, ...appModuleRoutes]
