import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Bell, ChevronDown, LogOut, Monitor, Moon, PanelLeft, Settings, Sun, User } from 'lucide-react'
import { authenticatedNavigation } from '../app/navigation'
import { useAuthSession } from '../features/auth/session'
import { getIacrmConfig, IACRM_CONFIG_EVENT } from '../features/iacrm/api'
import { fetchNotifications } from '../features/notifications/api'
import { AppSidebar } from './AppSidebar'
import { Button } from '@/components/ui/button'
import { AgentAvatarFallback, Avatar, AvatarImage } from '@/components/ui/avatar'
import { avatarSeedForUser } from '@/lib/avatar-fallback'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const BreadcrumbDetailTitleContext = createContext<Dispatch<SetStateAction<string | null>> | null>(null)

export function useAppBreadcrumbDetailTitle(title: string | null) {
  const setBreadcrumbDetailTitle = useContext(BreadcrumbDetailTitleContext)

  useEffect(() => {
    if (!setBreadcrumbDetailTitle) return

    setBreadcrumbDetailTitle(title)

    return () => {
      setBreadcrumbDetailTitle(null)
    }
  }, [setBreadcrumbDetailTitle, title])
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasPermission, logout, logoutPending, user } = useAuthSession()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    // Start collapsed if in compact desktop range
    const w = window.innerWidth
    return w >= 768 && w < 1280
  })
  const [sidebarMode, setSidebarMode] = useState<'drawer' | 'collapsed-desktop' | 'normal-desktop'>(() => {
    if (typeof window === 'undefined') return 'normal-desktop'
    const w = window.innerWidth
    if (w < 768) return 'drawer'
    if (w < 1280) return 'collapsed-desktop'
    return 'normal-desktop'
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const isMobile = sidebarMode === 'drawer'
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') {
      return 'system'
    }

    const storedTheme = window.localStorage.getItem('hd-parrainage-theme')
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      return storedTheme
    }

    return 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [breadcrumbDetailTitle, setBreadcrumbDetailTitle] = useState<string | null>(null)
  const [iacrmConfigured, setIacrmConfigured] = useState(() => {
    if (typeof window === 'undefined') return true
    return Boolean(getIacrmConfig()?.base_url)
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'header'],
    queryFn: fetchNotifications,
    staleTime: 30_000,
  })

  const isSuperAdmin = user?.roles.some((r) => r.slug === 'super-admin') ?? false
  const isBusinessOwner = user?.agent_profile === null && hasPermission('settings.view-business')
  const shouldShowIacrmCta = !iacrmConfigured && (isSuperAdmin || isBusinessOwner)
  // These paths are business-scoped management surfaces — not relevant for platform admin
  const superAdminHiddenPaths = ['/agents', '/prospects', '/commissions', '/payouts', '/exchange-packs', '/transactions']

  const visibleNavigation = authenticatedNavigation.filter((route) => {
    if (!hasPermission(...route.permissions)) return false
    if (isSuperAdmin && superAdminHiddenPaths.includes(route.path)) return false
    return true
  })

  const activeRoute =
    authenticatedNavigation.find(
      (route) =>
        location.pathname === route.path ||
        location.pathname.startsWith(`${route.path}/`),
    ) ?? authenticatedNavigation[0]
  const isProgramDocsRoute = location.pathname === '/programs/docs'
  const isDashboardRoute =
    location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')
  const dashboardSurfaceClass = 'bg-background'

  const unreadCount = notificationsQuery.data?.meta.unread_count ?? 0
  const recentNotifications = (notificationsQuery.data?.data ?? []).slice(0, 4)
  const userInitial = user?.display_name?.trim().charAt(0).toUpperCase() ?? 'U'
  const displayName = user?.display_name?.trim() ?? 'User'

  const pathSegments = location.pathname.split('/').filter(Boolean)
  const isExchangePackDetailRoute = pathSegments[0] === 'exchange-packs' && Boolean(pathSegments[1])
  const hasDeepPath = pathSegments.length > 2
  const isIdLike = (value: string) =>
    /^\d+$/.test(value) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

  const shouldShowEllipsis =
    !isExchangePackDetailRoute && (
      hasDeepPath || pathSegments.some((segment, index) => index > 0 && isIdLike(segment))
    )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const root = document.documentElement
    let transitionCleanupTimer: number | undefined
    const applyTheme = () => {
      const nextTheme =
        theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme

      root.classList.add('theme-transition')
      setResolvedTheme(nextTheme)
      root.dataset.theme = nextTheme
      root.classList.toggle('dark', nextTheme === 'dark')
      window.localStorage.setItem('hd-parrainage-theme', theme)

      if (transitionCleanupTimer) {
        window.clearTimeout(transitionCleanupTimer)
      }
      transitionCleanupTimer = window.setTimeout(() => {
        root.classList.remove('theme-transition')
      }, 260)
    }

    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }

    applyTheme()
    mediaQuery.addEventListener('change', handleSystemChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange)
      if (transitionCleanupTimer) {
        window.clearTimeout(transitionCleanupTimer)
      }
      root.classList.remove('theme-transition')
    }
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const compactQuery = window.matchMedia('(min-width: 768px) and (max-width: 1279px)')

    const syncMode = () => {
      if (mobileQuery.matches) {
        setSidebarMode('drawer')
        setMobileSidebarOpen(false)
      } else if (compactQuery.matches) {
        setSidebarMode('collapsed-desktop')
        setSidebarCollapsed(true)
        setMobileSidebarOpen(false)
      } else {
        setSidebarMode('normal-desktop')
        setMobileSidebarOpen(false)
      }
    }

    syncMode()
    mobileQuery.addEventListener('change', syncMode)
    compactQuery.addEventListener('change', syncMode)

    return () => {
      mobileQuery.removeEventListener('change', syncMode)
      compactQuery.removeEventListener('change', syncMode)
    }
  }, [])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncConfigState = () => {
      setIacrmConfigured(Boolean(getIacrmConfig()?.base_url))
    }

    syncConfigState()
    window.addEventListener(IACRM_CONFIG_EVENT, syncConfigState)
    window.addEventListener('storage', syncConfigState)

    return () => {
      window.removeEventListener(IACRM_CONFIG_EVENT, syncConfigState)
      window.removeEventListener('storage', syncConfigState)
    }
  }, [])

  const pageContent = (
    <>
      <header className={`sticky top-0 z-20 w-full ${dashboardSurfaceClass}`}>
        <div className="flex h-14 w-full items-center gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                if (sidebarMode === 'drawer') {
                  setMobileSidebarOpen((value) => !value)
                  return
                }
                setSidebarCollapsed((value) => !value)
              }}
              className="-ml-1"
              aria-label={
                sidebarMode === 'drawer'
                  ? mobileSidebarOpen
                    ? 'Close sidebar'
                    : 'Open sidebar'
                  : sidebarCollapsed
                    ? 'Expand sidebar'
                    : 'Collapse sidebar'
              }
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <Separator
              orientation="vertical"
              className="mr-2 hidden data-[orientation=vertical]:h-4 md:block"
            />
            {isDashboardRoute ? (
              <p className="text-sm text-muted-foreground">
                Hello, <span className="font-semibold text-foreground">{displayName}</span>
              </p>
            ) : (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink to="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  {isProgramDocsRoute ? (
                    <>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink to="/programs">Programs</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                    </>
                  ) : null}
                  {isExchangePackDetailRoute ? (
                    <>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink to="/exchange-packs">Exchange packs</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                    </>
                  ) : null}
                  {shouldShowEllipsis ? (
                    <>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbEllipsis />
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                    </>
                  ) : null}
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {isProgramDocsRoute
                        ? 'Documentation'
                        : isExchangePackDetailRoute
                          ? breadcrumbDetailTitle ?? activeRoute.title
                          : activeRoute.title}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
            {shouldShowIacrmCta ? (
              <>
                <div className="hidden items-center gap-3 rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1.5 text-xs text-amber-950 dark:border-amber-900/80 dark:bg-amber-950/70 dark:text-amber-100 xl:flex">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/80 dark:text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-medium">
                    IACRM est requis pour faire fonctionner l&apos;application.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 rounded-full bg-amber-500 px-3 text-xs font-semibold text-amber-950 hover:bg-amber-400"
                    onClick={() => navigate('/iacrm?tab=settings')}
                  >
                    Configurer l&apos;API
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-amber-300/80 bg-amber-50/80 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:bg-amber-900/70 xl:hidden"
                  onClick={() => navigate('/iacrm?tab=settings')}
                >
                  API IACRM
                </Button>
              </>
            ) : null}

            <Button
              onClick={() =>
                setTheme((current) => {
                  const base = current === 'system' ? resolvedTheme : current
                  return base === 'dark' ? 'light' : 'dark'
                })
              }
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={
                resolvedTheme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <div className="relative">
              <Button
                onClick={() => navigate('/notifications')}
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Open notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#38BDF8] px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </Button>
              {recentNotifications.length > 0 ? (
                <div className="pointer-events-none absolute right-0 mt-2 hidden w-80 rounded-xl border border-border bg-card p-3 shadow-sm md:group-hover:block" />
              ) : null}
            </div>

            <Separator
              orientation="vertical"
              className="hidden bg-border/80 data-[orientation=vertical]:h-4 md:block"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 gap-2 px-2 text-left"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.display_name ?? 'User'} />
                    <AgentAvatarFallback
                      seed={user ? avatarSeedForUser({ id: user.id }) : 'anonymous'}
                      className="text-xs font-semibold"
                    >
                      {userInitial}
                    </AgentAvatarFallback>
                  </Avatar>
                  <span className="hidden md:block">
                    <span className="block max-w-[140px] truncate text-xs font-semibold text-foreground">
                      {user?.display_name ?? 'User'}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="truncate text-sm font-medium">{user?.display_name ?? 'User'}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/settings')}
                  className="cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span>Personal Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/settings')}
                  className="cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Theme
                  </p>
                  <Tabs
                    value={theme}
                    onValueChange={(value) =>
                      setTheme(value as 'light' | 'dark' | 'system')
                    }
                  >
                    <TabsList className="w-full">
                      <TabsTrigger value="light" className="px-2">
                        <Sun className="h-4 w-4" />
                      </TabsTrigger>
                      <TabsTrigger value="dark" className="px-2">
                        <Moon className="h-4 w-4" />
                      </TabsTrigger>
                      <TabsTrigger value="system" className="px-2">
                        <Monitor className="h-4 w-4" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout()
                    navigate('/login', { replace: true })
                  }}
                  disabled={logoutPending}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-destructive" />
                  <span>{logoutPending ? 'Signing out...' : 'Sign out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="w-full px-4 py-4 md:px-6 md:py-6">
        <BreadcrumbDetailTitleContext.Provider value={setBreadcrumbDetailTitle}>
          <Outlet />
        </BreadcrumbDetailTitleContext.Provider>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <main className={`min-h-screen w-screen overflow-x-hidden text-foreground ${dashboardSurfaceClass}`}>
        <div
          className={[
            'flex min-h-screen w-[calc(100vw+16rem)] transition-transform duration-300 will-change-transform',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-64',
          ].join(' ')}
        >
          <AppSidebar
            collapsed={false}
            navItems={visibleNavigation}
            onLogout={async () => {
              await logout()
              navigate('/login', { replace: true })
            }}
            logoutPending={logoutPending}
            mode={sidebarMode}

            onNavigate={() => setMobileSidebarOpen(false)}
          />

          <div className={`relative min-h-screen w-screen shrink-0 ${dashboardSurfaceClass}`}>
            {mobileSidebarOpen ? (
              <button
                type="button"
                aria-label="Close sidebar menu"
                className="absolute inset-0 z-30 bg-black/20"
                onClick={() => setMobileSidebarOpen(false)}
              />
            ) : null}
            {pageContent}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={`flex min-h-screen w-full text-foreground ${dashboardSurfaceClass}`}>
      <AppSidebar
        collapsed={sidebarCollapsed}
        navItems={visibleNavigation}
        onLogout={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
        logoutPending={logoutPending}
        mode={sidebarMode}
        onNavigate={() => {}}
      />

      <div className={`relative min-h-screen min-w-0 w-full max-w-full flex-1 ${dashboardSurfaceClass}`}>
        {pageContent}
      </div>
    </main>
  )
}
