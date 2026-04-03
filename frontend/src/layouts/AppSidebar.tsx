import { NavLink } from 'react-router-dom'
import {
  Bell,
  Briefcase,
  Building2,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react'
import type { AppModuleRoute, NavigationIconKey } from '../app/navigation'

interface AppSidebarProps {
  collapsed: boolean
  navItems: AppModuleRoute[]
  onLogout: () => Promise<void>
  logoutPending: boolean
  isMobile: boolean
  mobileOpen: boolean
  onNavigate?: () => void
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
}

export function AppSidebar({
  collapsed,
  navItems,
  onLogout,
  logoutPending,
  isMobile,
  mobileOpen,
  onNavigate,
}: AppSidebarProps) {
  return (
    <aside
      className={[
        'z-40 flex h-screen flex-col text-foreground transition-all duration-300',
        'bg-transparent',
        // Soft divider like shadcn docs (no harsh border).
        "relative after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-gradient-to-b after:from-transparent after:via-border/70 after:to-transparent",
        isMobile
          ? [
              'fixed inset-y-0 left-0 w-64',
              mobileOpen ? 'translate-x-0' : '-translate-x-full',
            ].join(' ')
          : [collapsed ? 'w-16' : 'w-64', 'sticky top-0 shrink-0'].join(' '),
      ].join(' ')}
    >
      <div className="flex h-16 items-center px-3">
        {collapsed ? (
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

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = routeIcons[item.icon]

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      collapsed ? 'justify-center px-2' : '',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed ? <span className="truncate font-medium">{item.label}</span> : null}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-2">
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          {!collapsed ? <span className="font-medium">{logoutPending ? 'Signing out...' : 'Deconnexion'}</span> : null}
        </button>
      </div>
    </aside>
  )
}
