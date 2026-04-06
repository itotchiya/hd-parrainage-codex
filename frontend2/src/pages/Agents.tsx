import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  MoreHorizontal,
  Mail,
  Calendar,
  Plus,
  Building2,
  UserPlus,
  ArrowRightLeft,
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
  fetchAgentDetail,
  inviteFrontend2Agent,
  reactivateAgent,
  suspendAgent,
  type LiveAgentDetail,
} from '@/lib/live-data';
import type { Agent, ExchangeRequest, Program, Prospect, Transaction, UserRole } from '@/types';
import { toast } from 'sonner';

interface AgentsProps {
  role: UserRole;
  agents: Agent[];
  programs: Program[];
  prospects: Prospect[];
  transactions: Transaction[];
  exchangeRequests: ExchangeRequest[];
  onAgentsChange: (agents: Agent[]) => void;
}

type InvitePath = 'existing-client' | 'new-sponsor';

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    interview: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    approved: 'Actif',
    pending: 'Invitation envoyee',
    interview: 'En onboarding',
    rejected: 'Refuse',
    suspended: 'Suspendu',
  };
  return labels[status] || status;
};

export function AgentsPage({ role, agents, programs, prospects, transactions, exchangeRequests, onAgentsChange }: AgentsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAssignedProgramId, setSelectedAssignedProgramId] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePath, setInvitePath] = useState<InvitePath | null>(null);
  const [existingClientId, setExistingClientId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorEmail, setNewSponsorEmail] = useState('');
  const [invitePending, setInvitePending] = useState(false);
  const [actionAgentId, setActionAgentId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<LiveAgentDetail | null>(null);

  const availableExistingClients = useMemo(() => {
    return prospects.reduce<
      Array<{
        id: string;
        name: string;
        email: string;
        programName: string;
      }>
    >((accumulator, prospect) => {
      if (!prospect.clientEmail) {
        return accumulator;
      }

      const key = `${prospect.clientEmail}-${prospect.businessId}`;
      if (accumulator.some((item) => item.id === key)) {
        return accumulator;
      }

      accumulator.push({
        id: key,
        name: prospect.clientName,
        email: prospect.clientEmail,
        programName: prospect.programName,
      });

      return accumulator;
    }, []);
  }, [prospects]);

  const availablePrograms = useMemo(
    () => programs.filter((program) => program.status === 'active'),
    [programs]
  );

  const agentProgramsMap = useMemo(() => {
    return agents.reduce<Record<string, Program[]>>((accumulator, agent) => {
      accumulator[agent.id] = programs.filter((program) => program.assignedAgentIds?.includes(agent.id));
      return accumulator;
    }, {});
  }, [agents, programs]);

  const availableStatuses = useMemo(
    () => Array.from(new Set(agents.map((agent) => agent.status))).sort(),
    [agents]
  );

  const filterablePrograms = useMemo(
    () => programs.filter((program) => program.assignedAgentIds?.length),
    [programs]
  );

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || agent.status === selectedStatus;
    const matchesProgram =
      selectedAssignedProgramId === 'all' ||
      agentProgramsMap[agent.id]?.some((program) => program.id === selectedAssignedProgramId);

    return matchesSearch && matchesStatus && matchesProgram;
  });

  const agentPerformanceMap = useMemo(() => {
    return agents.reduce<Record<string, {
      transactionsCount: number;
      validatedCount: number;
      paidCount: number;
      totalPoints: number;
      availablePoints: number;
      pendingPoints: number;
      rewardRequestsCount: number;
      cashRequestsCount: number;
    }>>((accumulator, agent) => {
      const agentTransactions = transactions.filter((transaction) => transaction.agentId === agent.id);
      const agentExchangeRequests = exchangeRequests.filter((request) => request.agentId === agent.id);
      const totalPoints = agentTransactions.reduce((sum, transaction) => sum + transaction.commission, 0);
      const spentPoints = agentExchangeRequests
        .filter((request) => ['approved', 'processing', 'completed', 'requested'].includes(request.status))
        .reduce((sum, request) => sum + request.pointsSpent, 0);

      accumulator[agent.id] = {
        transactionsCount: agentTransactions.length,
        validatedCount: agentTransactions.filter((transaction) => ['validated', 'paid'].includes(transaction.status)).length,
        paidCount: agentTransactions.filter((transaction) => transaction.status === 'paid').length,
        totalPoints,
        availablePoints: Math.max(totalPoints - spentPoints, 0),
        pendingPoints: agentTransactions
          .filter((transaction) => ['detected', 'pending'].includes(transaction.status))
          .reduce((sum, transaction) => sum + transaction.commission, 0),
        rewardRequestsCount: agentExchangeRequests.filter((request) => request.exchangeType === 'reward').length,
        cashRequestsCount: agentExchangeRequests.filter((request) => request.exchangeType === 'cash').length,
      };

      return accumulator;
    }, {});
  }, [agents, exchangeRequests, transactions]);

  const resetInviteState = () => {
    setInviteOpen(false);
    setInvitePath(null);
    setExistingClientId('');
    setSelectedProgramId('');
    setNewSponsorName('');
    setNewSponsorEmail('');
    setInvitePending(false);
  };

  const handleInviteAgent = async () => {
    const selectedProgram = availablePrograms.find((program) => program.id === selectedProgramId);
    if (!selectedProgram) {
      toast.error('Selectionnez un programme a assigner');
      return;
    }

    let displayName = '';
    let email = '';

    if (invitePath === 'existing-client') {
      const selectedClient = availableExistingClients.find((client) => client.id === existingClientId);
      if (!selectedClient) {
        toast.error('Selectionnez un client existant a inviter');
        return;
      }

      displayName = selectedClient.name;
      email = selectedClient.email;
    } else {
      if (!newSponsorName.trim() || !newSponsorEmail.trim()) {
        toast.error('Renseignez le nom et l email du nouveau parrain');
        return;
      }

      displayName = newSponsorName.trim();
      email = newSponsorEmail.trim();
    }

    setInvitePending(true);

    try {
      const result = await inviteFrontend2Agent({
        displayName,
        email,
        programId: selectedProgram.id,
        notes: `Prototype invite path: ${invitePath ?? 'unknown'} / Programme: ${selectedProgram.name}`,
      });

      onAgentsChange([
        {
          ...result.agent,
          programs: [selectedProgram.name],
        },
        ...agents,
      ]);
      toast.success(
        result.activationUrl
          ? `Invitation envoyee a ${email} pour ${result.assignedProgramName ?? selectedProgram.name}.`
          : `Invitation envoyee a ${email} pour ${result.assignedProgramName ?? selectedProgram.name}.`
      );
      resetInviteState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d inviter cet affilie.');
      setInvitePending(false);
    }
  };

  const handleStatusAction = async (agent: Agent, action: 'suspend' | 'reactivate') => {
    setActionAgentId(agent.id);

    try {
      const updatedAgent = action === 'suspend' ? await suspendAgent(agent.id) : await reactivateAgent(agent.id);
      onAgentsChange(agents.map((item) => (item.id === agent.id ? updatedAgent : item)));
      toast.success(action === 'suspend' ? 'Affilie suspendu.' : 'Affilie reactive.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de mettre a jour cet affilie.');
    } finally {
      setActionAgentId(null);
    }
  };

  const openAgentDialog = async (agent: Agent, mode: 'profile' | 'performance') => {
    setSelectedAgent(agent);
    setSelectedAgentDetail(null);
    setDetailLoading(true);
    if (mode === 'profile') {
      setProfileOpen(true);
    } else {
      setPerformanceOpen(true);
    }

    try {
      const detail = await fetchAgentDetail(agent.id);
      setSelectedAgentDetail(detail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de charger les details de cet affilie.');
      setProfileOpen(false);
      setPerformanceOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageFiltersBar
        actions={
          role === 'business-owner' ? (
            <Button
              className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 gap-2"
              onClick={() => setInviteOpen(true)}
            >
              <Plus size={16} />
              Ajouter un affilie
            </Button>
          ) : null
        }
      >
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Rechercher un affilie..."
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
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-auto">
          <Select value={selectedAssignedProgramId} onValueChange={setSelectedAssignedProgramId}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[13rem]">
              <SelectValue placeholder="Programme assigne" />
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
        {(searchQuery || selectedStatus !== 'all' || selectedAssignedProgramId !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus('all');
              setSelectedAssignedProgramId('all');
            }}
            className="text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            Effacer
          </Button>
        )}
      </PageFiltersBar>

      <div className="space-y-3">
        {filteredAgents.map((agent) => (
          (() => {
            const performance = agentPerformanceMap[agent.id] ?? {
              transactionsCount: 0,
              validatedCount: 0,
              paidCount: 0,
              totalPoints: 0,
              availablePoints: 0,
              pendingPoints: 0,
              rewardRequestsCount: 0,
              cashRequestsCount: 0,
            };
            const agentPrograms = agentProgramsMap[agent.id] ?? [];

            return (
          <Card key={agent.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] text-white">
                    {agent.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[hsl(var(--myhd-dark))]">{agent.name}</h3>
                    <Badge variant="secondary" className={getStatusColor(agent.status)}>
                      {getStatusLabel(agent.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {agent.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(agent.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[hsl(var(--myhd-primary))]">
                      {performance.totalPoints.toLocaleString()} pts
                    </p>
                    <p className="text-xs text-gray-400">Points attribues</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">
                      {performance.availablePoints.toLocaleString()} pts
                    </p>
                    <p className="text-xs text-gray-400">Solde disponible</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-600">{agentPrograms.length}</p>
                    <p className="text-xs text-gray-400">Programmes assignes</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={actionAgentId === agent.id}>
                      <MoreHorizontal size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void openAgentDialog(agent, 'profile')}>
                      Voir le profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void openAgentDialog(agent, 'performance')}>
                      Voir les performances
                    </DropdownMenuItem>
                    {role === 'business-owner' && agent.status !== 'suspended' && (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => void handleStatusAction(agent, 'suspend')}
                      >
                        Suspendre
                      </DropdownMenuItem>
                    )}
                    {role === 'business-owner' && agent.status === 'suspended' && (
                      <DropdownMenuItem
                        className="text-emerald-600"
                        onClick={() => void handleStatusAction(agent, 'reactivate')}
                      >
                        Reactiver
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
            );
          })()
        ))}

        {filteredAgents.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            Aucun affilie ne correspond au filtre actuel.
          </div>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={(open) => (!open ? resetInviteState() : setInviteOpen(true))}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Ajouter un affilie</DialogTitle>
            <DialogDescription>
              Choisissez comment inviter un nouveau parrain dans la plateforme. Une invitation email sera ensuite envoyee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setInvitePath('existing-client')}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  invitePath === 'existing-client'
                    ? 'border-[hsl(var(--myhd-primary))] bg-[hsl(var(--myhd-primary))]/5 shadow-sm'
                    : 'border-gray-200 hover:border-[hsl(var(--myhd-primary))]/30 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                    <Building2 size={18} className="text-[hsl(var(--myhd-primary))]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[hsl(var(--myhd-dark))]">Parmi les clients existants</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Convertir un contact deja present dans votre base synchronisee.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInvitePath('new-sponsor')}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  invitePath === 'new-sponsor'
                    ? 'border-[hsl(var(--myhd-primary))] bg-[hsl(var(--myhd-primary))]/5 shadow-sm'
                    : 'border-gray-200 hover:border-[hsl(var(--myhd-primary))]/30 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                    <UserPlus size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-[hsl(var(--myhd-dark))]">Nouveau parrain</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Inviter un nouveau partenaire qui n est pas encore dans votre base.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {invitePath === 'existing-client' && (
              <div className="rounded-2xl border border-gray-100 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft size={18} className="text-[hsl(var(--myhd-primary))]" />
                  <p className="font-semibold text-[hsl(var(--myhd-dark))]">Invitation depuis un client existant</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="existingClient">Client existant</Label>
                  <Select value={existingClientId} onValueChange={setExistingClientId}>
                    <SelectTrigger id="existingClient">
                      <SelectValue placeholder="Selectionnez un client synchronise" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableExistingClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {invitePath !== null && (
              <div className="rounded-2xl border border-gray-100 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 size={18} className="text-[hsl(var(--myhd-primary))]" />
                  <p className="font-semibold text-[hsl(var(--myhd-dark))]">Programme a assigner</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programToAssign">Programme existant</Label>
                  <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                    <SelectTrigger id="programToAssign">
                      <SelectValue placeholder="Selectionnez un programme deja cree" />
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
                {selectedProgramId && (
                  <p className="text-xs text-gray-400">
                    Le backend enregistre l invitation. Le rattachement programme reste affiche comme contexte prototype.
                  </p>
                )}
              </div>
            )}

            {invitePath === 'new-sponsor' && (
              <div className="rounded-2xl border border-gray-100 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <UserPlus size={18} className="text-emerald-600" />
                  <p className="font-semibold text-[hsl(var(--myhd-dark))]">Invitation d un nouveau parrain</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sponsorName">Nom complet</Label>
                    <Input
                      id="sponsorName"
                      value={newSponsorName}
                      onChange={(event) => setNewSponsorName(event.target.value)}
                      placeholder="Ex: Karim El Mansouri"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sponsorEmail">Email</Label>
                    <Input
                      id="sponsorEmail"
                      type="email"
                      value={newSponsorEmail}
                      onChange={(event) => setNewSponsorEmail(event.target.value)}
                      placeholder="Ex: karim@email.com"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetInviteState}>
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90"
              onClick={() => void handleInviteAgent()}
              disabled={
                invitePending ||
                invitePath === null ||
                !selectedProgramId ||
                (invitePath === 'existing-client' && !existingClientId) ||
                (invitePath === 'new-sponsor' && (!newSponsorName.trim() || !newSponsorEmail.trim()))
              }
            >
              {invitePending ? 'Envoi...' : 'Envoyer l invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Profil de l affilie</DialogTitle>
            <DialogDescription>
              Informations de compte, programme(s) assigne(s) et statut d activation.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || selectedAgent === null ? (
            <div className="py-6 text-sm text-gray-500">Chargement du profil...</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-[hsl(var(--myhd-light))]/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">
                      {selectedAgentDetail?.name ?? selectedAgent.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{selectedAgentDetail?.email ?? selectedAgent.email}</p>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(selectedAgentDetail?.status ?? selectedAgent.status)}>
                    {getStatusLabel(selectedAgentDetail?.status ?? selectedAgent.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Compte</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Code agent:</span> {selectedAgentDetail?.agentCode ?? ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Date invitation:</span> {new Date(selectedAgent.createdAt).toLocaleDateString('fr-FR')}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Activation:</span> {selectedAgentDetail?.activatedAt ? new Date(selectedAgentDetail.activatedAt).toLocaleDateString('fr-FR') : ''}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Derniere activite:</span> {selectedAgentDetail?.lastActivityAt ? new Date(selectedAgentDetail.lastActivityAt).toLocaleDateString('fr-FR') : ''}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Programmes assignes</p>
                  {(agentProgramsMap[selectedAgent.id] ?? []).length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">Aucun programme assigne.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(agentProgramsMap[selectedAgent.id] ?? []).map((program) => (
                        <div key={program.id} className="rounded-xl border border-gray-100 px-3 py-2 text-sm text-[hsl(var(--myhd-dark))]">
                          {program.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Informations saisies lors du setup</p>
                <p className="mt-3 text-sm text-gray-600">
                  {selectedAgentDetail?.notes?.trim() || 'Aucune information supplementaire renseignee pour le moment.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={performanceOpen} onOpenChange={setPerformanceOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Performance de l affilie</DialogTitle>
            <DialogDescription>
              Indicateurs calcules a partir des transactions, points et demandes d echange.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || selectedAgent === null ? (
            <div className="py-6 text-sm text-gray-500">Chargement de la performance...</div>
          ) : (
            <div className="space-y-5">
              {(() => {
                const performance = agentPerformanceMap[selectedAgent.id] ?? {
                  transactionsCount: 0,
                  validatedCount: 0,
                  paidCount: 0,
                  totalPoints: 0,
                  availablePoints: 0,
                  pendingPoints: 0,
                  rewardRequestsCount: 0,
                  cashRequestsCount: 0,
                };

                return (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Transactions</p><p className="text-2xl font-bold text-[hsl(var(--myhd-dark))]">{performance.transactionsCount}</p></CardContent></Card>
                      <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Validees</p><p className="text-2xl font-bold text-blue-600">{performance.validatedCount}</p></CardContent></Card>
                      <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Points gagnes</p><p className="text-2xl font-bold text-[hsl(var(--myhd-primary))]">{performance.totalPoints.toLocaleString()} pts</p></CardContent></Card>
                      <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Solde dispo</p><p className="text-2xl font-bold text-emerald-600">{performance.availablePoints.toLocaleString()} pts</p></CardContent></Card>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Synthese</p>
                        <div className="mt-3 space-y-2 text-sm text-gray-600">
                          <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Transactions payees:</span> {performance.paidCount}</p>
                          <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Points en attente:</span> {performance.pendingPoints.toLocaleString()} pts</p>
                          <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Demandes recompense:</span> {performance.rewardRequestsCount}</p>
                          <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Demandes cash:</span> {performance.cashRequestsCount}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Programmes</p>
                        {(agentProgramsMap[selectedAgent.id] ?? []).length === 0 ? (
                          <p className="mt-3 text-sm text-gray-500">Aucun programme assigne.</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {(agentProgramsMap[selectedAgent.id] ?? []).map((program) => (
                              <div key={program.id} className="rounded-xl border border-gray-100 px-3 py-2 text-sm text-[hsl(var(--myhd-dark))]">
                                {program.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
