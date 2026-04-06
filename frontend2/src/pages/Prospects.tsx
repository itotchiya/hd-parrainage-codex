import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Plus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageFiltersBar } from '@/components/filters/PageFiltersBar';
import {
  createProspect,
  fetchProspectDetail,
  fetchProspectHistory,
  type LiveProspectHistoryItem,
} from '@/lib/live-data';
import type { Program, Prospect, Transaction, UserRole } from '@/types';
import { toast } from 'sonner';

interface ProspectsProps {
  role: UserRole;
  prospects: Prospect[];
  programs: Program[];
  transactions: Transaction[];
  onProspectsChange: (prospects: Prospect[]) => void;
}

const prospectStages = [
  {
    key: 'suspect',
    label: 'Suspect',
    description: 'Contact identifie',
    accent: 'text-slate-700',
    bg: 'bg-slate-100',
    surface: 'border-slate-200 bg-white',
    progress: 'bg-slate-400',
  },
  {
    key: 'prospect-froid',
    label: 'Prospect Froid',
    description: 'Premier niveau d interet',
    accent: 'text-blue-700',
    bg: 'bg-blue-100',
    surface: 'border-blue-100 bg-white',
    progress: 'bg-blue-500',
  },
  {
    key: 'prospect-tiede',
    label: 'Prospect Tiede',
    description: 'Interet confirme',
    accent: 'text-amber-700',
    bg: 'bg-amber-100',
    surface: 'border-amber-100 bg-white',
    progress: 'bg-amber-500',
  },
  {
    key: 'prospect-chaud',
    label: 'Prospect Chaud',
    description: 'Demande de devis',
    accent: 'text-emerald-700',
    bg: 'bg-emerald-100',
    surface: 'border-emerald-100 bg-white',
    progress: 'bg-emerald-500',
  },
] as const;

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    suspect: 'Suspect',
    'prospect-froid': 'Prospect Froid',
    'prospect-tiede': 'Prospect Tiede',
    'prospect-chaud': 'Prospect Chaud',
  };

  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    suspect: 'bg-slate-100 text-slate-700',
    'prospect-froid': 'bg-blue-100 text-blue-700',
    'prospect-tiede': 'bg-amber-100 text-amber-700',
    'prospect-chaud': 'bg-emerald-100 text-emerald-700',
  };

  return colors[status] || 'bg-gray-100 text-gray-700';
};

export function ProspectsPage({ role, prospects, programs, transactions, onProspectsChange }: ProspectsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentName, setSelectedAgentName] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [createPending, setCreatePending] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [selectedProspectHistory, setSelectedProspectHistory] = useState<LiveProspectHistoryItem[]>([]);

  const availableAgentNames = useMemo(
    () =>
      Array.from(new Set(prospects.map((prospect) => prospect.agentName)))
        .filter(Boolean)
        .sort(),
    [prospects]
  );

  const availablePrograms = useMemo(
    () => programs.filter((program) => program.status === 'active'),
    [programs]
  );

  const scopedProspects = prospects.filter((prospect) => {
    if (role === 'business-owner') {
      return selectedAgentName === 'all' || prospect.agentName === selectedAgentName;
    }

    return true;
  });

  const filteredProspects = scopedProspects.filter((prospect) => {
    const matchesSearch =
      prospect.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.programName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.agentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || prospect.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const availableStatuses = Array.from(new Set(prospects.map((prospect) => prospect.status))).sort();

  const totalProspects = scopedProspects.length;
  const stageCounts = prospectStages.map((stage) => {
    const count = scopedProspects.filter((prospect) => prospect.status === stage.key).length;
    const share = totalProspects > 0 ? Math.round((count / totalProspects) * 100) : 0;

    return {
      ...stage,
      count,
      share,
    };
  });

  const resetCreateState = () => {
    setCreateOpen(false);
    setSelectedProgramId('');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setCompanyName('');
  };

  const handleCreateProspect = async () => {
    if (!selectedProgramId || !clientName.trim()) {
      toast.error('Renseignez au minimum le programme et le nom du prospect.');
      return;
    }

    setCreatePending(true);

    try {
      const nextProspect = await createProspect({
        programId: selectedProgramId,
        contactName: clientName.trim(),
        contactEmail: clientEmail.trim(),
        contactPhoneRaw: clientPhone.trim(),
        companyName: companyName.trim(),
      });

      onProspectsChange([nextProspect, ...prospects]);
      toast.success('Prospect cree et envoye vers le backend.');
      resetCreateState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de creer le prospect.');
    } finally {
      setCreatePending(false);
    }
  };

  const openProspectDetails = async (prospect: Prospect) => {
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const [detail, history] = await Promise.all([
        fetchProspectDetail(prospect.id),
        fetchProspectHistory(prospect.id),
      ]);

      setSelectedProspect(detail);
      setSelectedProspectHistory(history);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger les details du prospect.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-lg">Entonnoir des prospects</CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                Repartition des prospects par etape du pipeline, synchronisee depuis IACRM.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-[hsl(var(--myhd-dark))]">{totalProspects}</span> prospects au total
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stageCounts.map((stage) => (
              <div key={stage.key} className={`rounded-2xl border p-5 ${stage.surface}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stage.label}</p>
                    <p className={`mt-2 text-4xl font-semibold tracking-tight ${stage.accent}`}>{stage.count}</p>
                  </div>
                  <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${stage.bg} ${stage.accent}`}>
                    {stage.share}%
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-500">{stage.description}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${stage.progress}`} style={{ width: `${stage.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <PageFiltersBar
        actions={
          role === 'agent' ? (
            <Button
              className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 gap-2"
              onClick={() => setCreateOpen(true)}
              disabled={availablePrograms.length === 0}
            >
              <Plus size={16} />
              Nouveau prospect
            </Button>
          ) : null
        }
      >
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Rechercher un prospect..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>
        {role === 'business-owner' && (
          <div className="w-full sm:w-auto">
            <Select value={selectedAgentName} onValueChange={setSelectedAgentName}>
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[13rem]">
                <SelectValue placeholder="Filtrer par affilie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les affilies</SelectItem>
                {availableAgentNames.map((agentName) => (
                  <SelectItem key={agentName} value={agentName}>
                    {agentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="w-full sm:w-auto">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[10rem]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(searchQuery || selectedAgentName !== 'all' || selectedStatus !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedAgentName('all');
              setSelectedStatus('all');
            }}
            className="text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            Effacer
          </Button>
        )}
      </PageFiltersBar>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Liste des prospects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredProspects.map((prospect) => (
              <div
                key={prospect.id}
                className="rounded-xl border border-gray-100 p-4 transition-all hover:border-[hsl(var(--myhd-primary))]/30 hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--myhd-primary))]/10">
                    <Users size={20} className="text-[hsl(var(--myhd-primary))]" />
                  </div>

                  <div className="min-w-0 flex-1 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.2fr_1fr_auto_auto]">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-gray-400">Prospect</p>
                      <p className="mt-1 font-semibold text-[hsl(var(--myhd-dark))]">{prospect.clientName}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-gray-400">Coordonnees</p>
                      <div className="mt-1 space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-1.5">
                          <Mail size={14} />
                          <span className="truncate">{prospect.clientEmail}</span>
                        </p>
                        {prospect.clientPhone && (
                          <p className="flex items-center gap-1.5">
                            <Phone size={14} />
                            <span>{prospect.clientPhone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-gray-400">Service / Produit</p>
                      <p className="mt-1 text-sm font-medium text-[hsl(var(--myhd-primary))]">
                        {prospect.programName}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">{prospect.agentName}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Statut</p>
                      <div className="mt-1">
                        <Badge variant="secondary" className={getStatusColor(prospect.status)}>
                          {getStatusLabel(prospect.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3 lg:block lg:text-right">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Date</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {new Date(prospect.submittedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void openProspectDetails(prospect)}>
                            Voir les details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredProspects.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                Aucun prospect ne correspond au filtre actuel.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => (!open ? resetCreateState() : setCreateOpen(true))}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Nouveau prospect</DialogTitle>
            <DialogDescription>
              Creez un prospect dans le backend sans changer la mise en page originale du prototype.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prospect-program">Programme</Label>
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger id="prospect-program">
                  <SelectValue placeholder="Selectionnez un programme actif" />
                </SelectTrigger>
                <SelectContent>
                  {availablePrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="prospect-name">Nom du prospect</Label>
                <Input
                  id="prospect-name"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Ex: Sarah Benali"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prospect-email">Email</Label>
                <Input
                  id="prospect-email"
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  placeholder="Ex: sarah@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prospect-phone">Telephone</Label>
                <Input
                  id="prospect-phone"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  placeholder="Ex: +33 6 12 34 56 78"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="prospect-company">Entreprise</Label>
                <Input
                  id="prospect-company"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Ex: TechSolutions SAS"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetCreateState}>
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90"
              onClick={() => void handleCreateProspect()}
              disabled={createPending || !selectedProgramId || clientName.trim().length === 0}
            >
              {createPending ? 'Enregistrement...' : 'Creer le prospect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Details du prospect</DialogTitle>
            <DialogDescription>
              Informations du prospect, statut de soumission et historique de synchronisation.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || selectedProspect === null ? (
            <div className="py-6 text-sm text-gray-500">Chargement des details du prospect...</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-[hsl(var(--myhd-light))]/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">{selectedProspect.clientName}</h3>
                    <p className="mt-1 text-sm text-gray-500">{selectedProspect.companyName || selectedProspect.clientEmail || 'Coordonnee non renseignee'}</p>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(selectedProspect.status)}>
                    {getStatusLabel(selectedProspect.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Coordonnees</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Email:</span> {selectedProspect.clientEmail || ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Telephone:</span> {selectedProspect.clientPhone || ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Programme:</span> {selectedProspect.programName}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Affilie:</span> {selectedProspect.agentName}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Etat backend</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Soumission:</span> {selectedProspect.submissionStatus || ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Statut programme:</span> {selectedProspect.programStatus || ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Supprime le:</span> {selectedProspect.deletedAt ? new Date(selectedProspect.deletedAt).toLocaleDateString('fr-FR') : ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Transactions liees:</span> {transactions.filter((transaction) => transaction.prospectId === selectedProspect.id).length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Historique</p>
                {selectedProspectHistory.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">Aucun historique disponible.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {selectedProspectHistory.map((item) => (
                      <div key={item.id} className="rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-medium text-[hsl(var(--myhd-dark))]">
                            {item.newSubmissionStatus || item.newProgressionStatus || item.sourceSystem}
                          </p>
                          <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{item.reason || 'Aucun commentaire.'}</p>
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
