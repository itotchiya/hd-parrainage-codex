import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, ChevronDown, LogOut, PanelLeft, Search, Settings, User } from 'lucide-react'
import { authenticatedNavigation } from '../app/navigation'
import { useAuthSession } from '../features/auth/session'
import { fetchNotifications } from '../features/notifications/api'
import { AppSidebar } from './AppSidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasPermission, logout, logoutPending, user } = useAuthSession()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'header'],
    queryFn: fetchNotifications,
    staleTime: 30_000,
  })

  const visibleNavigation = authenticatedNavigation.filter((route) =>
    hasPermission(...route.permissions),
  )

  const activeRoute =
    authenticatedNavigation.find(
      (route) =>
        location.pathname === route.path ||
        location.pathname.startsWith(`${route.path}/`),
    ) ?? authenticatedNavigation[0]

  const isDashboardRoute =
    location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')

  const unreadCount = notificationsQuery.data?.meta.unread_count ?? 0
  const userInitial = user?.display_name?.trim().charAt(0).toUpperCase() ?? 'U'
  const displayName = user?.display_name?.trim() ?? 'User'

  const pathSegments = location.pathname.split('/').filter(Boolean)

  return (
    <main
      style={{ background: '#D4D0C8', minHeight: '100vh', fontFamily: 'Tahoma, "MS Sans Serif", sans-serif', fontSize: '11px' }}
    >
      <AppSidebar
        collapsed={sidebarCollapsed}
        navItems={visibleNavigation}
        onLogout={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
        logoutPending={logoutPending}
      />

      <div
        style={{
          marginLeft: sidebarCollapsed ? '42px' : '200px',
          minHeight: '100vh',
          transition: 'margin-left 0.15s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Win2000-style menubar / header */}
        <header
          style={{
            background: '#D4D0C8',
            borderBottom: '2px solid #808080',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Title bar row */}
          <div
            style={{
              background: 'linear-gradient(to right, #000080, #1084D0)',
              color: '#FFFFFF',
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            <img src="/Uploads/logo-mark-dark.svg" alt="" style={{ height: '14px', width: '14px', filter: 'brightness(10)' }} />
            <span>HD Parrainage — {isDashboardRoute ? 'Tableau de bord' : (activeRoute?.title ?? 'Page')}</span>

            {/* Title bar buttons (Win-style close/min/max) */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                style={{
                  width: '16px',
                  height: '14px',
                  background: '#D4D0C8',
                  border: '1px solid',
                  borderColor: '#FFFFFF #808080 #808080 #FFFFFF',
                  fontSize: '9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000',
                  fontWeight: 'bold',
                }}
                aria-label="Toggle sidebar"
              >
                _
              </button>
            </div>
          </div>

          {/* Toolbar row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '2px 4px',
              gap: '4px',
              background: '#D4D0C8',
              borderBottom: '1px solid #808080',
            }}
          >
            {/* Win-style toolbar buttons */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                background: '#D4D0C8',
                border: '2px solid transparent',
                fontSize: '11px',
                cursor: 'pointer',
                color: '#000000',
              }}
              onMouseOver={(e) => {
                const el = e.currentTarget
                el.style.borderColor = '#FFFFFF #808080 #808080 #FFFFFF'
              }}
              onMouseOut={(e) => {
                const el = e.currentTarget
                el.style.borderColor = 'transparent'
              }}
              aria-label="Toggle sidebar"
            >
              <PanelLeft size={14} />
            </button>

            {/* Separator */}
            <div style={{ width: '0', borderLeft: '1px solid #808080', borderRight: '1px solid #FFFFFF', height: '18px', margin: '0 2px' }} />

            {/* Breadcrumb / path */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#000000' }}>
              {isDashboardRoute ? (
                <span>Bienvenue, <strong>{displayName}</strong></span>
              ) : (
                <>
                  <span
                    style={{ color: '#000080', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => navigate('/dashboard')}
                  >
                    Accueil
                  </span>
                  <span style={{ color: '#808080' }}>{'>'}</span>
                  <span>{activeRoute?.title ?? ''}</span>
                </>
              )}
            </div>

            {/* Right side tools */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Search box */}
              <div style={{ position: 'relative', display: 'none' }} className="lg:block">
                <Search
                  size={12}
                  style={{
                    position: 'absolute',
                    left: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#808080',
                  }}
                />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  readOnly
                  style={{
                    height: '20px',
                    width: '160px',
                    paddingLeft: '18px',
                    paddingRight: '4px',
                    fontSize: '11px',
                    background: '#FFFFFF',
                    border: '2px solid',
                    borderColor: '#808080 #FFFFFF #FFFFFF #808080',
                    outline: 'none',
                    color: '#000000',
                  }}
                  aria-label="Global search"
                />
              </div>

              {/* Separator */}
              <div style={{ width: '0', borderLeft: '1px solid #808080', borderRight: '1px solid #FFFFFF', height: '18px', margin: '0 2px' }} />

              {/* Notifications */}
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 6px',
                  background: '#D4D0C8',
                  border: '2px solid transparent',
                  fontSize: '11px',
                  cursor: 'pointer',
                  color: '#000000',
                  position: 'relative',
                }}
                onMouseOver={(e) => {
                  const el = e.currentTarget
                  el.style.borderColor = '#FFFFFF #808080 #808080 #FFFFFF'
                }}
                onMouseOut={(e) => {
                  const el = e.currentTarget
                  el.style.borderColor = 'transparent'
                }}
                aria-label="Notifications"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      background: '#FF0000',
                      color: '#FFFFFF',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: '12px',
                      height: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Separator */}
              <div style={{ width: '0', borderLeft: '1px solid #808080', borderRight: '1px solid #FFFFFF', height: '18px', margin: '0 2px' }} />

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      background: '#D4D0C8',
                      border: '2px solid transparent',
                      fontSize: '11px',
                      cursor: 'pointer',
                      color: '#000000',
                    }}
                    onMouseOver={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = '#FFFFFF #808080 #808080 #FFFFFF'
                    }}
                    onMouseOut={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = 'transparent'
                    }}
                  >
                    <Avatar style={{ width: '16px', height: '16px' }}>
                      <AvatarImage src={user?.avatar_url ?? undefined} alt={displayName} />
                      <AvatarFallback style={{ fontSize: '9px', fontWeight: 'bold', background: '#000080', color: '#FFFFFF' }}>
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </span>
                    <ChevronDown size={10} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  style={{
                    background: '#D4D0C8',
                    border: '2px solid',
                    borderColor: '#FFFFFF #808080 #808080 #FFFFFF',
                    borderRadius: '0',
                    minWidth: '180px',
                    padding: '2px',
                    fontSize: '11px',
                    boxShadow: '2px 2px 4px rgba(0,0,0,0.4)',
                  }}
                >
                  <DropdownMenuLabel style={{ fontSize: '11px', padding: '4px 8px' }}>
                    <div style={{ fontWeight: 'bold' }}>{displayName}</div>
                    <div style={{ color: '#808080', fontSize: '10px' }}>{user?.email ?? ''}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator style={{ background: '#808080', margin: '2px 0' }} />
                  <DropdownMenuItem
                    onClick={() => navigate('/settings')}
                    style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '11px', gap: '6px', borderRadius: '0' }}
                  >
                    <User size={12} />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/settings')}
                    style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '11px', gap: '6px', borderRadius: '0' }}
                  >
                    <Settings size={12} />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuSeparator style={{ background: '#808080', margin: '2px 0' }} />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logout()
                      navigate('/login', { replace: true })
                    }}
                    disabled={logoutPending}
                    style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '11px', gap: '6px', borderRadius: '0', color: '#800000' }}
                  >
                    <LogOut size={12} />
                    {logoutPending ? 'Déconnexion...' : 'Se déconnecter'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Status bar / address bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1px 6px',
              background: '#D4D0C8',
              fontSize: '11px',
              gap: '8px',
              borderTop: '1px solid #FFFFFF',
            }}
          >
            <span style={{ color: '#808080' }}>Adresse :</span>
            <div
              style={{
                flex: 1,
                background: '#FFFFFF',
                border: '2px solid',
                borderColor: '#808080 #FFFFFF #FFFFFF #808080',
                padding: '1px 4px',
                fontSize: '11px',
                color: '#000000',
              }}
            >
              {location.pathname}
            </div>
          </div>
        </header>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            padding: isDashboardRoute ? '8px' : '8px',
            background: '#D4D0C8',
          }}
        >
          {isDashboardRoute ? (
            <Outlet />
          ) : (
            <div
              style={{
                background: '#D4D0C8',
                border: '2px solid',
                borderColor: '#FFFFFF #808080 #808080 #FFFFFF',
                padding: '8px',
              }}
            >
              <Outlet />
            </div>
          )}
        </div>

        {/* Windows-style status bar at bottom */}
        <footer
          style={{
            background: '#D4D0C8',
            borderTop: '2px solid #808080',
            padding: '2px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
          }}
        >
          <div
            style={{
              flex: 1,
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              padding: '1px 4px',
              fontSize: '11px',
            }}
          >
            Prêt
          </div>
          <div
            style={{
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              padding: '1px 8px',
              fontSize: '11px',
            }}
          >
            HD Parrainage v1.0
          </div>
          <div
            style={{
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              padding: '1px 8px',
              fontSize: '11px',
            }}
          >
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </footer>
      </div>
    </main>
  )
}
