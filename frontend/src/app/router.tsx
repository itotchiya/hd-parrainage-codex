import { createBrowserRouter } from 'react-router-dom'
import { appModuleRoutes, dashboardRoute } from './navigation'
import { ModulePlaceholderPage } from '../features/app/pages/ModulePlaceholderPage'
import { InvitationActivationPage } from '../features/auth/pages/InvitationActivationPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { PasswordForgotPage } from '../features/auth/pages/PasswordForgotPage'
import { PasswordResetPage } from '../features/auth/pages/PasswordResetPage'
import { AgentDetailPage } from '../features/agents/pages/AgentDetailPage.tsx'
import { AgentsPage } from '../features/agents/pages/AgentsPage.tsx'
import { BusinessDetailPage } from '../features/businesses/pages/BusinessDetailPage.tsx'
import { BusinessesPage } from '../features/businesses/pages/BusinessesPage.tsx'
import {
  AuthEntryRedirect,
  PermissionBoundary,
  PublicOnly,
  RequireAuth,
} from '../features/auth/session'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.tsx'
import { ExchangePackDetailPage } from '../features/exchange-packs/pages/ExchangePackDetailPage.tsx'
import { ExchangePacksPage } from '../features/exchange-packs/pages/ExchangePacksPage.tsx'
import { ExchangeDetailPage } from '../features/exchanges/pages/ExchangeDetailPage.tsx'
import { ExchangesPage } from '../features/exchanges/pages/ExchangesPage.tsx'
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage.tsx'
import { PointsPage } from '../features/points/pages/PointsPage.tsx'
import { ProspectDetailPage } from '../features/prospects/pages/ProspectDetailPage.tsx'
import { ProspectsPage } from '../features/prospects/pages/ProspectsPage.tsx'
import { ProgramDocsPage } from '../features/programs/pages/ProgramDocsPage.tsx'
import { ProgramDetailPage } from '../features/programs/pages/ProgramDetailPage.tsx'
import { ProgramsPage } from '../features/programs/pages/ProgramsPage.tsx'
import { TransactionsPage } from '../features/transactions/pages/TransactionsPage.tsx'
import { SettingsPage } from '../features/settings/pages/SettingsPage.tsx'
import { IacrmDashboardPage } from '../features/iacrm/pages/IacrmDashboardPage.tsx'
import { ForbiddenPage } from '../features/system/pages/ForbiddenPage'
import { NotFoundPage } from '../features/system/pages/NotFoundPage'
import { SessionExpiredPage } from '../features/system/pages/SessionExpiredPage'
import { AppShell } from '../layouts/AppShell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthEntryRedirect />,
  },
  {
    path: '/login',
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: '/activate-invitation',
    element: (
      <PublicOnly>
        <InvitationActivationPage />
      </PublicOnly>
    ),
  },
  {
    path: '/password/forgot',
    element: (
      <PublicOnly>
        <PasswordForgotPage />
      </PublicOnly>
    ),
  },
  {
    path: '/password/reset',
    element: (
      <PublicOnly>
        <PasswordResetPage />
      </PublicOnly>
    ),
  },
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '/session-expired',
    element: <SessionExpiredPage />,
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      {
        path: dashboardRoute.path,
        element: (
          <PermissionBoundary anyOf={dashboardRoute.permissions}>
            <DashboardPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/businesses',
        element: (
          <PermissionBoundary anyOf={['business.view']}>
            <BusinessesPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/businesses/:businessId',
        element: (
          <PermissionBoundary anyOf={['business.view']}>
            <BusinessDetailPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/agents',
        element: (
          <PermissionBoundary anyOf={['agent.view']}>
            <AgentsPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/agents/:agentId',
        element: (
          <PermissionBoundary anyOf={['agent.view']}>
            <AgentDetailPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/programs',
        element: (
          <PermissionBoundary anyOf={['program.view']}>
            <ProgramsPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/programs/docs',
        element: (
          <PermissionBoundary anyOf={['program.view']}>
            <ProgramDocsPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/programs/:programId',
        element: (
          <PermissionBoundary anyOf={['program.view']}>
            <ProgramDetailPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/prospects',
        element: (
          <PermissionBoundary anyOf={['prospect.view']}>
            <ProspectsPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/prospects/:prospectId',
        element: (
          <PermissionBoundary anyOf={['prospect.view']}>
            <ProspectDetailPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/notifications',
        element: (
          <PermissionBoundary anyOf={['notification.view']}>
            <NotificationsPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/commissions',
        element: (
          <PermissionBoundary anyOf={['points.view']}>
            <PointsPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/settings',
        element: (
          <PermissionBoundary anyOf={['settings.view-platform', 'settings.view-business', 'settings.view-own']}>
            <SettingsPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/transactions',
        element: (
          <PermissionBoundary anyOf={['transaction.view']}>
            <TransactionsPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/exchange-packs',
        element: (
          <PermissionBoundary anyOf={['exchange-pack.view']}>
            <ExchangePacksPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/exchange-packs/:packId',
        element: (
          <PermissionBoundary anyOf={['exchange-pack.view']}>
            <ExchangePackDetailPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/payouts',
        element: (
          <PermissionBoundary anyOf={['exchange-request.view']}>
            <ExchangesPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/payouts/:exchangeRequestId',
        element: (
          <PermissionBoundary anyOf={['exchange-request.view']}>
            <ExchangeDetailPage />
          </PermissionBoundary>
        ),
      },
      {
        path: '/iacrm',
        element: (
          <PermissionBoundary anyOf={['iacrm.sync-view']}>
            <IacrmDashboardPage />
          </PermissionBoundary>
        ),
      },
      ...appModuleRoutes
        .filter(
          (route) =>
            route.path !== '/businesses' &&
            route.path !== '/agents' &&
            route.path !== '/programs' &&
            route.path !== '/prospects' &&
            route.path !== '/transactions' &&
            route.path !== '/commissions' &&
            route.path !== '/payouts' &&
            route.path !== '/exchange-packs' &&
            route.path !== '/notifications' &&
            route.path !== '/settings' &&
            route.path !== '/iacrm',
        )
        .map((route) => ({
        path: route.path,
        element: (
          <PermissionBoundary anyOf={route.permissions}>
            <ModulePlaceholderPage route={route} />
          </PermissionBoundary>
        ),
      })),
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
