import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/pages/Dashboard';
import { Programs } from '@/pages/Programs';
import { AgentsPage } from '@/pages/Agents';
import { TransactionsPage } from '@/pages/Transactions';
import { CommissionsPage } from '@/pages/Commissions';
import { PayoutsPage } from '@/pages/Payouts';
import { BusinessesPage } from '@/pages/Businesses';
import { ProspectsPage } from '@/pages/Prospects';
import { NotificationsPage } from '@/pages/Notifications';
import { SettingsPage } from '@/pages/Settings';
import { ExchangePacksPage } from '@/pages/ExchangePacks';
import { Login } from '@/pages/Login';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { PublicOnly, RequireAuth, useAuthSession } from '@/lib/auth-session';
import {
  approveFrontend2ExchangeRequest,
  cancelFrontend2ExchangeRequest,
  completeFrontend2ExchangeRequest,
  createFrontend2CashExchangeRequest,
  createFrontend2RewardExchangeRequest,
  fetchAgents,
  fetchBusinesses,
  fetchExchangePacks,
  fetchExchangeRequests,
  fetchNotifications,
  markFrontend2ExchangeRequestProcessing,
  fetchPrograms,
  fetchProspects,
  markAllNotificationsRead,
  markNotificationRead,
  rejectFrontend2ExchangeRequest,
  fetchTransactions,
  toPrototypeUser,
} from '@/lib/live-data';
import type { Agent, Business, ExchangePack, ExchangeRequest, Notification, Program, Prospect, Transaction, User, UserRole } from '@/types';
import { toast } from 'sonner';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppLayout({
  user,
  role,
  collapsed,
  onToggle,
  onLogout,
  logoutPending,
  children,
  title,
  notifications,
  exchangeRequests,
}: {
  user: User;
  role: UserRole;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  logoutPending: boolean;
  children: React.ReactNode;
  title: string;
  notifications: Notification[];
  exchangeRequests: ExchangeRequest[];
}) {
  return (
    <div className="min-h-screen bg-[hsl(var(--myhd-light))]">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={onToggle}
        onLogout={onLogout}
        logoutPending={logoutPending}
      />
      <div className={cn('transition-all duration-300', collapsed ? 'ml-16' : 'ml-64')}>
        <Header
          user={user}
          title={title}
          notifications={notifications}
          exchangeRequests={exchangeRequests}
          onLogout={onLogout}
          logoutPending={logoutPending}
        />
        <main className="p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}

function LiveShellBootstrap() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[hsl(var(--myhd-light))] p-4">
      <section className="w-full max-w-xl rounded-3xl border border-white/60 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-[hsl(var(--myhd-dark))] text-center">
          Chargement du prototype live
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-500 text-center">
          Le shell original charge maintenant les donnees reelles du backend.
        </p>
        <div className="mt-8 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-[hsl(var(--myhd-primary))]" />
        </div>
      </section>
    </main>
  );
}

function AppRoutes() {
  const { user: authUser, logout, logoutPending, isAuthenticated } = useAuthSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exchangePacks, setExchangePacks] = useState<ExchangePack[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [exchangeRequests, setExchangeRequests] = useState<ExchangeRequest[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [appLoadError, setAppLoadError] = useState<string | null>(null);

  const user = useMemo(() => (authUser ? toPrototypeUser(authUser) : null), [authUser]);
  const userRole: UserRole = user?.role ?? 'business-owner';
  const permissionSet = useMemo(() => new Set(authUser?.permissions ?? []), [authUser]);
  const canViewBusinesses = permissionSet.has('business.view');
  const canViewAgents = permissionSet.has('agent.view');
  const canViewProspects = permissionSet.has('prospect.view') || permissionSet.has('prospect.submit');
  const canViewTransactions = permissionSet.has('transaction.view');
  const canViewExchangePacks = permissionSet.has('exchange-pack.view');

  const refreshShellData = useCallback(async () => {
    if (!isAuthenticated) {
      setPrograms([]);
      setBusinesses([]);
      setAgents([]);
      setProspects([]);
      setTransactions([]);
      setExchangePacks([]);
      setNotifications([]);
      setExchangeRequests([]);
      return;
    }

    setAppLoading(true);
    setAppLoadError(null);

    try {
      const [
        nextPrograms,
        nextBusinesses,
        nextAgents,
        nextProspects,
        nextTransactions,
        nextExchangePacks,
        nextNotifications,
        nextExchangeRequests,
      ] = await Promise.all([
        fetchPrograms(),
        canViewBusinesses ? fetchBusinesses() : Promise.resolve([]),
        canViewAgents ? fetchAgents() : Promise.resolve([]),
        canViewProspects ? fetchProspects() : Promise.resolve([]),
        canViewTransactions ? fetchTransactions() : Promise.resolve([]),
        canViewExchangePacks ? fetchExchangePacks() : Promise.resolve([]),
        fetchNotifications(),
        fetchExchangeRequests(),
      ]);

      setPrograms(nextPrograms);
      setBusinesses(nextBusinesses);
      setAgents(nextAgents);
      setProspects(nextProspects);
      setTransactions(nextTransactions);
      setExchangePacks(nextExchangePacks);
      setNotifications(nextNotifications);
      setExchangeRequests(nextExchangeRequests);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Le chargement initial a echoue.';
      setAppLoadError(message);
    } finally {
      setAppLoading(false);
    }
  }, [canViewAgents, canViewBusinesses, canViewExchangePacks, canViewProspects, canViewTransactions, isAuthenticated]);

  useEffect(() => {
    void refreshShellData();
  }, [refreshShellData]);

  const handleLogout = useCallback(() => {
    void logout();
  }, [logout]);

  const handleMarkNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de marquer la notification comme lue.');
    }
  }, []);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de marquer toutes les notifications comme lues.');
    }
  }, []);

  const handleResolveExchangeRequest = useCallback(
    async (requestId: string, decision: 'approved' | 'rejected') => {
      try {
        if (decision === 'approved') {
          await approveFrontend2ExchangeRequest(requestId);
        } else {
          await rejectFrontend2ExchangeRequest(requestId);
        }

        await refreshShellData();
        toast.success(decision === 'approved' ? 'Demande approuvee.' : 'Demande rejetee.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Impossible de traiter la demande.');
      }
    },
    [refreshShellData]
  );

  const handleAdvanceExchangeRequest = useCallback(
    async (requestId: string, action: 'processing' | 'complete' | 'cancel') => {
      try {
        if (action === 'processing') {
          await markFrontend2ExchangeRequestProcessing(requestId);
        } else if (action === 'complete') {
          await completeFrontend2ExchangeRequest(requestId);
        } else {
          await cancelFrontend2ExchangeRequest(requestId);
        }

        await refreshShellData();

        toast.success(
          action === 'processing'
            ? 'Demande marquee en traitement.'
            : action === 'complete'
              ? 'Demande finalisee.'
              : 'Demande annulee.'
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Impossible de mettre a jour la demande.');
      }
    },
    [refreshShellData]
  );

  const getPageTitle = (path: string): string => {
    const titles: Record<string, string> = {
      '/dashboard': 'Tableau de bord',
      '/businesses': 'Entreprises',
      '/programs': 'Programmes',
      '/exchange-packs': 'Packs',
      '/agents': 'Affilies',
      '/prospects': 'Prospects',
      '/transactions': 'Transactions',
      '/commissions': 'Points',
      '/payouts': 'Echanges',
      '/notifications': 'Notifications',
      '/settings': 'Parametres',
    };
    return titles[path] || 'Tableau de bord';
  };

  if (appLoading && user !== null && programs.length === 0 && notifications.length === 0) {
    return <LiveShellBootstrap />;
  }

  return (
    <>
      {appLoadError && user !== null && (
        <div className="fixed right-4 top-4 z-[100] max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-lg">
          {appLoadError}
        </div>
      )}

      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              {user ? (
                <AppLayout
                  user={user}
                  role={userRole}
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                  onLogout={handleLogout}
                  logoutPending={logoutPending}
                  title={getPageTitle('/dashboard')}
                  notifications={notifications}
                  exchangeRequests={exchangeRequests}
                >
                  <Dashboard
                    role={userRole}
                    user={user}
                    programs={programs}
                    businesses={businesses}
                    agents={agents}
                    prospects={prospects}
                    transactions={transactions}
                    exchangeRequests={exchangeRequests}
                  />
                </AppLayout>
              ) : null}
            </RequireAuth>
          }
        />

        <Route
          path="/businesses"
          element={
            <RequireAuth>
              {user ? (
                canViewBusinesses ? (
                <AppLayout
                  user={user}
                  role={userRole}
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                  onLogout={handleLogout}
                  logoutPending={logoutPending}
                  title={getPageTitle('/businesses')}
                  notifications={notifications}
                  exchangeRequests={exchangeRequests}
                >
                  <BusinessesPage businesses={businesses} onBusinessesChange={setBusinesses} />
                </AppLayout>
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : null}
            </RequireAuth>
          }
        />

        <Route
          path="/programs"
          element={
            <RequireAuth>
              {user ? (
                <AppLayout
                  user={user}
                  role={userRole}
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                  onLogout={handleLogout}
                  logoutPending={logoutPending}
                  title={getPageTitle('/programs')}
                  notifications={notifications}
                  exchangeRequests={exchangeRequests}
                >
                  <Programs
                    role={userRole}
                    programs={programs}
                    exchangePacks={exchangePacks}
                    onProgramsChange={setPrograms}
                    onRefreshPrograms={async () => {
                      const nextPrograms = await fetchPrograms();
                      setPrograms(nextPrograms);
                    }}
                  />
                </AppLayout>
              ) : null}
            </RequireAuth>
          }
        />

        <Route
          path="/exchange-packs"
          element={
            <RequireAuth>
              {user ? (
                canViewExchangePacks ? (
                  <AppLayout
                    user={user}
                    role={userRole}
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed((prev) => !prev)}
                    onLogout={handleLogout}
                    logoutPending={logoutPending}
                    title={getPageTitle('/exchange-packs')}
                    notifications={notifications}
                    exchangeRequests={exchangeRequests}
                  >
                    <ExchangePacksPage
                      packs={exchangePacks}
                      onPacksChange={setExchangePacks}
                      onRefreshPacks={async () => {
                        const nextExchangePacks = await fetchExchangePacks();
                        setExchangePacks(nextExchangePacks);
                      }}
                    />
                  </AppLayout>
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : null}
            </RequireAuth>
          }
        />

        <Route
          path="/agents"
          element={
            <RequireAuth>
              {user ? (
                canViewAgents ? (
                <AppLayout
                  user={user}
                  role={userRole}
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                  onLogout={handleLogout}
                  logoutPending={logoutPending}
                  title={getPageTitle('/agents')}
                  notifications={notifications}
                  exchangeRequests={exchangeRequests}
                >
                  <AgentsPage
                    role={userRole}
                    agents={agents}
                    programs={programs}
                    prospects={prospects}
                    transactions={transactions}
                    exchangeRequests={exchangeRequests}
                    onAgentsChange={setAgents}
                  />
                </AppLayout>
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : null}
            </RequireAuth>
          }
        />

        <Route
          path="/prospects"
          element={
            <RequireAuth>
              {user ? (
                canViewProspects ? (
                <AppLayout
                  user={user}
                  role={userRole}
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                  onLogout={handleLogout}
                  logoutPending={logoutPending}
                  title={getPageTitle('/prospects')}
                  notifications={notifications}
                  exchangeRequests={exchangeRequests}
                >
                  <ProspectsPage
                    role={userRole}
                    prospects={prospects}
                    programs={programs}
                    transactions={transactions}
                    onProspectsChange={setProspects}
                  />
                </AppLayout>
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : null}
            </RequireAuth>
          }
        />

        <Route
          path="/transactions"
          element={
            <RequireAuth>
              {user ? (
                <AppLayout
                  user={user}
                  role={userRole}
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                  onLogout={handleLogout}
                  logoutPending={logoutPending}
                  title={getPageTitle('/transactions')}
                  notifications={notifications}
                  exchangeRequests={exchangeRequests}
                >
                  <TransactionsPage
                    role={userRole}
                    transactions={transactions}
                    prospects={prospects}
                  />
                </AppLayout>
              ) : null}
            </RequireAuth>
          }
        />

        <Route
          path="/commissions"
          element={
            <RequireAuth>
              {user ? (
                <AppLayout
                  user={user}
                  role={userRole}
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                  onLogout={handleLogout}
                  logoutPending={logoutPending}
                  title={getPageTitle('/commissions')}
                  notifications={notifications}
                  exchangeRequests={exchangeRequests}
                >
                  <CommissionsPage
                    role={userRole}
                    programs={programs}
                    exchangePacks={exchangePacks}
                    exchangeRequests={exchangeRequests}
                    transactions={transactions}
                    onCreateRewardExchangeRequest={async (payload) => {
                      await createFrontend2RewardExchangeRequest(payload);
                      await refreshShellData();
                    }}
                    onCreateCashExchangeRequest={async (payload) => {
                      await createFrontend2CashExchangeRequest(payload);
                      await refreshShellData();
                    }}
                  />
                </AppLayout>
              ) : null}
            </RequireAuth>
          }
        />

        <Route
          path="/payouts"
          element={
            userRole === 'agent' ? (
              <Navigate to="/commissions" replace />
            ) : (
              <RequireAuth>
                {user ? (
                  <AppLayout
                    user={user}
                    role={userRole}
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed((prev) => !prev)}
                    onLogout={handleLogout}
                    logoutPending={logoutPending}
                    title={getPageTitle('/payouts')}
                    notifications={notifications}
                    exchangeRequests={exchangeRequests}
                  >
                    <PayoutsPage
                      role={userRole}
                      exchangeRequests={exchangeRequests}
                      onResolveExchangeRequest={async (requestId, decision) => {
                        await handleResolveExchangeRequest(requestId, decision);
                      }}
                      onAdvanceExchangeRequest={async (requestId, action) => {
                        await handleAdvanceExchangeRequest(requestId, action);
                      }}
                    />
                  </AppLayout>
                ) : null}
              </RequireAuth>
            )
          }
        />

        <Route
          path="/notifications"
          element={
            <RequireAuth>
              {user ? (
                <AppLayout
                  user={user}
                  role={userRole}
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                  onLogout={handleLogout}
                  logoutPending={logoutPending}
                  title={getPageTitle('/notifications')}
                  notifications={notifications}
                  exchangeRequests={exchangeRequests}
                >
                  <NotificationsPage
                    user={user}
                    role={userRole}
                    notifications={notifications}
                    exchangeRequests={exchangeRequests}
                    onMarkAsRead={handleMarkNotificationRead}
                    onMarkAllAsRead={() => {
                      void handleMarkAllNotificationsRead();
                    }}
                    onResolveExchangeRequest={(requestId, decision) => {
                      void handleResolveExchangeRequest(requestId, decision);
                    }}
                    onAdvanceExchangeRequest={(requestId, action) => {
                      void handleAdvanceExchangeRequest(requestId, action);
                    }}
                  />
                </AppLayout>
              ) : null}
            </RequireAuth>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireAuth>
              {user ? (
                <AppLayout
                  user={user}
                  role={userRole}
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                  onLogout={handleLogout}
                  logoutPending={logoutPending}
                  title={getPageTitle('/settings')}
                  notifications={notifications}
                  exchangeRequests={exchangeRequests}
                >
                  <SettingsPage role={userRole} />
                </AppLayout>
              ) : null}
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
