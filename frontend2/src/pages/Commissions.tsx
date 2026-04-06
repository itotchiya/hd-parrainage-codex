import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Wallet,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Layers3,
  Gift,
  ArrowRightLeft,
  Check,
  Banknote,
  ArrowLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageFiltersBar } from '@/components/filters/PageFiltersBar';
import {
  fetchFrontend2PointsByProgram,
  fetchFrontend2PointsSummary,
  fetchTransactionDetail,
  type CreateCashExchangePayload,
  type CreateRewardExchangePayload,
  type LivePointsProgramBalance,
  type LivePointsSummary,
  type LiveTransactionDetail,
} from '@/lib/live-data';
import { useAuthSession } from '@/lib/auth-session';
import type { ExchangePack, ExchangeRequest, Program, Transaction, UserRole } from '@/types';
import { translateStatusLabel } from '@/lib/frontend2-i18n';
import { toast } from 'sonner';

interface CommissionsProps {
  role: UserRole;
  programs: Program[];
  exchangePacks: ExchangePack[];
  exchangeRequests: ExchangeRequest[];
  transactions?: Transaction[];
  onCreateRewardExchangeRequest: (payload: CreateRewardExchangePayload) => Promise<void>;
  onCreateCashExchangeRequest: (payload: CreateCashExchangePayload) => Promise<void>;
}

type RewardOption = {
  id: string;
  title: string;
  description: string;
  delivery: string;
  pointsCost: number;
};

const emptyPointsSummary: LivePointsSummary = {
  forecastPoints: 0,
  pendingPoints: 0,
  availablePoints: 0,
  lockedPoints: 0,
  consumedPoints: 0,
  reversedPoints: 0,
  openProspectCount: 0,
  ledgerEntryCount: 0,
  activeExchangeRequestCount: 0,
};

const getStatusColor = (status: string) =>
  ({
    paid: 'bg-emerald-100 text-emerald-700',
    validated: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    detected: 'bg-purple-100 text-purple-700',
    rejected: 'bg-red-100 text-red-700',
  }[status] ?? 'bg-gray-100 text-gray-700');

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid':
      return <CheckCircle size={16} className="text-emerald-600" />;
    case 'validated':
      return <CheckCircle size={16} className="text-blue-600" />;
    case 'pending':
      return <Clock size={16} className="text-amber-600" />;
    case 'rejected':
      return <XCircle size={16} className="text-red-600" />;
    default:
      return <Clock size={16} className="text-gray-600" />;
  }
};

function buildRewardOptions(
  programDefinition: Program | null,
  programBalance: LivePointsProgramBalance | null,
  exchangePacks: ExchangePack[]
): RewardOption[] {
  if (programBalance && programBalance.exchangePackItems.length > 0) {
    return programBalance.exchangePackItems.map((item, index) => ({
      id: item.id,
      title: item.title,
      description: `Option issue du pack ${programBalance.exchangePackName ?? 'associe'}.`,
      delivery: index === 0 ? 'Activation rapide' : index === 1 ? 'Traitement standard' : 'Option premium',
      pointsCost: item.pointsCost,
    }));
  }

  if (programDefinition?.exchangePackId) {
    const linkedPack = exchangePacks.find((pack) => pack.id === programDefinition.exchangePackId);
    if (linkedPack) {
      return linkedPack.items.map((item, index) => ({
        id: item.id,
        title: item.label,
        description: `Option issue du pack ${linkedPack.name}.`,
        delivery: index === 0 ? 'Activation rapide' : index === 1 ? 'Traitement standard' : 'Option premium',
        pointsCost: item.pointsCost,
      }));
    }
  }

  return [];
}

export function CommissionsPage({
  role,
  programs,
  exchangePacks,
  exchangeRequests,
  transactions = [],
  onCreateRewardExchangeRequest,
  onCreateCashExchangeRequest,
}: CommissionsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFilterProgramId, setSelectedFilterProgramId] = useState('all');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [selectedExchangeMode, setSelectedExchangeMode] = useState<'reward' | 'cash' | null>(null);
  const [cashPointsInput, setCashPointsInput] = useState('');
  const [pointsSummary, setPointsSummary] = useState<LivePointsSummary>(emptyPointsSummary);
  const [pointsByProgram, setPointsByProgram] = useState<LivePointsProgramBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingExchange, setSubmittingExchange] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<LiveTransactionDetail | null>(null);
  const { user } = useAuthSession();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextPointsSummary, nextPointsByProgram] = await Promise.all([
          fetchFrontend2PointsSummary(),
          fetchFrontend2PointsByProgram(),
        ]);

        if (cancelled) return;
        setPointsSummary(nextPointsSummary);
        setPointsByProgram(nextPointsByProgram);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger la page Points.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exchangeRequests, programs, transactions]);

  const commissions = useMemo(
    () =>
      transactions.map((transaction) => ({
        id: transaction.id,
        programId: transaction.programId,
        agentName: transaction.agentName,
        clientName: transaction.clientName,
        programName: transaction.programName,
        businessName: transaction.businessName,
        amount: transaction.commission,
        status: transaction.status,
        date: transaction.createdAt,
      })),
    [transactions]
  );

  const filteredCommissions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return commissions.filter((commission) => {
      const matchesSearch = [commission.agentName, commission.clientName, commission.programName, commission.businessName]
        .some((value) => value.toLowerCase().includes(query));
      const matchesStatus = selectedStatus === 'all' || commission.status === selectedStatus;
      const matchesProgram =
        selectedFilterProgramId === 'all' || commission.programId === selectedFilterProgramId;

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [commissions, searchQuery, selectedFilterProgramId, selectedStatus]);

  const totalPending = pointsSummary.pendingPoints;
  const totalPaid = transactions.reduce((sum, transaction) => sum + transaction.commission, 0);
  const transactionCountByProgramId = useMemo(
    () =>
      transactions.reduce<Record<string, number>>((counts, transaction) => {
        counts[transaction.programId] = (counts[transaction.programId] ?? 0) + 1;
        return counts;
      }, {}),
    [transactions]
  );

  const programBreakdown = useMemo(
    () =>
      pointsByProgram
        .map((balance) => {
          const linkedProgram = programs.find((program) => program.id === balance.programId);
          const linkedTransaction = transactions.find((transaction) => transaction.programId === balance.programId);
          return {
            programId: balance.programId,
            programName: linkedProgram?.name ?? balance.programName,
            businessName: linkedProgram?.businessName ?? linkedTransaction?.businessName ?? 'Entreprise',
            points: balance.availablePoints,
            deals: transactionCountByProgramId[balance.programId] ?? 0,
            balance,
          };
        })
        .filter((item) => {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            query.length === 0 ||
            item.programName.toLowerCase().includes(query) ||
            item.businessName.toLowerCase().includes(query);
          const matchesProgram =
            selectedFilterProgramId === 'all' || item.programId === selectedFilterProgramId;

          return matchesSearch && matchesProgram;
        })
        .sort((left, right) => right.points - left.points),
    [pointsByProgram, programs, searchQuery, selectedFilterProgramId, transactionCountByProgramId, transactions]
  );

  const totalRedeemed = pointsSummary.consumedPoints + pointsSummary.lockedPoints;
  const totalAvailablePoints = pointsSummary.availablePoints;
  const agentProfileId = user?.agent_profile?.id ?? null;
  const agentExchangeHistory = exchangeRequests.filter((request) => request.agentId === agentProfileId);
  const filteredAgentExchangeHistory = agentExchangeHistory.filter((request) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      request.programName.toLowerCase().includes(query) ||
      request.businessName.toLowerCase().includes(query) ||
      (request.rewardTitle ?? '').toLowerCase().includes(query);
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesProgram =
      selectedFilterProgramId === 'all' || request.programId === selectedFilterProgramId;

    return matchesSearch && matchesStatus && matchesProgram;
  });
  const totalCashExchanged = agentExchangeHistory
    .filter((request) => request.exchangeType === 'cash' && ['approved', 'processing', 'completed'].includes(request.status))
    .reduce((sum, request) => sum + (request.cashAmount ?? 0), 0);

  const selectedProgram = programBreakdown.find((program) => program.programId === selectedProgramId) ?? null;
  const selectedProgramDefinition = selectedProgram ? programs.find((program) => program.id === selectedProgram.programId) ?? null : null;
  const selectedProgramAllowsRewards =
    selectedProgramDefinition?.exchangeMode === 'reward' ||
    selectedProgramDefinition?.exchangeMode === 'both' ||
    selectedProgram?.balance.exchangeMode === 'reward' ||
    selectedProgram?.balance.exchangeMode === 'both';
  const selectedProgramAllowsCash =
    selectedProgramDefinition?.exchangeMode === 'cash' ||
    selectedProgramDefinition?.exchangeMode === 'both' ||
    selectedProgram?.balance.exchangeMode === 'cash' ||
    selectedProgram?.balance.exchangeMode === 'both';
  const selectedRewards = buildRewardOptions(selectedProgramDefinition, selectedProgram?.balance ?? null, exchangePacks);
  const selectedReward = selectedRewards.find((reward) => reward.id === selectedRewardId) ?? null;
  const cashPointsValue = Number(cashPointsInput);
  const selectedProgramPointsPerEuro = selectedProgramDefinition?.pointsPerEuro ?? 0;
  const canConvertCash =
    Boolean(selectedProgram) &&
    selectedProgramPointsPerEuro > 0 &&
    Number.isFinite(cashPointsValue) &&
    cashPointsValue > 0 &&
    cashPointsValue <= (selectedProgram?.points ?? 0);
  const cashAmount = canConvertCash ? cashPointsValue / selectedProgramPointsPerEuro : 0;

  const openExchangeModal = (programId: string) => {
    const program = programBreakdown.find((item) => item.programId === programId);
    if (!program) return;
    setSelectedProgramId(programId);
    setSelectedExchangeMode(null);
    setCashPointsInput('');
    const rewards = buildRewardOptions(programs.find((catalogProgram) => catalogProgram.id === program.programId) ?? null, program.balance, exchangePacks);
    setSelectedRewardId(rewards[0]?.id ?? null);
  };

  const closeExchangeModal = () => {
    setSelectedProgramId(null);
    setSelectedRewardId(null);
    setSelectedExchangeMode(null);
    setCashPointsInput('');
    setSubmittingExchange(false);
  };

  const handleExchange = async () => {
    if (!selectedProgram || !selectedProgramDefinition) return;

    try {
      setSubmittingExchange(true);
      if (selectedExchangeMode === 'cash') {
        if (!canConvertCash) return;
        await onCreateCashExchangeRequest({ programId: selectedProgram.programId, pointsAmount: cashPointsValue });
        toast.success(`Demande de conversion en argent envoyee pour ${cashAmount.toFixed(2)} EUR`);
        closeExchangeModal();
        return;
      }

      if (!selectedReward) return;
      await onCreateRewardExchangeRequest({ programId: selectedProgram.programId, exchangePackItemId: selectedReward.id });
      toast.success(`Demande d echange envoyee pour ${selectedReward.title}`);
      closeExchangeModal();
    } catch (exchangeError) {
      toast.error(exchangeError instanceof Error ? exchangeError.message : 'Impossible d envoyer la demande.');
    } finally {
      setSubmittingExchange(false);
    }
  };

  const openCommissionDetails = async (transactionId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const detail = await fetchTransactionDetail(transactionId);
      setSelectedTransaction(detail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger les details.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const availableStatuses = useMemo(
    () =>
      Array.from(
        new Set([
          ...commissions.map((commission) => commission.status),
          ...agentExchangeHistory.map((request) => request.status),
        ])
      ).sort(),
    [agentExchangeHistory, commissions]
  );
  const filterablePrograms = useMemo(
    () =>
      Array.from(
        new Map(
          programs.map((program) => [program.id, { id: program.id, name: program.name }])
        ).values()
      ),
    [programs]
  );

  if (loading) {
    return <Card><CardContent className="p-6 text-sm text-gray-500">Chargement des points, des programmes et des echanges...</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="p-6 text-sm text-red-600">{error}</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {role === 'agent' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-[hsl(var(--myhd-primary))]/10 flex items-center justify-center"><Wallet size={20} className="text-[hsl(var(--myhd-primary))]" /></div><div><p className="text-sm text-gray-500">Solde de points disponible</p><p className="text-xl font-bold text-[hsl(var(--myhd-primary))]">{totalAvailablePoints.toLocaleString()} pts</p><p className="text-xs text-gray-400">Utilisable en argent ou en recompenses</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Banknote size={20} className="text-emerald-600" /></div><div><p className="text-sm text-gray-500">Argent echange</p><p className="text-xl font-bold text-emerald-600">{totalCashExchanged.toFixed(2)} EUR</p><p className="text-xs text-gray-400">Conversions en argent approuvees</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><ArrowRightLeft size={20} className="text-amber-600" /></div><div><p className="text-sm text-gray-500">Points consommes</p><p className="text-xl font-bold text-amber-600">{totalRedeemed.toLocaleString()} pts</p><p className="text-xs text-gray-400">Points deja engages dans vos demandes</p></div></div></CardContent></Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><Clock size={20} className="text-amber-600" /></div><div><p className="text-sm text-gray-500">En attente</p><p className="text-xl font-bold text-amber-600">{totalPending.toLocaleString()} pts</p><p className="text-xs text-gray-400">Points lies aux prospects en cours</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle size={20} className="text-emerald-600" /></div><div><p className="text-sm text-gray-500">Valides</p><p className="text-xl font-bold text-emerald-600">{totalPaid.toLocaleString()} pts</p><p className="text-xs text-gray-400">Points issus des clients convertis</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-[hsl(var(--myhd-primary))]/10 flex items-center justify-center"><Wallet size={20} className="text-[hsl(var(--myhd-primary))]" /></div><div><p className="text-sm text-gray-500">Total des points</p><p className="text-xl font-bold text-[hsl(var(--myhd-primary))]">{(totalPending + totalPaid).toLocaleString()} pts</p><p className="text-xs text-gray-400">Prospects + clients convertis</p></div></div></CardContent></Card>
        </div>
      )}

      <PageFiltersBar>
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder={role === 'agent' ? 'Rechercher un programme ou un client...' : 'Rechercher une commission...'}
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
        <div className="w-full sm:w-auto">
          <Select value={selectedFilterProgramId} onValueChange={setSelectedFilterProgramId}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[12rem]">
              <SelectValue placeholder="Programme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les programmes</SelectItem>
              {filterablePrograms.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(searchQuery || selectedStatus !== 'all' || selectedFilterProgramId !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus('all');
              setSelectedFilterProgramId('all');
            }}
            className="text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            Effacer
          </Button>
        )}
      </PageFiltersBar>

      {role === 'agent' && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-lg">Repartition de mes points par programme</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {programBreakdown.map((program) => (
                  <button
                    key={program.programId}
                    type="button"
                    onClick={() => openExchangeModal(program.programId)}
                    className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:border-[hsl(var(--myhd-primary))]/30 hover:shadow-sm transition-all text-left"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-[hsl(var(--myhd-primary))]/10 flex items-center justify-center flex-shrink-0"><Layers3 size={18} className="text-[hsl(var(--myhd-primary))]" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[hsl(var(--myhd-dark))] truncate">{program.businessName} • {program.programName}</p>
                        <p className="text-sm text-gray-500">{program.deals} transaction{program.deals > 1 ? 's' : ''} prise{program.deals > 1 ? 's' : ''} en compte</p>
                        <p className="text-xs text-[hsl(var(--myhd-primary))] font-medium mt-1">Cliquer pour echanger ces points</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-[hsl(var(--myhd-primary))]">{program.points.toLocaleString()} pts</p>
                      <p className="text-xs text-gray-400">Voir les options</p>
                    </div>
                  </button>
                ))}

                {programBreakdown.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    Aucun solde de points disponible par programme pour le moment.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {agentExchangeHistory.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Historique des echanges</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredAgentExchangeHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[hsl(var(--myhd-dark))]">
                            {item.exchangeType === 'cash' ? `Conversion en argent - ${item.cashAmount?.toFixed(2) ?? '0.00'} EUR` : item.rewardTitle}
                          </p>
                          <Badge
                            variant="secondary"
                            className={
                              item.status === 'approved' || item.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item.status === 'rejected' || item.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : item.status === 'processing'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-amber-100 text-amber-700'
                            }
                          >
                            {translateStatusLabel(item.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{item.businessName} • {item.programName}</p>
                        <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div className="text-right flex-shrink-0"><p className="text-lg font-bold text-[hsl(var(--myhd-primary))]">-{item.pointsSpent.toLocaleString()} pts</p></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">{role === 'agent' ? 'Historique de mes points' : 'Liste des commissions'}</CardTitle></CardHeader>
        <CardContent>
          {filteredCommissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
              Aucune ligne ne correspond au filtre courant.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCommissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[hsl(var(--myhd-primary))]/30 hover:shadow-sm transition-all"
                >
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">{getStatusIcon(commission.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[hsl(var(--myhd-dark))]">{role === 'agent' ? commission.clientName : commission.agentName}</h3>
                      <Badge variant="secondary" className={getStatusColor(commission.status)}>{translateStatusLabel(commission.status)}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{commission.businessName} • {commission.programName}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-lg font-bold text-[hsl(var(--myhd-primary))]">{commission.amount.toLocaleString()} pts</p>
                      <p className="text-xs text-gray-400">{new Date(commission.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal size={18} /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void openCommissionDetails(commission.id)}>
                        Voir les details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedProgram)} onOpenChange={(open) => !open && closeExchangeModal()}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Echanger mes points</DialogTitle>
            <DialogDescription>
              {selectedProgram
                ? selectedExchangeMode === null
                  ? `Choisissez le chemin d echange pour le programme ${selectedProgram.programName}.`
                  : `Options configurees pour le programme ${selectedProgram.programName}.`
                : 'Choisissez une option d echange.'}
            </DialogDescription>
          </DialogHeader>

          {selectedProgram && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-[hsl(var(--myhd-light))] border border-[hsl(var(--myhd-primary))]/10 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Programme selectionne</p>
                    <p className="font-semibold text-[hsl(var(--myhd-dark))]">{selectedProgram.businessName} • {selectedProgram.programName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Solde disponible</p>
                    <p className="text-2xl font-bold text-[hsl(var(--myhd-primary))]">{selectedProgram.points.toLocaleString()} pts</p>
                  </div>
                </div>
              </div>

              {selectedExchangeMode === null ? (
                <div className="grid gap-3 grid-cols-1">
                  {selectedProgramAllowsRewards && (
                    <button type="button" onClick={() => setSelectedExchangeMode('reward')} className="rounded-2xl border p-4 text-left transition-all border-gray-100 hover:border-[hsl(var(--myhd-primary))]/30">
                      <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-[hsl(var(--myhd-primary))]/10 flex items-center justify-center"><Gift size={18} className="text-[hsl(var(--myhd-primary))]" /></div><div><p className="font-semibold text-[hsl(var(--myhd-dark))]">Recompenses</p><p className="text-sm text-gray-500">Choisir un avantage du pack</p></div></div>
                    </button>
                  )}
                  {selectedProgramAllowsCash && (
                    <button type="button" onClick={() => setSelectedExchangeMode('cash')} className="rounded-2xl border p-4 text-left transition-all border-gray-100 hover:border-[hsl(var(--myhd-primary))]/30">
                      <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Banknote size={18} className="text-emerald-600" /></div><div><p className="font-semibold text-[hsl(var(--myhd-dark))]">Argent</p><p className="text-sm text-gray-500">{selectedProgramPointsPerEuro > 0 ? `${selectedProgramPointsPerEuro.toLocaleString()} pts = 1 EUR` : 'Taux non configure'}</p></div></div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Button type="button" variant="ghost" className="px-0 text-[hsl(var(--myhd-primary))] hover:text-[hsl(var(--myhd-primary))] hover:bg-transparent" onClick={() => setSelectedExchangeMode(null)}>
                    <ArrowLeft size={16} className="mr-2" />Retour au choix du chemin
                  </Button>

                  {selectedExchangeMode === 'reward' ? (
                    <>
                      <p className="text-sm font-semibold text-[hsl(var(--myhd-dark))]">Recompenses disponibles</p>
                      {selectedRewards.map((reward) => {
                        const isSelected = reward.id === selectedRewardId;
                        const canRedeem = selectedProgram.points >= reward.pointsCost;
                        return (
                          <button
                            key={reward.id}
                            type="button"
                            onClick={() => setSelectedRewardId(reward.id)}
                            className={`w-full text-left rounded-2xl border p-4 transition-all ${isSelected ? 'border-[hsl(var(--myhd-primary))] bg-[hsl(var(--myhd-primary))]/5 shadow-sm' : 'border-gray-100 hover:border-[hsl(var(--myhd-primary))]/30'}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-lg bg-[hsl(var(--myhd-primary))]/10 flex items-center justify-center flex-shrink-0"><Gift size={18} className="text-[hsl(var(--myhd-primary))]" /></div>
                                <div>
                                  <div className="flex items-center gap-2"><p className="font-semibold text-[hsl(var(--myhd-dark))]">{reward.title}</p>{isSelected && <Badge variant="secondary" className="bg-[hsl(var(--myhd-primary))]/10 text-[hsl(var(--myhd-primary))]">selectionne</Badge>}</div>
                                  <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
                                  <p className="text-xs text-gray-400 mt-2">{reward.delivery}</p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0"><p className="text-lg font-bold text-[hsl(var(--myhd-primary))]">{reward.pointsCost.toLocaleString()} pts</p><p className={`text-xs mt-1 ${canRedeem ? 'text-emerald-600' : 'text-red-500'}`}>{canRedeem ? 'Echange possible' : 'Solde insuffisant'}</p></div>
                            </div>
                          </button>
                        );
                      })}
                      {selectedRewards.length === 0 && <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Aucune recompense n est configuree sur ce programme.</div>}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-gray-100 p-4 space-y-4">
                      <div><p className="text-sm font-semibold text-[hsl(var(--myhd-dark))]">Conversion en argent</p><p className="text-sm text-gray-500 mt-1">Definissez le nombre de points a convertir en argent selon le taux configure sur ce programme.</p></div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[hsl(var(--myhd-dark))]">Points a convertir</label>
                          <Input type="number" min="1" max={selectedProgram.points} value={cashPointsInput} onChange={(event) => setCashPointsInput(event.target.value)} placeholder="Ex: 1000" />
                        </div>
                        <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500 mb-1">Montant estime</p><p className="text-2xl font-bold text-emerald-600">{cashAmount.toFixed(2)} EUR</p><p className="text-xs text-gray-400 mt-1">Taux: {selectedProgramPointsPerEuro.toLocaleString()} pts = 1 EUR</p></div>
                      </div>
                      <p className={`text-xs ${canConvertCash ? 'text-emerald-600' : 'text-red-500'}`}>{canConvertCash ? 'Conversion en argent possible' : 'Renseignez un volume de points valide pour effectuer la conversion'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeExchangeModal} disabled={submittingExchange}>Annuler</Button>
            {selectedExchangeMode !== null && (
              <Button
                className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 text-white"
                onClick={() => void handleExchange()}
                disabled={submittingExchange || !selectedProgram || (selectedExchangeMode === 'reward' ? !selectedReward || selectedProgram.points < selectedReward.pointsCost : !canConvertCash)}
              >
                <Check size={16} className="mr-2" />
                {selectedExchangeMode === 'cash' ? 'Confirmer la conversion en argent' : 'Confirmer l echange'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Details du point / commission</DialogTitle>
            <DialogDescription>
              Ligne detaillee issue de la transaction source dans la base.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || selectedTransaction === null ? (
            <div className="py-6 text-sm text-gray-500">Chargement des details...</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-[hsl(var(--myhd-light))]/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">{selectedTransaction.clientName}</h3>
                    <p className="mt-1 text-sm text-gray-500">{selectedTransaction.businessName} • {selectedTransaction.programName}</p>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(selectedTransaction.status)}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Montants</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Commission:</span> {selectedTransaction.commission.toLocaleString()} pts</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Valeur:</span> {selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Reference:</span> {selectedTransaction.transactionReference || ''}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Attribution</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Affilie:</span> {selectedTransaction.agentName}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Email agent:</span> {selectedTransaction.agentEmail || ''}</p>
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
