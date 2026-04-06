import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Program } from '@/types';
import { translateStatusLabel } from '@/lib/frontend2-i18n';

interface ProgramsListProps {
  programs: Program[];
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'active': 'bg-emerald-100 text-emerald-700',
    'pending': 'bg-amber-100 text-amber-700',
    'draft': 'bg-gray-100 text-gray-700',
    'paused': 'bg-orange-100 text-orange-700',
    'rejected': 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const getCommissionLabel = (type: string) => {
  switch (type) {
    case 'per-transaction':
      return 'Par transaction';
    case 'revenue-tier':
      return 'Par tranche de CA';
    default:
      return type;
  }
};

export function ProgramsList({ programs }: ProgramsListProps) {
  const activePrograms = programs.filter((program) => program.status === 'active').slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">
          Programmes actifs
        </CardTitle>
        <Link to="/programs">
          <Button variant="ghost" size="sm" className="text-[hsl(var(--myhd-primary))]">
            Voir tout
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activePrograms.map((program) => (
            <div
              key={program.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[hsl(var(--myhd-primary))]/30 hover:shadow-md transition-all duration-300"
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] flex items-center justify-center text-white">
                <Briefcase size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 truncate">{program.name}</h4>
                  <Badge variant="secondary" className={getStatusColor(program.status)}>
                    {translateStatusLabel(program.status)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 truncate">{program.businessName}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[hsl(var(--myhd-primary))]">
                  {getCommissionLabel(program.commissionType)}
                </p>
                <p className="text-xs text-gray-400">mode de commission</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
