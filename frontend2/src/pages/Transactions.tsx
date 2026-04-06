import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrendingUp, Search, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageFiltersBar } from '@/components/filters/PageFiltersBar';
import {
  fetchTransactionDetail,
  fetchTransactionSummary,
  type LiveTransactionDetail,
  type LiveTransactionSummary,
} from '@/lib/live-data';
import type { Prospect, Transaction, UserRole } from '@/types';
import { toast } from 'sonner';
import { translateStatusLabel } from '@/lib/frontend2-i18n';

interface TransactionsProps {
  role: UserRole;
  transactions?: Transaction[];
  prospects?: Prospect[];
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    validated: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    detected: 'bg-purple-100 text-purple-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const emptySummary: LiveTransactionSummary = {
  transactionCount: 0,
  totalAmount: 0,
  validatedAmount: 0,
  paidAmount: 0,
  pointsAwardedTotal: 0,
  linkedProspectCount: 0,
  statusBreakdown: {
    detected: 0,
    pending: 0,
    validated: 0,
    rejected: 0,
    paid: 0,
  },
};

export function TransactionsPage({
  role,
  transactions = [],
  prospects = [],
}: TransactionsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [summary, setSummary] = useState<LiveTransactionSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<LiveTransactionDetail | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const nextSummary = await fetchTransactionSummary();

        if (cancelled) {
          return;
        }

        setSummary(nextSummary);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les transactions.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [transactions, prospects]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.programName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.businessName.toLowerCase().includes(searchQuery.toLowerCase());

      const transactionDate = new Date(transaction.createdAt).getTime();
      const start = startDate ? new Date(startDate).getTime() : -Infinity;
      const end = endDate
        ? new Date(new Date(endDate).setHours(23, 59, 59, 999)).getTime()
        : Infinity;
      const matchesStatus = selectedStatus === 'all' || transaction.status === selectedStatus;

      return matchesSearch && matchesStatus && transactionDate >= start && transactionDate <= end;
    });
  }, [endDate, searchQuery, selectedStatus, startDate, transactions]);

  const openTransactionDetails = async (transactionId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const detail = await fetchTransactionDetail(transactionId);
      setSelectedTransaction(detail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger les details de la transaction.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredProspects = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return prospects.filter((prospect) => {
      if (query.length === 0) {
        return true;
      }

      return (
        prospect.clientName.toLowerCase().includes(query) ||
        prospect.programName.toLowerCase().includes(query) ||
        prospect.agentName.toLowerCase().includes(query)
      );
    });
  }, [prospects, searchQuery]);

  const uniqueAgents = useMemo(
    () => new Set(transactions.map((transaction) => transaction.agentId)).size,
    [transactions]
  );
  const availableStatuses = useMemo(
    () => Array.from(new Set(transactions.map((transaction) => transaction.status))).sort(),
    [transactions]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-gray-500">
          Chargement des transactions et des donnees de conversion...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {role === 'business-owner' ? (
          <Card>
            <CardContent className="p-4">
              <p className="mb-1 text-sm text-gray-500">Volume total</p>
              <p className="text-2xl font-bold text-[hsl(var(--myhd-dark))]">
                {summary.totalAmount.toLocaleString()} {filteredTransactions[0]?.currency ?? 'EUR'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <p className="mb-1 text-sm text-gray-500">Points attribues</p>
              <p className="text-2xl font-bold text-[hsl(var(--myhd-dark))]">
                {summary.pointsAwardedTotal.toLocaleString()} pts
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Somme des points gagnes sur vos conversions
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 text-sm text-gray-500">Clients</p>
            <p className="text-2xl font-bold text-[hsl(var(--myhd-primary))]">{summary.linkedProspectCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 text-sm text-gray-500">Prospects globaux</p>
            <p className="text-2xl font-bold text-amber-600">{filteredProspects.length}</p>
            <p className="mt-1 text-xs text-gray-400">Tous statuts confondus</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 text-sm text-gray-500">
              {role === 'business-owner' ? 'Affilies contributeurs' : 'Points totaux'}
            </p>
            <p className="text-2xl font-bold text-[hsl(var(--myhd-cyan))]">
              {role === 'business-owner'
                ? uniqueAgents
                : `${summary.pointsAwardedTotal.toLocaleString()} pts`}
            </p>
          </CardContent>
        </Card>
      </div>

      <PageFiltersBar>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Rechercher client ou service..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-auto">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[10rem]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {availableStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                  {translateStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="flex h-10 w-full items-center gap-2 rounded-lg border bg-white px-3 py-1.5 shadow-sm sm:w-auto">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Du</span>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-auto w-full border-none bg-transparent p-0 text-sm focus-visible:ring-0 sm:w-32"
            />
          </div>
          <div className="flex h-10 w-full items-center gap-2 rounded-lg border bg-white px-3 py-1.5 shadow-sm sm:w-auto">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Au</span>
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-auto w-full border-none bg-transparent p-0 text-sm focus-visible:ring-0 sm:w-32"
            />
          </div>
        </div>
        {(searchQuery || selectedStatus !== 'all' || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus('all');
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            Effacer
          </Button>
        )}
      </PageFiltersBar>

      <p className="text-sm text-gray-500">
        Les clients convertis sont synchronises depuis IACRM. Les points affiches ici suivent la regle definie dans chaque programme.
      </p>

      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-500">
            Aucune transaction ne correspond au filtre courant.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <TrendingUp size={20} className="text-emerald-600" />
                  </div>
                  <div
                    className={`flex-1 min-w-0 grid grid-cols-1 gap-4 items-center lg:gap-8 ${
                      role === 'agent' ? 'md:grid-cols-2' : 'md:grid-cols-3'
                    }`}
                  >
                    <div>
                      <p className="mb-1 text-xs text-gray-400">Client</p>
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-[hsl(var(--myhd-dark))]">
                          {transaction.clientName}
                        </h3>
                        <Badge variant="secondary" className={getStatusColor(transaction.status)}>
                          {translateStatusLabel(transaction.status)}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-xs text-gray-400">Service / Produit</p>
                      <p className="truncate text-sm font-medium text-[hsl(var(--myhd-primary))]">
                        {transaction.programName}
                      </p>
                    </div>

                    {role !== 'agent' && (
                      <div>
                        <p className="mb-1 text-xs text-gray-400">Affilie</p>
                        <p className="truncate text-sm font-medium text-gray-700">
                          {transaction.agentId}{' '}
                          <span className="text-gray-400">({transaction.agentName})</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="hidden items-center gap-8 sm:flex">
                    {role === 'business-owner' ? (
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Valeur</p>
                        <p className="font-semibold text-[hsl(var(--myhd-dark))]">
                          {transaction.amount.toLocaleString()} pts
                        </p>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Points attribues</p>
                        <p className="font-semibold text-[hsl(var(--myhd-primary))]">
                          {transaction.commission.toLocaleString()} pts
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Date</p>
                      <p className="font-medium text-gray-700">
                        {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void openTransactionDetails(transaction.id)}>
                        Voir les details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Details de la transaction</DialogTitle>
            <DialogDescription>
              Informations de conversion, programme rattache et montant en base.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || selectedTransaction === null ? (
            <div className="py-6 text-sm text-gray-500">Chargement des details de la transaction...</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-[hsl(var(--myhd-light))]/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">{selectedTransaction.clientName}</h3>
                    <p className="mt-1 text-sm text-gray-500">{selectedTransaction.programName}</p>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(selectedTransaction.status)}>
                    {translateStatusLabel(selectedTransaction.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Montants</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Reference:</span> {selectedTransaction.transactionReference || ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Produit:</span> {selectedTransaction.productName || ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Montant:</span> {selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Points:</span> {selectedTransaction.commission.toLocaleString()} pts</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Rattachement</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Affilie:</span> {selectedTransaction.agentName}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Email agent:</span> {selectedTransaction.agentEmail || ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Entreprise:</span> {selectedTransaction.businessName}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Date:</span> {new Date(selectedTransaction.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
