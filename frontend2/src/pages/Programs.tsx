import { useState, type Dispatch, type SetStateAction } from 'react';
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
import {
  Briefcase,
  Search,
  Plus,
  MoreHorizontal,
  ArrowUpRight,
  Wallet,
  Banknote,
  Gift,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageFiltersBar } from '@/components/filters/PageFiltersBar';
import { NewProgramModal } from '@/components/programs/NewProgramModal';
import { ProspectActionModal } from '@/components/programs/ProspectActionModal';
import {
  createFrontend2Program,
  fetchProgramDetail,
  reactivateFrontend2Program,
  suspendFrontend2Program,
  type LiveProgramDetail,
  updateFrontend2Program,
} from '@/lib/live-data';
import type { ExchangePack, Program, UserRole } from '@/types';
import { translateStatusLabel } from '@/lib/frontend2-i18n';
import { toast } from 'sonner';
import { useAuthSession } from '@/lib/auth-session';

interface ProgramsProps {
  role: UserRole;
  programs: Program[];
  exchangePacks: ExchangePack[];
  onProgramsChange: Dispatch<SetStateAction<Program[]>>;
  readOnly?: boolean;
  onRefreshPrograms?: () => Promise<void>;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    draft: 'bg-gray-100 text-gray-700',
    paused: 'bg-orange-100 text-orange-700',
    suspended: 'bg-red-100 text-red-700',
    archived: 'bg-slate-100 text-slate-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const getCommissionLabel = (type: Program['commissionType']) => {
  switch (type) {
    case 'per-transaction':
      return 'Par transaction';
    case 'revenue-tier':
      return 'Par tranche de CA';
    default:
      return type;
  }
};

const getExchangeModeLabel = (mode: Program['exchangeMode']) => {
  switch (mode) {
    case 'cash':
      return 'Argent';
    case 'reward':
      return 'Recompenses';
    case 'both':
      return 'Recompenses + argent';
    default:
      return mode;
  }
};

export function Programs({
  role,
  programs,
  exchangePacks,
  onProgramsChange,
  readOnly = false,
  onRefreshPrograms,
}: ProgramsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedExchangeMode, setSelectedExchangeMode] = useState('all');
  const [detailProgram, setDetailProgram] = useState<LiveProgramDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusProgramId, setStatusProgramId] = useState<string | null>(null);
  const { user } = useAuthSession();
  const scopedBusinessId =
    user?.current_business_id ?? user?.primary_business?.id ?? user?.business_assignments[0]?.business?.id ?? null;
  const scopedBusinessName =
    user?.primary_business?.display_name ?? user?.business_assignments[0]?.business?.display_name ?? 'Entreprise';

  const visiblePrograms = programs.filter((program) => {
    if (role === 'agent') {
      return true;
    }

    if (role === 'business-owner' && scopedBusinessId) {
      return program.businessId === scopedBusinessId;
    }

    return true;
  });

  const availableStatuses = Array.from(new Set(visiblePrograms.map((program) => program.status))).sort();
  const availableExchangeModes = Array.from(new Set(visiblePrograms.map((program) => program.exchangeMode))).sort();

  const filteredPrograms = visiblePrograms.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.businessName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || program.status === selectedStatus;
    const matchesExchangeMode =
      selectedExchangeMode === 'all' || program.exchangeMode === selectedExchangeMode;

    return matchesSearch && matchesStatus && matchesExchangeMode;
  });
  const productOptions = visiblePrograms.map((program) => ({
    id: program.id,
    name: program.name,
    category: program.businessName,
  }));

  const handleOpenDetails = async (programId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const nextProgram = await fetchProgramDetail(programId);
      setDetailProgram(nextProgram);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger les details du programme.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (readOnly) {
      toast.info('La consultation en direct est active. Les mutations de programme seront branchees dans une phase suivante.');
      return;
    }

    setStatusProgramId(id);

    try {
      const currentProgram = programs.find((program) => program.id === id);
      const nextProgram =
        currentProgram?.status === 'suspended'
          ? await reactivateFrontend2Program(id)
          : await suspendFrontend2Program(id);

      onProgramsChange((prev) =>
        prev.map((program) => (program.id === id ? nextProgram : program))
      );

      if (detailProgram?.id === id) {
        setDetailProgram((prev) => (prev ? { ...prev, ...nextProgram } : prev));
      }

      if (onRefreshPrograms) {
        await onRefreshPrograms();
      }

      toast.success(nextProgram.status === 'suspended' ? 'Programme suspendu.' : 'Programme reactive.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de mettre a jour le programme.');
    } finally {
      setStatusProgramId(null);
    }
  };

  const handleSaveProgram = async (nextProgram: Program) => {
    if (readOnly) {
      toast.info('La creation et l edition de programmes seront branchees au backend dans une phase suivante.');
      return;
    }

    try {
      const exists = programs.some((program) => program.id === nextProgram.id);
      const savedProgram = exists
        ? await updateFrontend2Program(nextProgram.id, nextProgram)
        : await createFrontend2Program(nextProgram);

      onProgramsChange((prev) => {
        if (exists) {
          return prev.map((program) => (program.id === savedProgram.id ? savedProgram : program));
        }

        return [savedProgram, ...prev];
      });

      if (onRefreshPrograms) {
        await onRefreshPrograms();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d enregistrer le programme.');
      throw error;
    }
  };

  const getProgramOptions = (program: Program) => {
    if (program.exchangePackId) {
      const pack = exchangePacks.find((item) => item.id === program.exchangePackId);
      if (pack) return pack.items.filter((item) => item.label.trim().length > 0);
    }

    return (program.redemptionOptions ?? []).map((option) => ({ id: option, label: option, pointsCost: 0 }));
  };

  const getPackName = (program: Program) =>
    exchangePacks.find((pack) => pack.id === program.exchangePackId)?.name || 'Non defini';

  return (
    <div className="space-y-6">
      <PageFiltersBar
        actions={
          role !== 'agent' ? (
            <NewProgramModal
              packs={exchangePacks}
              onSaveProgram={handleSaveProgram}
              businessId={scopedBusinessId ?? undefined}
              businessName={scopedBusinessName}
              productOptions={productOptions}
            >
              <Button className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 gap-2" disabled={readOnly}>
                <Plus size={16} />
                Nouveau programme
              </Button>
            </NewProgramModal>
          ) : null
        }
      >
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Rechercher un programme..."
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
          <Select value={selectedExchangeMode} onValueChange={setSelectedExchangeMode}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[11rem]">
              <SelectValue placeholder="Type d echange" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les echanges</SelectItem>
              {availableExchangeModes.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {getExchangeModeLabel(mode)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(searchQuery || selectedStatus !== 'all' || selectedExchangeMode !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus('all');
              setSelectedExchangeMode('all');
            }}
            className="text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            Effacer
          </Button>
        )}
      </PageFiltersBar>

      <div className={`grid gap-4 ${role === 'agent' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {filteredPrograms.map((program) => (
          <Card key={program.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              {role === 'agent' ? (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                        <Briefcase size={26} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-xl text-[hsl(var(--myhd-dark))]">{program.name}</h3>
                          <Badge variant="secondary" className={getStatusColor(program.status)}>
                      {translateStatusLabel(program.status)}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-[hsl(var(--myhd-primary))] mb-2">{program.businessName}</p>
                        <p className="text-sm text-gray-600 max-w-3xl">{program.description}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void handleOpenDetails(program.id)}>
                          Voir les details
                        </DropdownMenuItem>
                        <ProspectActionModal program={program}>
                          <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                            Ajouter un prospect
                          </DropdownMenuItem>
                        </ProspectActionModal>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,0.9fr] gap-4">
                    <div className="rounded-2xl border border-gray-100 bg-[hsl(var(--myhd-light))]/60 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-3">Ce que vous gagnez</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white border border-gray-100 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Wallet size={16} className="text-[hsl(var(--myhd-primary))]" />
                            <p className="text-xs text-gray-400">Points attribues</p>
                          </div>
                          <p className="text-xl font-bold text-[hsl(var(--myhd-primary))]">
                            {program.pointsPerTransaction ? `${program.pointsPerTransaction.toLocaleString()} pts` : 'Non defini'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{getCommissionLabel(program.commissionType)}</p>
                        </div>

                        <div className="rounded-xl bg-white border border-gray-100 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Banknote size={16} className="text-emerald-600" />
                            <p className="text-xs text-gray-400">Conversion en argent</p>
                          </div>
                          <p className="text-xl font-bold text-emerald-600">
                            {program.exchangeMode === 'cash' || program.exchangeMode === 'both'
                              ? program.pointsPerEuro
                                ? `${program.pointsPerEuro.toLocaleString()} pts`
                                : 'Non defini'
                              : 'Non active'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {program.exchangeMode === 'cash' || program.exchangeMode === 'both'
                              ? 'pour 1 EUR'
                              : 'Ce programme ne propose pas la conversion en argent'}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white border border-gray-100 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Gift size={16} className="text-amber-600" />
                            <p className="text-xs text-gray-400">Pack actif</p>
                          </div>
                          <p className="text-lg font-bold text-[hsl(var(--myhd-dark))]">
                            {program.exchangeMode === 'reward' || program.exchangeMode === 'both'
                              ? getPackName(program)
                              : 'Non applicable'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{getExchangeModeLabel(program.exchangeMode)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[hsl(var(--myhd-primary))]/15 bg-gradient-to-br from-[hsl(var(--myhd-primary))]/5 to-[hsl(var(--myhd-cyan))]/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-3">Vue rapide</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Mode d attribution</p>
                          <p className="text-sm font-semibold text-[hsl(var(--myhd-dark))]">{getCommissionLabel(program.commissionType)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Voies d echange</p>
                          <p className="text-sm font-semibold text-[hsl(var(--myhd-dark))]">
                            {getExchangeModeLabel(program.exchangeMode)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Eligibilite</p>
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {program.eligibilityCriteria || 'Ouvert a vos recommandations qualifiees'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(program.exchangeMode === 'reward' || program.exchangeMode === 'both') &&
                    getProgramOptions(program).length > 0 && (
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Recompenses disponibles</p>
                          <p className="text-sm text-gray-500 mt-1">Avantages debloquables a partir de vos points</p>
                        </div>
                        <Badge variant="secondary" className="bg-[hsl(var(--myhd-primary))]/10 text-[hsl(var(--myhd-primary))]">
                          {getProgramOptions(program).length} option(s)
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {getProgramOptions(program).map((option) => (
                          <div key={option.id} className="rounded-xl bg-[hsl(var(--myhd-light))]/70 border border-gray-100 p-3">
                            <p className="text-sm font-medium text-[hsl(var(--myhd-dark))]">{option.label}</p>
                            <p className="text-xs text-[hsl(var(--myhd-primary))] mt-2 font-semibold">
                              {option.pointsCost > 0 ? `${option.pointsCost.toLocaleString()} pts` : 'Cout a definir'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {program.status === 'active' && (
                    <ProspectActionModal program={program}>
                      <Button className="w-full bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 h-12 text-base">
                        Ajouter un prospect
                        <ArrowUpRight size={18} className="ml-2" />
                      </Button>
                    </ProspectActionModal>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] flex items-center justify-center text-white flex-shrink-0">
                        <Briefcase size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[hsl(var(--myhd-dark))]">{program.name}</h3>
                          <Badge variant="secondary" className={getStatusColor(program.status)}>
                            {program.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{program.businessName}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{program.description}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void handleOpenDetails(program.id)}>
                          Voir les details
                        </DropdownMenuItem>
                        <NewProgramModal
                          packs={exchangePacks}
                          initialProgram={program}
                          onSaveProgram={handleSaveProgram}
                          businessId={scopedBusinessId ?? undefined}
                          businessName={scopedBusinessName}
                          productOptions={productOptions}
                        >
                          <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                            Modifier
                          </DropdownMenuItem>
                        </NewProgramModal>
                        {program.status === 'active' ? (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => void handleToggleStatus(program.id)}
                            disabled={readOnly || statusProgramId === program.id}
                          >
                            Suspendre
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-emerald-600"
                            onClick={() => void handleToggleStatus(program.id)}
                            disabled={readOnly || statusProgramId === program.id}
                          >
                            Reactiver
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Mode d attribution</p>
                        <p className="text-lg font-bold text-[hsl(var(--myhd-primary))]">
                          {getCommissionLabel(program.commissionType)}
                        </p>
                      </div>
                      <div className="sm:text-center">
                        <p className="text-xs text-gray-400 mb-1">Points attribues</p>
                        <p className="text-sm font-semibold text-[hsl(var(--myhd-dark))]">
                          {program.pointsPerTransaction
                            ? `${program.pointsPerTransaction.toLocaleString()} pts`
                            : 'Non defini'}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs text-gray-400 mb-1">Pack</p>
                        <p className="text-sm font-medium text-gray-700">
                          {program.exchangeMode === 'reward' || program.exchangeMode === 'both'
                            ? getPackName(program)
                            : 'Non applicable'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Conversion en argent</p>
                        <p className="text-sm font-semibold text-[hsl(var(--myhd-dark))]">
                          {program.exchangeMode === 'cash' || program.exchangeMode === 'both'
                            ? program.pointsPerEuro
                              ? `${program.pointsPerEuro.toLocaleString()} pts = 1 EUR`
                              : 'Non defini'
                            : 'Non active'}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs text-gray-400 mb-1">Voies d echange</p>
                        <p className="text-sm font-medium text-gray-700">{getExchangeModeLabel(program.exchangeMode)}</p>
                      </div>
                    </div>

                    {(program.exchangeMode === 'reward' || program.exchangeMode === 'both') &&
                      getProgramOptions(program).length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-400 mb-2">Possibilites d echange</p>
                        <div className="flex flex-wrap gap-2">
                          {getProgramOptions(program).map((option) => (
                            <span
                              key={option.id}
                              className="inline-flex items-center rounded-full bg-[hsl(var(--myhd-primary))]/10 px-3 py-1 text-xs font-medium text-[hsl(var(--myhd-primary))]"
                            >
                              {option.label}
                              {option.pointsCost > 0 ? ` - ${option.pointsCost} pts` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Details du programme</DialogTitle>
            <DialogDescription>
              Vue detaillee du programme, de ses regles et des affilies assignes.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || detailProgram === null ? (
            <div className="py-6 text-sm text-gray-500">Chargement des details du programme...</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-[hsl(var(--myhd-light))]/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">{detailProgram.name}</h3>
                      <Badge variant="secondary" className={getStatusColor(detailProgram.status)}>
                    {translateStatusLabel(detailProgram.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{detailProgram.businessName}</p>
                    <p className="mt-3 text-sm text-gray-600">{detailProgram.description || 'Aucune description renseignee.'}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Affilies assignes</p>
                    <p className="text-2xl font-bold text-[hsl(var(--myhd-primary))]">
                      {detailProgram.assignedAgents.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Configuration</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Commission:</span> {getCommissionLabel(detailProgram.commissionType)}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Echange:</span> {getExchangeModeLabel(detailProgram.exchangeMode)}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Points / transaction:</span> {detailProgram.pointsPerTransaction?.toLocaleString() ?? 'Non defini'}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Points / EUR:</span> {detailProgram.pointsPerEuro?.toLocaleString() ?? 'Non defini'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Eligibilite</p>
                  <p className="mt-3 text-sm text-gray-600">
                    {detailProgram.eligibilityCriteria || 'Aucun critere specifique defini.'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Affilies assignes</p>
                {detailProgram.assignedAgents.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">Aucun affilie assigne a ce programme.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {detailProgram.assignedAgents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-3">
                        <div>
                          <p className="font-medium text-[hsl(var(--myhd-dark))]">{agent.name}</p>
                          <p className="text-sm text-gray-500">{agent.email}</p>
                        </div>
                        <Badge variant="secondary" className="bg-[hsl(var(--myhd-primary))]/10 text-[hsl(var(--myhd-primary))]">
                          {agent.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
