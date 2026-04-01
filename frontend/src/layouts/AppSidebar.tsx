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
}: AppSidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-3">
        {collapsed ? (
          <div className="flex w-full items-center justify-center">
            <img src="/Uploads/logo-mark-dark.svg" alt="Myhd mark" className="h-9 w-9" />
          </div>
        ) : (
          <img src="/Uploads/logo-dark.svg" alt="Myhd" className="h-9 w-auto" />
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
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                      isActive
                        ? 'bg-white text-[#020A17] shadow-[0_10px_24px_-18px_rgba(2,10,23,0.65)]'
                        : 'text-sidebar-foreground/80 hover:bg-white/8 hover:text-sidebar-foreground',
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

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 transition hover:bg-white/8 hover:text-sidebar-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
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
