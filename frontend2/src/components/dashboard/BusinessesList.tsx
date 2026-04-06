import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Business } from '@/types';
import { translateStatusLabel } from '@/lib/frontend2-i18n';

interface BusinessesListProps {
  businesses: Business[];
}

const getStatusColor = (status: Business['status']) => {
  const colors: Record<Business['status'], string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-slate-100 text-slate-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const getStatusLabel = (status: Business['status']) => {
  return translateStatusLabel(status);
};

export function BusinessesList({ businesses }: BusinessesListProps) {
  const latestBusinesses = [...businesses]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">
          Entreprises recentes
        </CardTitle>
        <Link to="/businesses">
          <Button variant="ghost" size="sm" className="text-[hsl(var(--myhd-primary))]">
            Voir tout
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {latestBusinesses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            Aucune entreprise backend disponible pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {latestBusinesses.map((business) => (
              <div
                key={business.id}
                className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 transition-all duration-300 hover:border-[hsl(var(--myhd-primary))]/30 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] text-white">
                  <Building2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-medium text-gray-900">{business.name}</h4>
                    <Badge variant="secondary" className={getStatusColor(business.status)}>
                      {getStatusLabel(business.status)}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-gray-500">{business.industry}</p>
                </div>
                {business.website ? (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 transition-colors hover:text-[hsl(var(--myhd-primary))]"
                  >
                    <ExternalLink size={18} />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
