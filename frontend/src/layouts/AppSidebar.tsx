import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Briefcase,
  Building2,
  FileText,
  Gift,
  LayoutDashboard,
  Link2,
  LogOut,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TranslatedRoute } from '../app/useNavigation'
import type { NavigationIconKey } from '../app/navigation'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AppSidebarProps {
  collapsed: boolean
  navItems: TranslatedRoute[]
  onLogout: () => Promise<void>
  logoutPending: boolean
  mode: 'drawer' | 'collapsed-desktop' | 'normal-desktop'
  onNavigate?: () => void
  iacrmConfigured?: boolean
  navBadges?: Partial<Record<string, string>>
}

const routeIcons: Record<NavigationIconKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  businesses: Building2,
  programs: Briefcase,
  'exchange-packs': Gift,
  agents: UserCheck,
  prospects: Users,
  transactions: TrendingUp,
  points: Wallet,
  exchanges: FileText,
  notifications: Bell,
  settings: Settings,
  iacrm: Link2,
}

export function AppSidebar({
  collapsed,
  navItems,
  onLogout,
  logoutPending,
  mode,
  onNavigate,
  iacrmConfigured = true,
  navBadges,
}: AppSidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = mode === 'drawer'
  // In drawer mode, sidebar is always visually expanded (w-64 with labels)
  const visuallyCollapsed = isMobile ? false : collapsed

  return (
    <aside
      className={[
        'flex h-screen flex-col text-foreground transition-[width] duration-300',
        'bg-background',
        // Soft divider like shadcn docs (no harsh border).
        "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-gradient-to-b after:from-transparent after:via-border/70 after:to-transparent",
        isMobile
          ? 'w-64 shrink-0'
          : ['relative z-40', collapsed ? 'w-16' : 'w-64', 'sticky top-0 shrink-0'].join(' '),
      ].join(' ')}
    >
      <div className="flex h-16 items-center px-3">
        {visuallyCollapsed ? (
          <div className="flex w-full items-center justify-center">
            <img
              src="/Uploads/logo-mark-light.svg"
              alt="Myhd mark"
              className="h-9 w-9 dark:hidden"
            />
            <img
              src="/Uploads/logo-mark-dark.svg"
              alt="Myhd mark"
              className="hidden h-9 w-9 dark:block"
            />
          </div>
        ) : (
          <>
            <img src="/Uploads/logo-light.svg" alt="Myhd" className="h-9 w-auto dark:hidden" />
            <img src="/Uploads/logo-dark.svg" alt="Myhd" className="hidden h-9 w-auto dark:block" />
          </>
        )}
      </div>

      <TooltipProvider delayDuration={100}>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = routeIcons[item.icon]
              const isIacrmLocked = item.path === '/iacrm' && !iacrmConfigured
              const navBadge = navBadges?.[item.path]

              // Pre-compute active state to avoid function className conflicting with Radix Slot
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`)
              const linkClassName = [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                visuallyCollapsed ? 'justify-center px-2' : '',
              ].join(' ')

              if (isIacrmLocked) {
                return (
                  <li key={item.path}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => navigate('/settings?tab=api')}
                          className={[
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                            'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                            visuallyCollapsed ? 'justify-center px-2' : '',
                          ].join(' ')}
                        >
                          <span className="relative shrink-0">
                            <Icon className="h-4.5 w-4.5" />
                            {visuallyCollapsed && (
                              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-background" />
                            )}
                          </span>
                          {!visuallyCollapsed && (
                            <>
                              <span className="truncate font-medium">{item.label}</span>
                              <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                                {t('iacrm.apiNotConfigured')}
                              </span>
                            </>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {visuallyCollapsed
                          ? t('iacrm.apiNotConfigured')
                          : t('iacrm.configureTooltip')}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                )
              }

              return (
                <li key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.path}
                        onClick={onNavigate}
                        className={linkClassName}
                      >
                        <Icon className="h-4.5 w-4.5 shrink-0" />
                        {!visuallyCollapsed ? (
                          <>
                            <span className="truncate font-medium">{item.label}</span>
                            {navBadge ? (
                              <span className="ml-auto shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                {navBadge}
                              </span>
                            ) : null}
                          </>
                        ) : navBadge ? (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background" />
                        ) : null}
                      </NavLink>
                    </TooltipTrigger>
                    {visuallyCollapsed && (
                      <TooltipContent side="right">
                        {navBadge ? `${item.label} (${navBadge})` : item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
              )
            })}
          </ul>
        </nav>
      </TooltipProvider>

      <div className="p-2">
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
            visuallyCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          {!visuallyCollapsed ? <span className="font-medium">{logoutPending ? t('auth.signingOut') : t('auth.signOut')}</span> : null}
        </button>
      </div>
    </aside>
  )
}
