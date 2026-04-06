import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, Gift, PencilLine } from 'lucide-react';
import {
  createFrontend2ExchangePack,
  deleteFrontend2ExchangePack,
  updateFrontend2ExchangePack,
} from '@/lib/live-data';
import type { ExchangePack } from '@/types';
import { toast } from 'sonner';

interface ExchangePacksPageProps {
  packs: ExchangePack[];
  onPacksChange: Dispatch<SetStateAction<ExchangePack[]>>;
  readOnly?: boolean;
  onRefreshPacks?: () => Promise<void>;
}

const MIN_PACK_ITEMS = 3;

const createPackItem = (label = '', pointsCost = 500) => ({
  id: `pack-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label,
  pointsCost,
});

export function ExchangePacksPage({ packs, onPacksChange, readOnly = false, onRefreshPacks }: ExchangePacksPageProps) {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(packs[0]?.id ?? null);
  const [newPackName, setNewPackName] = useState('');
  const [savingPackId, setSavingPackId] = useState<string | null>(null);
  const [creatingPack, setCreatingPack] = useState(false);

  const selectedPack = packs.find((pack) => pack.id === selectedPackId) ?? null;

  useEffect(() => {
    if (!packs.length) {
      setSelectedPackId(null);
      return;
    }

    if (!selectedPackId || !packs.some((pack) => pack.id === selectedPackId)) {
      setSelectedPackId(packs[0].id);
    }
  }, [packs, selectedPackId]);

  const persistPack = async (nextPack: ExchangePack) => {
    setSavingPackId(nextPack.id);

    try {
      const savedPack = await updateFrontend2ExchangePack(nextPack.id, {
        name: nextPack.name,
        items: nextPack.items.map((item) => ({
          id: item.id,
          title: item.label,
          points_cost: item.pointsCost,
        })),
      });

      onPacksChange((prev) => prev.map((pack) => (pack.id === savedPack.id ? savedPack : pack)));

      if (onRefreshPacks) {
        await onRefreshPacks();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de sauvegarder le pack.');
      throw error;
    } finally {
      setSavingPackId(null);
    }
  };

  const handleCreatePack = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (readOnly) {
      toast.info('Les packs sont actuellement charges depuis le backend en lecture seule.');
      return;
    }

    if (!newPackName.trim()) {
      toast.error('Ajoutez un nom de pack');
      return;
    }

    setCreatingPack(true);

    try {
      const nextPack = await createFrontend2ExchangePack({
        name: newPackName.trim(),
        items: [
          { title: 'Audit SEO gratuit pour votre site', points_cost: 500 },
          { title: '-10% sur landing page de votre business', points_cost: 800 },
          { title: 'Session conseil de 30 minutes', points_cost: 1200 },
        ],
      });

      onPacksChange((prev) => [nextPack, ...prev]);
      setSelectedPackId(nextPack.id);
      setNewPackName('');

      if (onRefreshPacks) {
        await onRefreshPacks();
      }

      toast.success('Pack cree avec succes.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de creer le pack.');
    } finally {
      setCreatingPack(false);
    }
  };

  const updateSelectedPack = async (updater: (pack: ExchangePack) => ExchangePack) => {
    if (readOnly || !selectedPackId) return;

    const currentPack = packs.find((pack) => pack.id === selectedPackId);
    if (!currentPack) return;

    const nextPack = updater(currentPack);
    onPacksChange((prev) => prev.map((pack) => (pack.id === selectedPackId ? nextPack : pack)));

    try {
      await persistPack(nextPack);
    } catch {
      if (onRefreshPacks) {
        await onRefreshPacks();
      }
    }
  };

  const handleUpdatePackName = async (value: string) => {
    await updateSelectedPack((pack) => ({
      ...pack,
      name: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdatePackItem = async (itemId: string, value: string) => {
    await updateSelectedPack((pack) => ({
      ...pack,
      items: pack.items.map((item) => (item.id === itemId ? { ...item, label: value } : item)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdatePackItemPoints = async (itemId: string, value: string) => {
    const nextPoints = Number(value);

    await updateSelectedPack((pack) => ({
      ...pack,
      items: pack.items.map((item) =>
        item.id === itemId
          ? { ...item, pointsCost: Number.isFinite(nextPoints) && nextPoints > 0 ? nextPoints : 0 }
          : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddPackItem = async () => {
    if (readOnly) {
      toast.info('L edition des packs sera branchee au backend dans une phase suivante.');
      return;
    }

    await updateSelectedPack((pack) => ({
      ...pack,
      items: [...pack.items, createPackItem('Nouvel avantage a configurer', 500)],
      updatedAt: new Date().toISOString(),
    }));
    toast.success('Nouvel element ajoute au pack');
  };

  const handleDeletePackItem = async (itemId: string) => {
    if (readOnly) {
      toast.info('L edition des packs sera branchee au backend dans une phase suivante.');
      return;
    }

    if (!selectedPack) return;

    if (selectedPack.items.length <= MIN_PACK_ITEMS) {
      toast.error('Chaque pack doit contenir au moins 3 elements');
      return;
    }

    await updateSelectedPack((pack) => ({
      ...pack,
      items: pack.items.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    }));
    toast.success('Element supprime du pack');
  };

  const handleDeletePack = async (packId: string) => {
    if (readOnly) {
      toast.info('L edition des packs sera branchee au backend dans une phase suivante.');
      return;
    }

    try {
      await deleteFrontend2ExchangePack(packId);
      const remaining = packs.filter((pack) => pack.id !== packId);
      onPacksChange(remaining);
      if (selectedPackId === packId) {
        setSelectedPackId(remaining[0]?.id ?? null);
      }
      if (onRefreshPacks) {
        await onRefreshPacks();
      }
      toast.success('Pack supprime');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de supprimer le pack.');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nouveau pack</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreatePack}>
              <div className="space-y-2">
                <Label htmlFor="packName">Nom du pack</Label>
                <Input
                  id="packName"
                  value={newPackName}
                  onChange={(event) => setNewPackName(event.target.value)}
                  placeholder="Ex: Commerce local"
                  disabled={readOnly || creatingPack}
                />
              </div>
              <div className="rounded-2xl border border-dashed border-[hsl(var(--myhd-primary))]/20 bg-[hsl(var(--myhd-light))] p-4">
                <p className="text-sm font-medium text-[hsl(var(--myhd-dark))]">Creation automatique</p>
                <p className="text-xs text-gray-500 mt-1">
                  Chaque nouveau pack est cree avec 3 elements de base que vous pourrez modifier ensuite un par un.
                </p>
              </div>
              <Button type="submit" className="w-full bg-[hsl(var(--myhd-primary))] hover:bg-[hsl(var(--myhd-primary))]/90 text-white" disabled={readOnly || creatingPack}>
                <Plus size={16} className="mr-2" />
                {creatingPack ? 'Creation...' : 'Creer le pack'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Packs disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {packs.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedPackId === pack.id
                      ? 'border-[hsl(var(--myhd-primary))] bg-[hsl(var(--myhd-primary))]/5'
                      : 'border-gray-100 hover:border-[hsl(var(--myhd-primary))]/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-[hsl(var(--myhd-primary))]/10 flex items-center justify-center flex-shrink-0">
                        <Gift size={18} className="text-[hsl(var(--myhd-primary))]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[hsl(var(--myhd-dark))] truncate">{pack.name}</p>
                        <p className="text-xs text-gray-500">{pack.items.length} element(s) configurables</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={readOnly || savingPackId === pack.id}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeletePack(pack.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration du pack</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedPack ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="selectedPackName">Nom</Label>
                <Input
                  id="selectedPackName"
                  value={selectedPack.name}
                  onChange={(event) => handleUpdatePackName(event.target.value)}
                  disabled={readOnly || savingPackId === selectedPack?.id}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Elements du pack</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 3 elements. Chaque element sera visible dans la fiche programme et cote affilie avec son cout en points.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="gap-2" onClick={handleAddPackItem} disabled={readOnly}>
                    <Plus size={16} />
                    Ajouter un element
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedPack.items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--myhd-dark))]">
                          <PencilLine size={16} />
                          Element {index + 1}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={readOnly || savingPackId === selectedPack?.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeletePackItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                      <Input
                        value={item.label}
                        onChange={(event) => handleUpdatePackItem(item.id, event.target.value)}
                        placeholder="Ex: Audit SEO gratuit pour votre site"
                        disabled={readOnly || savingPackId === selectedPack?.id}
                      />
                      <div className="mt-3 space-y-2">
                        <Label htmlFor={`points-${item.id}`}>Points pour debloquer cet element</Label>
                        <Input
                          id={`points-${item.id}`}
                          type="number"
                          min="1"
                          value={item.pointsCost}
                          onChange={(event) => handleUpdatePackItemPoints(item.id, event.target.value)}
                          placeholder="Ex: 500"
                          disabled={readOnly || savingPackId === selectedPack?.id}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[hsl(var(--myhd-dark))]">Apercu cote affilie</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPack.items.map((item) => (
                    <Badge key={item.id} variant="secondary" className="bg-[hsl(var(--myhd-primary))]/10 text-[hsl(var(--myhd-primary))]">
                      {(item.label || 'Element a completer') + ` - ${item.pointsCost || 0} pts`}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-[hsl(var(--myhd-light))] p-4 border border-dashed border-[hsl(var(--myhd-primary))]/25">
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--myhd-dark))] font-medium">
                  <Save size={16} />
                  Sauvegarde automatique
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Les programmes qui utilisent ce pack recupereront automatiquement ses nouvelles options.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Selectionnez ou creez un pack pour commencer.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
