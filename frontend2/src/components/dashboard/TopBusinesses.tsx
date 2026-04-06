import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { Business, Transaction } from '@/types';

interface TopBusinessesProps {
  businesses: Business[];
  transactions: Transaction[];
}

export function TopBusinesses({ businesses, transactions }: TopBusinessesProps) {
  const businessStats = businesses
    .map((business) => {
      const businessTransactions = transactions.filter((transaction) => transaction.businessId === business.id);
      const revenue = businessTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        ...business,
        revenue,
        count: businessTransactions.length,
      };
    })
    .sort((left, right) => right.revenue - left.revenue || right.count - left.count)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[hsl(var(--myhd-dark))]">
          <TrendingUp size={20} className="text-[hsl(var(--myhd-primary))]" />
          Top 5 entreprises (points)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {businessStats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            Aucune transaction backend disponible pour classer les entreprises.
          </div>
        ) : (
          <div className="space-y-4">
            {businessStats.map((business, index) => (
              <div key={business.id} className="flex items-center gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{business.name}</p>
                  <p className="text-xs text-gray-500">{business.count} transaction{business.count > 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[hsl(var(--myhd-primary))]">
                    {business.revenue.toLocaleString()} pts
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
