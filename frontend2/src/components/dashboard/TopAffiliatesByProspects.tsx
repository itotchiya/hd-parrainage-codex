import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface TopAffiliateItem {
  id: string;
  name: string;
  totalProspects: number;
}

interface TopAffiliatesByProspectsProps {
  affiliates: TopAffiliateItem[];
}

export function TopAffiliatesByProspects({ affiliates }: TopAffiliatesByProspectsProps) {
  const topAffiliates = affiliates.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[hsl(var(--myhd-dark))]">
          <Users size={20} className="text-[hsl(var(--myhd-primary))]" />
          Top affilies par prospects
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topAffiliates.map((affiliate, index) => (
            <div
              key={affiliate.id}
              className="flex items-center gap-4 rounded-xl border border-gray-100 px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{affiliate.name}</p>
                <p className="text-xs text-gray-500">Tous statuts confondus</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[hsl(var(--myhd-primary))]">
                  {affiliate.totalProspects}
                </p>
                <p className="text-xs text-gray-400">prospects</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
