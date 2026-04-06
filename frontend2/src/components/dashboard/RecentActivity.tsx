import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from '@/lib/utils';
import { TrendingUp, Users, Wallet } from 'lucide-react';
import type { ExchangeRequest, Prospect, Transaction } from '@/types';
import { translateStatusLabel } from '@/lib/frontend2-i18n';

interface Activity {
  id: string;
  type: 'transaction' | 'prospect' | 'exchange';
  title: string;
  description: string;
  amount?: string;
  status: string;
  date: string;
}

interface RecentActivityProps {
  transactions: Transaction[];
  prospects: Prospect[];
  exchangeRequests: ExchangeRequest[];
}

export function RecentActivity({ transactions, prospects, exchangeRequests }: RecentActivityProps) {
  const activities: Activity[] = [
    ...transactions.slice(0, 6).map((transaction) => ({
      id: `transaction-${transaction.id}`,
      type: 'transaction' as const,
      title: `Transaction - ${transaction.clientName}`,
      description: transaction.programName,
      amount: `+${transaction.commission.toLocaleString()} pts`,
      status: transaction.status,
      date: transaction.createdAt,
    })),
    ...prospects.slice(0, 6).map((prospect) => ({
      id: `prospect-${prospect.id}`,
      type: 'prospect' as const,
      title: `Nouveau prospect - ${prospect.clientName}`,
      description: prospect.programName,
      status: prospect.status,
      date: prospect.submittedAt,
    })),
    ...exchangeRequests.slice(0, 6).map((request) => ({
      id: `exchange-${request.id}`,
      type: 'exchange' as const,
      title: `Echange de points - ${request.agentName}`,
      description: request.exchangeType === 'cash' ? 'Conversion en argent' : 'Recompense demandee',
      amount:
        request.exchangeType === 'cash' && request.cashAmount !== undefined
          ? `${request.cashAmount.toFixed(2)} EUR`
          : `${request.pointsSpent.toLocaleString()} pts`,
      status: request.status,
      date: request.resolvedAt ?? request.createdAt,
    })),
  ]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-emerald-100 text-emerald-700',
      approved: 'bg-blue-100 text-blue-700',
      validated: 'bg-blue-100 text-blue-700',
      pending: 'bg-amber-100 text-amber-700',
      requested: 'bg-amber-100 text-amber-700',
      processing: 'bg-cyan-100 text-cyan-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      suspect: 'bg-slate-100 text-slate-700',
      'prospect-froid': 'bg-blue-100 text-blue-700',
      'prospect-tiede': 'bg-amber-100 text-amber-700',
      'prospect-chaud': 'bg-emerald-100 text-emerald-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'transaction':
        return <TrendingUp size={20} className="text-[hsl(var(--myhd-primary))]" />;
      case 'prospect':
        return <Users size={16} className="text-[hsl(var(--myhd-cyan))]" />;
      case 'exchange':
        return <Wallet size={16} className="text-emerald-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">
          Activite recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                {getIcon(activity.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{activity.title}</p>
                  <Badge variant="secondary" className={getStatusColor(activity.status)}>
                    {translateStatusLabel(activity.status)}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{activity.description}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{formatDistanceToNow(activity.date)}</span>
                  {activity.amount ? (
                    <span className="text-sm font-semibold text-[hsl(var(--myhd-primary))]">
                      {activity.amount}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {activities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              Aucune activite backend a afficher pour le moment.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
