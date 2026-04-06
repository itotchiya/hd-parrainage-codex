import { Bell, ChevronDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { ExchangeRequest, Notification, User as UserType } from '@/types';
import { translateRoleLabel } from '@/lib/frontend2-i18n';

interface HeaderProps {
  user: UserType;
  title: string;
  notifications: Notification[];
  exchangeRequests: ExchangeRequest[];
  onLogout: () => void;
  logoutPending?: boolean;
}

export function Header({ user, title, notifications, exchangeRequests, onLogout, logoutPending = false }: HeaderProps) {
  const visibleNotifications = notifications.filter((notification) => {
    if (user.role !== 'agent') {
      return true;
    }

    if (!notification.relatedExchangeRequestId) {
      return true;
    }

    const relatedExchangeRequest = exchangeRequests.find(
      (request) => request.id === notification.relatedExchangeRequestId
    );

    return relatedExchangeRequest?.agentId === user.agentProfileId;
  });
  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
      <h1 className="text-xl font-semibold text-[hsl(var(--myhd-dark))]">{title}</h1>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[hsl(var(--myhd-cyan))] text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {visibleNotifications.slice(0, 5).map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start py-2">
                <span className="font-medium text-sm">{notification.title}</span>
                <span className="text-xs text-gray-500">{notification.message}</span>
              </DropdownMenuItem>
            ))}
            {visibleNotifications.length === 0 && (
              <DropdownMenuItem className="text-sm text-gray-500">Aucune notification</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] flex items-center justify-center text-white font-medium">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{translateRoleLabel(user.role)}</p>
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User size={16} className="mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem>Parametres</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onSelect={onLogout} disabled={logoutPending}>
              {logoutPending ? 'Deconnexion...' : 'Deconnexion'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
