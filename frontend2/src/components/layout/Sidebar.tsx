import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  UserCheck,
  Wallet,
  FileText,
  Settings,
  TrendingUp,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface SidebarProps {
  role: UserRole;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  logoutPending?: boolean;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard', roles: ['super-admin', 'business-owner', 'agent'] },
  { label: 'Entreprises', icon: Building2, path: '/businesses', roles: ['super-admin'] },
  { label: 'Programmes', icon: Briefcase, path: '/programs', roles: ['business-owner', 'agent'] },
  { label: 'Packs', icon: Gift, path: '/exchange-packs', roles: ['super-admin', 'business-owner'] },
  { label: 'Affilies', icon: UserCheck, path: '/agents', roles: ['super-admin', 'business-owner'] },
  { label: 'Prospects', icon: Users, path: '/prospects', roles: ['super-admin', 'business-owner', 'agent'] },
  { label: 'Transactions', icon: TrendingUp, path: '/transactions', roles: ['super-admin', 'business-owner', 'agent'] },
  { label: 'Points', icon: Wallet, path: '/commissions', roles: ['super-admin', 'business-owner', 'agent'] },
  { label: 'Echanges', icon: FileText, path: '/payouts', roles: ['super-admin'] },
  { label: 'Notifications', icon: Bell, path: '/notifications', roles: ['super-admin', 'business-owner', 'agent'] },
  { label: 'Parametres', icon: Settings, path: '/settings', roles: ['super-admin', 'business-owner', 'agent'] },
];

export function Sidebar({ role, collapsed, onToggle, onLogout, logoutPending = false }: SidebarProps) {
  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-[hsl(var(--myhd-dark))] text-white transition-all duration-300 z-50 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Myhd" className="h-8 w-auto brightness-0 invert" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {filteredItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }: { isActive: boolean }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-[hsl(var(--myhd-primary))] text-white shadow-lg shadow-[hsl(var(--myhd-primary))]/20'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white',
                    collapsed && 'justify-center'
                  )
                }
              >
                <item.icon size={20} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-2 border-t border-white/10">
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200',
            logoutPending && 'cursor-not-allowed opacity-60',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm font-medium">{logoutPending ? 'Deconnexion...' : 'Deconnexion'}</span>}
        </button>
      </div>
    </aside>
  );
}
