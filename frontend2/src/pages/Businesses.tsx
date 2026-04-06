import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Search,
  Filter,
  MoreHorizontal,
  Globe,
  Calendar,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { approveBusiness, rejectBusiness } from '@/lib/live-data';
import type { Business } from '@/types';
import { translateStatusLabel } from '@/lib/frontend2-i18n';
import { toast } from 'sonner';

interface BusinessesProps {
  businesses: Business[];
  onBusinessesChange: (businesses: Business[]) => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export function BusinessesPage({ businesses, onBusinessesChange }: BusinessesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionBusinessId, setActionBusinessId] = useState<string | null>(null);
  const [profileBusiness, setProfileBusiness] = useState<Business | null>(null);
  const [programsBusiness, setProgramsBusiness] = useState<Business | null>(null);

  const filteredBusinesses = businesses.filter(
    (business) =>
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDecision = async (business: Business, action: 'approve' | 'reject') => {
    setActionBusinessId(business.id);

    try {
      const updatedBusiness =
        action === 'approve' ? await approveBusiness(business.id) : await rejectBusiness(business.id);
      onBusinessesChange(
        businesses.map((item) => (item.id === business.id ? updatedBusiness : item))
      );
      toast.success(action === 'approve' ? 'Entreprise approuvee.' : 'Entreprise rejetee.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de mettre a jour cette decision.');
    } finally {
      setActionBusinessId(null);
    }
  };

  const handleFilterClick = () => {
    toast.info(
      filteredBusinesses.length === 0
        ? 'Aucune entreprise ne correspond au filtre actuel.'
        : `${filteredBusinesses.length} entreprise(s) correspondent au filtre actuel.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Rechercher une entreprise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleFilterClick}>
            <Filter size={16} />
            Filtrer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredBusinesses.map((business) => (
          <Card key={business.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[hsl(var(--myhd-primary))] to-[hsl(var(--myhd-cyan))] flex items-center justify-center text-white flex-shrink-0">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[hsl(var(--myhd-dark))]">{business.name}</h3>
                      <Badge variant="secondary" className={getStatusColor(business.status)}>
                        {translateStatusLabel(business.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{business.industry}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      {business.website && (
                        <span className="flex items-center gap-1">
                          <Globe size={14} />
                          {business.website.replace('https://', '')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(business.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={actionBusinessId === business.id}>
                      <MoreHorizontal size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setProfileBusiness(business)}>
                      Voir le profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setProgramsBusiness(business)}>
                      Voir les programmes
                    </DropdownMenuItem>
                    {business.status === 'pending' && (
                      <>
                        <DropdownMenuItem
                          className="text-emerald-600"
                          onClick={() => void handleDecision(business, 'approve')}
                        >
                          Approuver
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => void handleDecision(business, 'reject')}
                        >
                          Rejeter
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredBusinesses.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 lg:col-span-2">
            Aucune entreprise ne correspond au filtre actuel.
          </div>
        )}
      </div>

      <Dialog open={profileBusiness !== null} onOpenChange={(open) => !open && setProfileBusiness(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Profil entreprise</DialogTitle>
            <DialogDescription>
              Resume simple de l entreprise visible depuis le prototype.
            </DialogDescription>
          </DialogHeader>

          {profileBusiness && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-[hsl(var(--myhd-light))]/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--myhd-dark))]">{profileBusiness.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{profileBusiness.industry}</p>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(profileBusiness.status)}>
                    {translateStatusLabel(profileBusiness.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Informations</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Nom:</span> {profileBusiness.name}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Secteur:</span> {profileBusiness.industry}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Site web:</span> {profileBusiness.website ?? ''}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Chronologie</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Creation:</span> {new Date(profileBusiness.createdAt).toLocaleDateString('fr-FR')}</p>
                    <p><span className="font-medium text-[hsl(var(--myhd-dark))]">Statut:</span> {translateStatusLabel(profileBusiness.status)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={programsBusiness !== null} onOpenChange={(open) => !open && setProgramsBusiness(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Programmes de l entreprise</DialogTitle>
            <DialogDescription>
              Resume simple de la relation entreprise-programmes dans le prototype.
            </DialogDescription>
          </DialogHeader>

          {programsBusiness && (
            <div className="rounded-2xl border border-gray-100 p-4 text-sm text-gray-600">
              <p>
                Cette vue prototype ne charge pas encore le detail complet des programmes par entreprise sur cette page.
              </p>
              <p className="mt-2">
                Entreprise selectionnee: <span className="font-medium text-[hsl(var(--myhd-dark))]">{programsBusiness.name}</span>
              </p>
              <p className="mt-2">
                Pour la gestion detaillee, utilisez la page <span className="font-medium text-[hsl(var(--myhd-dark))]">Programmes</span> avec le scope live deja branche.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
