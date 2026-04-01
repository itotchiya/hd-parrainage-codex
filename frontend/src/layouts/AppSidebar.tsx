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

const routeIcons: Record<NavigationIconKey, React.ComponentType<{ size?: number }>> = {
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
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: collapsed ? '42px' : '200px',
        background: '#D4D0C8',
        borderRight: '2px solid',
        borderRightColor: '#FFFFFF',
        borderBottom: 'none',
        transition: 'width 0.15s',
        fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
        fontSize: '11px',
        boxShadow: '2px 0 0 #808080',
      }}
    >
      {/* Sidebar title bar */}
      <div
        style={{
          background: 'linear-gradient(to right, #000080, #1084D0)',
          color: '#FFFFFF',
          padding: '4px 6px',
          fontWeight: 'bold',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <img
          src="/Uploads/logo-mark-dark.svg"
          alt="HD Parrainage"
          style={{ height: '16px', width: '16px', filter: 'brightness(10)', flexShrink: 0 }}
        />
        {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>HD Parrainage</span>}
      </div>

      {/* Section label */}
      {!collapsed && (
        <div
          style={{
            padding: '4px 6px 2px',
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#000080',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid #808080',
            background: '#D4D0C8',
          }}
        >
          Navigation
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '2px' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navItems.map((item) => {
            const Icon = routeIcons[item.icon]
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: collapsed ? '5px' : '3px 6px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    textDecoration: 'none',
                    fontSize: '11px',
                    color: isActive ? '#FFFFFF' : '#000000',
                    background: isActive ? '#000080' : 'transparent',
                    borderTop: isActive ? '2px solid #000080' : '2px solid transparent',
                    borderLeft: isActive ? '2px solid #000080' : '2px solid transparent',
                    borderRight: isActive ? '2px solid #000080' : '2px solid transparent',
                    borderBottom: isActive ? '2px solid #000080' : '2px solid transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={14} />
                      {!collapsed && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Separator */}
      <div style={{ height: '0', borderTop: '1px solid #808080', borderBottom: '1px solid #FFFFFF', margin: '2px' }} />

      {/* Logout */}
      <div style={{ padding: '2px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: collapsed ? '5px' : '3px 6px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%',
            background: '#D4D0C8',
            border: '2px solid transparent',
            fontSize: '11px',
            color: '#800000',
            cursor: logoutPending ? 'not-allowed' : 'pointer',
            opacity: logoutPending ? 0.5 : 1,
            fontFamily: 'Tahoma, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
          onMouseOver={(e) => {
            if (!logoutPending) {
              e.currentTarget.style.borderColor = '#FFFFFF #808080 #808080 #FFFFFF'
              e.currentTarget.style.background = '#D4D0C8'
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <LogOut size={14} />
          {!collapsed && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {logoutPending ? 'Déconnexion...' : 'Déconnexion'}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
