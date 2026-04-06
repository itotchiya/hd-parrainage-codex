import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Wallet, Search, Filter, MoreHorizontal, CheckCircle, Clock, Banknote } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ExchangeRequest, UserRole } from '@/types';
import { useAuthSession } from '@/lib/auth-session';
import { translateStatusLabel } from '@/lib/frontend2-i18n';
import { toast } from 'sonner';

interface PayoutsProps {
  role: UserRole;
  exchangeRequests: ExchangeRequest[];
  onResolveExchangeRequest?: (requestId: string, decision: 'approved' | 'rejected') => Promise<void>;
  onAdvanceExchangeRequest?: (requestId: string, action: 'processing' | 'complete' | 'cancel') => Promise<void>;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    approved: 'bg-blue-100 text-blue-700',
    requested: 'bg-amber-100 text-amber-700',
    processing: 'bg-purple-100 text-purple-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export function PayoutsPage({ role, exchangeRequests, onResolveExchangeRequest, onAdvanceExchangeRequest }: PayoutsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionRequestId, setActionRequestId] = useState<string | null>(null);
  const { user } = useAuthSession();

  const scopedRequests = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return exchangeRequests
      .filter((request) => {
        if (role === 'business-owner') {
          const scopedBusinessId =
            user?.current_business_id ?? user?.primary_business?.id ?? user?.business_assignments[0]?.business?.id ?? null;
          return scopedBusinessId ? request.businessId === scopedBusinessId : true;
        }

        return true;
      })
      .filter((request) => {
        if (query.length === 0) {
          return true;
        }

        return (
          request.agentName.toLowerCase().includes(query) ||
          request.businessName.toLowerCase().includes(query) ||
          request.programName.toLowerCase().includes(query) ||
          request.rewardTitle.toLowerCase().includes(query)
        );
      });
  }, [exchangeRequests, role, searchQuery, user]);

  const totalCompleted = scopedRequests
    .filter((request) => request.status === 'completed')
    .reduce((sum, request) => sum + request.pointsSpent, 0);
  const totalRequested = scopedRequests
    .filter((request) => request.status === 'requested')
    .reduce((sum, request) => sum + request.pointsSpent, 0);
  const totalCashRequested = scopedRequests
    .filter((request) => request.exchangeType === 'cash')
    .reduce((sum, request) => sum + (request.cashAmount ?? 0), 0);

  const handleFilterClick = () => {
    toast.info(
      scopedRequests.length === 0
        ? 'Aucun echange ne correspond au filtre actuel.'
        : `${scopedRequests.length} echange(s) correspondent au filtre actuel.`
    );
  };

  const handleResolveRequest = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (!onResolveExchangeRequest) {
      toast.info('Le traitement de cet echange n est pas disponible dans ce contexte.');
      return;
    }

    setActionRequestId(requestId);

    try {
      await onResolveExchangeRequest(requestId, decision);
    } finally {
      setActionRequestId(null);
    }
  };

  const handleAdvanceRequest = async (requestId: string, action: 'processing' | 'complete' | 'cancel') => {
    if (!onAdvanceExchangeRequest) {
      toast.info('Le traitement de cet echange n est pas disponible dans ce contexte.');
      return;
    }

    setActionRequestId(requestId);

    try {
      await onAdvanceExchangeRequest(requestId, action);
    } finally {
      setActionRequestId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total echange</p>
                <p className="text-xl font-bold text-emerald-600">{totalCompleted.toLocaleString()} pts</p>
                <p className="text-xs text-gray-400">Echanges finalises</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Echanges demandes</p>
                <p className="text-xl font-bold text-amber-600">{totalRequested.toLocaleString()} pts</p>
                <p className="text-xs text-gray-400">Demandes en attente de traitement</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Banknote size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Argent demande</p>
                <p className="text-xl font-bold text-emerald-600">{totalCashRequested.toFixed(2)} EUR</p>
                <p className="text-xs text-gray-400">Conversions en argent visibles sur la plateforme</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Rechercher un echange..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2" onClick={handleFilterClick}>
          <Filter size={16} />
          Filtrer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des echanges</CardTitle>
        </CardHeader>
        <CardContent>
          {scopedRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
              Aucun echange ne correspond au filtre courant.
            </div>
          ) : (
            <div className="space-y-3">
              {scopedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[hsl(var(--myhd-primary))]/30 hover:shadow-sm transition-all"
                >
                  <div className="h-10 w-10 rounded-lg bg-[hsl(var(--myhd-primary))]/10 flex items-center justify-center flex-shrink-0">
                    <Wallet size={20} className="text-[hsl(var(--myhd-primary))]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[hsl(var(--myhd-dark))]">
                        {request.exchangeType === 'cash'
                          ? `Conversion en argent - ${request.agentName}`
                          : `${request.rewardTitle} - ${request.agentName}`}
                      </h3>
                      <Badge variant="secondary" className={getStatusColor(request.status)}>
                        {translateStatusLabel(request.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {request.businessName} • {request.programName}
                    </p>
                    <p className="text-xs text-gray-400">
                      Demande le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[hsl(var(--myhd-primary))]">
                      {request.pointsSpent.toLocaleString()} pts
                    </p>
                    {request.cashAmount !== undefined && (
                      <p className="text-xs text-gray-400">{request.cashAmount.toFixed(2)} EUR</p>
                    )}
                  </div>
                  {role === 'business-owner' && request.status === 'requested' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={actionRequestId === request.id}>
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-emerald-600" onClick={() => void handleResolveRequest(request.id, 'approved')}>
                          Approuver
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => void handleResolveRequest(request.id, 'rejected')}>
                          Rejeter
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {role === 'business-owner' && request.status === 'approved' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={actionRequestId === request.id}>
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void handleAdvanceRequest(request.id, 'processing')}>
                          Marquer en traitement
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-emerald-600" onClick={() => void handleAdvanceRequest(request.id, 'complete')}>
                          Marquer paye
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => void handleAdvanceRequest(request.id, 'cancel')}>
                          Annuler
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {role === 'business-owner' && request.status === 'processing' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={actionRequestId === request.id}>
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-emerald-600" onClick={() => void handleAdvanceRequest(request.id, 'complete')}>
                          Marquer paye
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => void handleAdvanceRequest(request.id, 'cancel')}>
                          Annuler
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {role === 'agent' && ['requested', 'approved', 'processing'].includes(request.status) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={actionRequestId === request.id}>
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-red-600" onClick={() => void handleAdvanceRequest(request.id, 'cancel')}>
                          Annuler la demande
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
