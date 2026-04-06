import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExchangeRequest, Notification, User, UserRole } from '@/types';
import { translateStatusLabel } from '@/lib/frontend2-i18n';

interface NotificationsPageProps {
  user: User;
  role: UserRole;
  notifications: Notification[];
  exchangeRequests: ExchangeRequest[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: (role: UserRole) => void;
  onResolveExchangeRequest: (requestId: string, decision: 'approved' | 'rejected') => void;
  onAdvanceExchangeRequest: (requestId: string, action: 'processing' | 'complete' | 'cancel') => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle size={20} className="text-emerald-600" />;
    case 'warning':
      return <AlertTriangle size={20} className="text-amber-600" />;
    case 'error':
      return <XCircle size={20} className="text-red-600" />;
    default:
      return <Info size={20} className="text-[hsl(var(--myhd-primary))]" />;
  }
};

const getNotificationBg = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-emerald-50';
    case 'warning':
      return 'bg-amber-50';
    case 'error':
      return 'bg-red-50';
    default:
      return 'bg-[hsl(var(--myhd-primary))]/5';
  }
};

export function NotificationsPage({
  user,
  role,
  notifications,
  exchangeRequests,
  onMarkAsRead,
  onMarkAllAsRead,
  onResolveExchangeRequest,
  onAdvanceExchangeRequest,
}: NotificationsPageProps) {
  const visibleNotifications = notifications.filter((notification) => {
    if (role !== 'agent') {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--myhd-dark))]">Notifications</h2>
          <p className="text-sm text-gray-500">
            {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => onMarkAllAsRead(role)}>
          <Check size={16} />
          Tout marquer comme lu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Toutes les notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {visibleNotifications.map((notification) => {
              const relatedExchangeRequest = notification.relatedExchangeRequestId
                ? exchangeRequests.find((request) => request.id === notification.relatedExchangeRequestId) ?? null
                : null;
              const canReviewExchange =
                role === 'business-owner' &&
                relatedExchangeRequest?.status === 'requested' &&
                notification.relatedExchangeRequestId;
              const canAdvanceApprovedExchange =
                role === 'business-owner' &&
                relatedExchangeRequest?.status === 'approved' &&
                notification.relatedExchangeRequestId;
              const canAdvanceProcessingExchange =
                role === 'business-owner' &&
                relatedExchangeRequest?.status === 'processing' &&
                notification.relatedExchangeRequestId;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-4 rounded-xl p-4 transition-all',
                    !notification.read ? getNotificationBg(notification.type) : 'hover:bg-gray-50',
                    !notification.read && 'border-l-4 border-l-[hsl(var(--myhd-primary))]'
                  )}
                >
                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={cn(
                          'font-semibold text-[hsl(var(--myhd-dark))]',
                          !notification.read && 'text-[hsl(var(--myhd-primary))]'
                        )}
                      >
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <Badge variant="secondary" className="bg-[hsl(var(--myhd-primary))] text-white text-xs">
                          Nouveau
                        </Badge>
                      )}
                      {relatedExchangeRequest && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            relatedExchangeRequest.status === 'approved' && 'bg-emerald-100 text-emerald-700',
                            relatedExchangeRequest.status === 'rejected' && 'bg-red-100 text-red-700',
                            relatedExchangeRequest.status === 'requested' && 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {translateStatusLabel(relatedExchangeRequest.status)}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                    {relatedExchangeRequest && (
                      <p className="mt-2 text-xs text-gray-500">
                        Programme: {relatedExchangeRequest.programName} -{' '}
                        {relatedExchangeRequest.exchangeType === 'cash'
                          ? `Argent: ${relatedExchangeRequest.cashAmount?.toFixed(2)} EUR`
                          : `Element: ${relatedExchangeRequest.rewardTitle}`}{' '}
                        - {relatedExchangeRequest.pointsSpent.toLocaleString()} pts
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(notification.createdAt).toLocaleDateString('fr-FR')} a{' '}
                      {new Date(notification.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {canReviewExchange && relatedExchangeRequest && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onResolveExchangeRequest(relatedExchangeRequest.id, 'approved')}
                        >
                          Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => onResolveExchangeRequest(relatedExchangeRequest.id, 'rejected')}
                        >
                          Rejeter
                        </Button>
                      </div>
                    )}
                    {canAdvanceApprovedExchange && relatedExchangeRequest && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAdvanceExchangeRequest(relatedExchangeRequest.id, 'processing')}
                        >
                          En traitement
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onAdvanceExchangeRequest(relatedExchangeRequest.id, 'complete')}
                        >
                          Marquer paye
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => onAdvanceExchangeRequest(relatedExchangeRequest.id, 'cancel')}
                        >
                          Annuler
                        </Button>
                      </div>
                    )}
                    {canAdvanceProcessingExchange && relatedExchangeRequest && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onAdvanceExchangeRequest(relatedExchangeRequest.id, 'complete')}
                        >
                          Marquer paye
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => onAdvanceExchangeRequest(relatedExchangeRequest.id, 'cancel')}
                        >
                          Annuler
                        </Button>
                      </div>
                    )}
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[hsl(var(--myhd-primary))]"
                      onClick={() => onMarkAsRead(notification.id)}
                    >
                      Marquer comme lu
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
